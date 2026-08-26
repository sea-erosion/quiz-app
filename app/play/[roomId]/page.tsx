'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PlayWaitingPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    // joinページでlocalStorageに保存した情報を読み出す
    const saved = localStorage.getItem(`kahoot_player_${roomId}`);
    if (saved) {
      // 今はニックネームは保存していないので、ここでは参加できたことだけ確認する
      setNickname('参加登録済み');
    }
  }, [roomId]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">参加しました!</h1>
      <p className="text-gray-600">
        {nickname ? 'ホストが開始するまでお待ちください' : '参加情報が見つかりませんでした'}
      </p>
    </main>
  );
}
