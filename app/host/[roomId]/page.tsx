'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Room = {
  id: string;
  pin: string;
  status: string;
};

type Player = {
  id: string;
  nickname: string;
};

export default function HostLobbyPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  // 1. 最初にルーム情報と、すでに参加している人がいれば取得する
  useEffect(() => {
    async function fetchInitialData() {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, pin, status')
        .eq('id', roomId)
        .single();

      if (roomData) setRoom(roomData);

      const { data: playersData } = await supabase
        .from('players')
        .select('id, nickname')
        .eq('room_id', roomId);

      if (playersData) setPlayers(playersData);
    }

    fetchInitialData();
  }, [roomId]);

  // 2. Realtimeで「playersテーブルに新しい行が増えたら」通知を受け取る
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newPlayer = payload.new as Player;
          // 直前のリストに追記する形で更新する
          setPlayers((prev) => [...prev, newPlayer]);
        }
      )
      .subscribe();

    // 画面を離れるときは購読を解除する(メモリリーク防止)
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  if (!room) {
    return <main className="p-8">読み込み中...</main>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8">
      <h1 className="text-2xl font-bold">参加者を待っています</h1>

      <div className="rounded-xl bg-indigo-50 px-10 py-6 text-center">
        <p className="text-sm text-gray-500">合言葉(PIN)</p>
        <p className="text-6xl font-mono font-bold tracking-widest">{room.pin}</p>
      </div>

      <div className="w-full max-w-md">
        <p className="mb-2 text-gray-600">参加者({players.length}人)</p>
        <ul className="flex flex-wrap gap-2">
          {players.map((p) => (
            <li
              key={p.id}
              className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium"
            >
              {p.nickname}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
