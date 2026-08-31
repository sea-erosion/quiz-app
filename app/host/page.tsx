'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { quizPools, tutorialPool } from '@/lib/quizPools';
import { generatePin } from '@/lib/pin';
import { shuffleArray } from '@/lib/shuffle';

// 選択肢一覧:チュートリアルを先頭に、その後に通常の問題プールを並べる
const selectablePools = [tutorialPool, ...quizPools];

export default function HostTopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 選択中の問題プール(デフォルトは通常プールの最初のもの)
  const [selectedPoolId, setSelectedPoolId] = useState(quizPools[0].id);
  const selectedPool = selectablePools.find((p) => p.id === selectedPoolId) ?? quizPools[0];

  // 出題数(選んだプールの問題数を超えないように、初期値はプールの問題数と10の小さい方)
  const [questionCount, setQuestionCount] = useState(
    Math.min(10, quizPools[0].questions.length)
  );

  // プールを切り替えたときに、出題数がそのプールの問題数を超えていたら自動的に調整する。
  // チュートリアルは常に1問固定にする。
  function handlePoolChange(poolId: string) {
    setSelectedPoolId(poolId);
    const pool = selectablePools.find((p) => p.id === poolId);
    if (!pool) return;
    if (pool.isTutorial) {
      setQuestionCount(1);
    } else if (questionCount > pool.questions.length) {
      setQuestionCount(pool.questions.length);
    }
  }

  async function handleCreateRoom() {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. 選択したプールの情報でquizzesテーブルに登録する
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: selectedPool.title,
          author_name: selectedPool.authorName,
          description: selectedPool.description,
          shuffle: true,
          question_limit: questionCount,
        })
        .select()
        .single();

      if (quizError || !quiz) {
        throw quizError ?? new Error('クイズの作成に失敗しました');
      }

      // 2. 選択したプールから、指定した出題数だけランダムに選んで登録する
      const selectedQuestions = shuffleArray(selectedPool.questions).slice(0, questionCount);

      const questionsToInsert = selectedQuestions.map((q, index) => ({
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
          is_tutorial: selectedPool.isTutorial ?? false,
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

      <div className="w-full max-w-md space-y-6">
        {/* 問題プールの選択 */}
        <div>
          <label className="mb-2 block font-medium text-gray-700">出題する問題ファイル</label>
          <div className="space-y-2">
            {selectablePools.map((pool) => (
              <label
                key={pool.id}
                className={`block cursor-pointer rounded-lg border p-3 transition
                  ${selectedPoolId === pool.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}
                  ${pool.isTutorial ? 'border-dashed' : ''}`}
              >
                <input
                  type="radio"
                  name="quizPool"
                  value={pool.id}
                  checked={selectedPoolId === pool.id}
                  onChange={() => handlePoolChange(pool.id)}
                  className="mr-2"
                />
                <span className="font-semibold">
                  {pool.isTutorial && '🔰 '}
                  {pool.title}
                </span>
                <p className="ml-6 text-sm text-gray-500">
                  {pool.description}
                  {!pool.isTutorial && `(プール内:${pool.questions.length}問)`}
                </p>
              </label>
            ))}
          </div>
        </div>

        {/* 出題数の指定(チュートリアルの場合は1問固定なので表示しない) */}
        {!selectedPool.isTutorial && (
          <div>
            <label className="mb-2 block font-medium text-gray-700">
              出題数:{questionCount}問
            </label>
            <input
              type="range"
              min={1}
              max={selectedPool.questions.length}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              このプール(全{selectedPool.questions.length}問)からランダムに{questionCount}問を出題します
            </p>
          </div>
        )}
      </div>

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
