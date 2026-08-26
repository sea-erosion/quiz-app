'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { sampleQuiz } from '@/lib/sampleQuiz';
import { generatePin } from '@/lib/pin';

export default function HostTopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCreateRoom() {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. サンプルクイズをquizzesテーブルに登録する
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: sampleQuiz.title,
          author_name: sampleQuiz.authorName,
          description: sampleQuiz.description,
          shuffle: sampleQuiz.shuffle,
        })
        .select()
        .single();

      if (quizError || !quiz) {
        throw quizError ?? new Error('クイズの作成に失敗しました');
      }

      // 2. 質問(questions)をまとめて登録する
      const questionsToInsert = sampleQuiz.questions.map((q, index) => ({
        quiz_id: quiz.id,
        order_index: index,
        body: q.body,
        choices: q.choices,
        correct_index: q.correctIndex,
        time_limit_sec: q.timeLimitSec,
        points: q.points,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) {
        throw questionsError;
      }

      // 3. ルームを作る(PINコードを生成して紐付け)
      const pin = generatePin();
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          pin,
          quiz_id: quiz.id,
          mode: 'individual',
          status: 'lobby',
        })
        .select()
        .single();

      if (roomError || !room) {
        throw roomError ?? new Error('ルームの作成に失敗しました');
      }

      // 4. ホスト用ロビー画面へ移動する
      router.push(`/host/${room.id}`);
    } catch (err) {
      console.error(err);
      setErrorMessage('ルーム作成中にエラーが発生しました。コンソールを確認してください。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">クイズホスト画面</h1>
      <p className="text-gray-600">サンプルクイズでルームを作成します</p>

      <button
        onClick={handleCreateRoom}
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? '作成中...' : 'ルームを作る'}
      </button>

      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
    </main>
  );
}
