'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function JoinPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleJoin() {
    setErrorMessage(null);

    if (pin.length !== 6 || nickname.trim() === '') {
      setErrorMessage('PINは6桁、ニックネームは1文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      // 1. PINからルームを探す
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('pin', pin)
        .single();

      if (roomError || !room) {
        setErrorMessage('そのPINのルームが見つかりませんでした');
        setLoading(false);
        return;
      }

      // 2. playersテーブルに自分を登録する
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          nickname: nickname.trim(),
        })
        .select()
        .single();

      if (playerError || !player) {
        throw playerError ?? new Error('参加登録に失敗しました');
      }

      // 3. 再接続用に、room_idとplayer_id、reconnect_tokenをlocalStorageに保存する
      //    (今はplayer.idをそのまま使うが、reconnect_token専用のロジックは後続ステップで追加する)
      localStorage.setItem(
        `kahoot_player_${room.id}`,
        JSON.stringify({
          playerId: player.id,
          reconnectToken: player.reconnect_token,
        })
      );

      // 4. 参加者用の待機画面へ移動する
      router.push(`/play/${room.id}`);
    } catch (err) {
      console.error(err);
      setErrorMessage('参加処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">クイズに参加</h1>

      <input
        type="text"
        inputMode="numeric"
        placeholder="PINコード(6桁)"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
        className="w-64 rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-widest"
      />

      <input
        type="text"
        placeholder="ニックネーム"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        className="w-64 rounded-lg border border-gray-300 px-4 py-3 text-center text-lg"
      />

      <button
        onClick={handleJoin}
        disabled={loading}
        className="w-64 rounded-lg bg-indigo-600 py-3 text-lg font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? '参加中...' : '参加する'}
      </button>

      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
    </main>
  );
}
