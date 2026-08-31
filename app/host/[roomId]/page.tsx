'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { revealTextGradually } from '@/lib/revealTextGradually';

type Room = {
  id: string;
  pin: string;
  status: 'lobby' | 'preview' | 'question' | 'reveal' | 'ended';
  current_question_index: number;
  quiz_id: string;
  question_started_at: string | null;
};

type Question = {
  id: string;
  order_index: number;
  body: string;
  choices: string[];
  correct_index: number;
  time_limit_sec: number;
  points: number;
};

type Player = {
  id: string;
  nickname: string;
  score: number;
};

type Answer = {
  id: string;
  player_id: string;
  question_id: string;
  choice_index: number;
};

export default function HostLobbyPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const [room, setRoom] = useState<Room | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [hostRevealedCount, setHostRevealedCount] = useState(0); // ホスト画面の演出用(表示のみ、タイマーには影響しない)

  const currentQuestion = useMemo(() => {
    if (!room) return null;
    return questions.find((q) => q.order_index === room.current_question_index) ?? null;
  }, [room, questions]);

  // 現在の問題に対する回答だけを取り出す
  const currentAnswers = useMemo(() => {
    if (!currentQuestion) return [];
    return answers.filter((a) => a.question_id === currentQuestion.id);
  }, [answers, currentQuestion]);

  // 選択肢ごとの回答者数を集計する
  const choiceCounts = useMemo(() => {
    if (!currentQuestion) return [];
    const counts = new Array(currentQuestion.choices.length).fill(0);
    for (const a of currentAnswers) {
      counts[a.choice_index] += 1;
    }
    return counts;
  }, [currentAnswers, currentQuestion]);

  // 1. 初期データ取得
  useEffect(() => {
    async function fetchInitialData() {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, pin, status, current_question_index, quiz_id, question_started_at')
        .eq('id', roomId)
        .single();

      if (!roomData) return;
      setRoom(roomData);

      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, order_index, body, choices, correct_index, time_limit_sec, points')
        .eq('quiz_id', roomData.quiz_id)
        .order('order_index');

      if (questionsData) setQuestions(questionsData);

      const { data: playersData } = await supabase
        .from('players')
        .select('id, nickname, score')
        .eq('room_id', roomId);

      if (playersData) setPlayers(playersData);

      // これまでに届いている回答も取得する(リロード時に集計がゼロに戻らないようにするため)
      const { data: answersData } = await supabase
        .from('answers')
        .select('id, player_id, question_id, choice_index')
        .eq('room_id', roomId);

      if (answersData) setAnswers(answersData);
    }

    fetchInitialData();
  }, [roomId]);

  // 2. Realtime購読(参加者・回答・ルーム状態)
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => setPlayers((prev) => [...prev, payload.new as Player])
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as Player;
          setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'answers', filter: `room_id=eq.${roomId}` },
        (payload) => setAnswers((prev) => [...prev, payload.new as Answer])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 出題中は、制限時間 + バッファ秒数が過ぎたら自動的に結果発表へ進める
  // バッファを挟むのは、参加者側の受信タイミングがネットワーク状況で
  // 少しずつ遅れる可能性があるため、締め切りを急ぎすぎないようにする猶予
  useEffect(() => {
    if (room?.status !== 'question' || !currentQuestion || !room.question_started_at) return;

    const bufferMs = 3000;
    const deadlineMs = currentQuestion.time_limit_sec * 1000 + bufferMs;
    const elapsed = Date.now() - new Date(room.question_started_at).getTime();
    const delay = Math.max(deadlineMs - elapsed, 0);

    const timeoutId = setTimeout(() => {
      revealAnswer();
    }, delay);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, room?.question_started_at, currentQuestion]);

  // preview(次の問題の予告)状態になったら、一定時間後に自動でquestionへ進める
  const PREVIEW_DURATION_MS = 4000;
  useEffect(() => {
    if (room?.status !== 'preview' || !currentQuestion) return;

    const timeoutId = setTimeout(async () => {
      const { data } = await supabase
        .from('rooms')
        .update({ status: 'question', question_started_at: new Date().toISOString() })
        .eq('id', roomId)
        .select()
        .single();
      if (data) setRoom(data);
    }, PREVIEW_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [room?.status, currentQuestion, roomId]);

  // ホスト画面の問題文も、参加者側と同じく1文字ずつ表示する演出をつける(見た目だけの演出)
  useEffect(() => {
    if (room?.status !== 'question' || !currentQuestion) {
      setHostRevealedCount(0);
      return;
    }

    let cancelled = false;
    setHostRevealedCount(0);
    revealTextGradually(currentQuestion.body.length, 125, () => cancelled, setHostRevealedCount);

    return () => {
      cancelled = true;
    };
  }, [room?.status, currentQuestion]);

  // 出題開始・進行の操作
  async function startFirstQuestion() {
    // 全参加者のタイマー開始時刻をリセットしておく(前回の値が残らないように)
    await supabase.from('players').update({ current_question_timer_started_at: null }).eq('room_id', roomId);

    // いきなり出題するのではなく、まず「次の問題は何点か」の予告(preview)を挟む
    const { data } = await supabase
      .from('rooms')
      .update({ status: 'preview', current_question_index: 0, question_started_at: null })
      .eq('id', roomId)
      .select()
      .single();
    if (data) setRoom(data);
  }

  async function revealAnswer() {
    const { data } = await supabase
      .from('rooms')
      .update({ status: 'reveal' })
      .eq('id', roomId)
      .select()
      .single();
    if (data) setRoom(data);
  }

  async function nextQuestionOrEnd() {
    if (!room) return;
    const nextIndex = room.current_question_index + 1;
    const isLast = nextIndex >= questions.length;

    if (!isLast) {
      // 次の問題に進む前に、全参加者のタイマー開始時刻をリセットする
      await supabase.from('players').update({ current_question_timer_started_at: null }).eq('room_id', roomId);
    }

    const { data } = await supabase
      .from('rooms')
      .update(
        isLast
          ? { status: 'ended' }
          : {
              status: 'preview',
              current_question_index: nextIndex,
              question_started_at: null,
            }
      )
      .eq('id', roomId)
      .select()
      .single();
    if (data) setRoom(data);
  }

  if (!room) {
    return <main className="p-8">読み込み中...</main>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8">
      {room.status === 'lobby' && (
        <>
          <h1 className="text-2xl font-bold">参加者を待っています</h1>
          <div className="rounded-xl bg-indigo-50 px-10 py-6 text-center">
            <p className="text-sm text-gray-500">合言葉(PIN)</p>
            <p className="text-6xl font-mono font-bold tracking-widest">{room.pin}</p>
          </div>
          <div className="w-full max-w-md">
            <p className="mb-2 text-gray-600">参加者({players.length}人)</p>
            <ul className="flex flex-wrap gap-2">
              {players.map((p) => (
                <li key={p.id} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium">
                  {p.nickname}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={startFirstQuestion}
            disabled={players.length === 0}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            開始する
          </button>
        </>
      )}

      {room.status === 'preview' && currentQuestion && (
        <>
          <p className="text-gray-500">
            問題 {room.current_question_index + 1} / {questions.length}
          </p>
          <h1 className="text-2xl font-bold">次の問題は…</h1>
          <p className="text-7xl font-bold text-indigo-600">{currentQuestion.points}点</p>
          <p className="text-gray-500">まもなく出題します</p>
        </>
      )}

      {room.status === 'question' && currentQuestion && (
        <>
          <p className="text-gray-500">
            問題 {room.current_question_index + 1} / {questions.length}
          </p>
          <h1 className="max-w-2xl text-center text-3xl font-bold">
            <span>{currentQuestion.body.slice(0, hostRevealedCount)}</span>
            <span className="text-transparent">{currentQuestion.body.slice(hostRevealedCount)}</span>
          </h1>
          <ul className="grid w-full max-w-2xl grid-cols-2 gap-4">
            {currentQuestion.choices.map((choice, i) => (
              <li key={i} className="rounded-lg bg-indigo-100 p-4 text-center text-lg">
                {choice}
                <span className="ml-2 text-sm text-gray-500">({choiceCounts[i] ?? 0}人)</span>
              </li>
            ))}
          </ul>
          <p className="text-gray-600">回答済み: {currentAnswers.length} / {players.length}人</p>
          <button
            onClick={revealAnswer}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-700"
          >
            回答を締め切って結果を見る
          </button>
        </>
      )}

      {room.status === 'reveal' && currentQuestion && (
        <>
          <h1 className="text-2xl font-bold">正解発表</h1>
          <p className="text-xl">
            正解: {currentQuestion.choices[currentQuestion.correct_index]}
          </p>
          <ul className="w-full max-w-md space-y-2">
            {[...players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <li key={p.id} className="flex justify-between rounded-lg bg-gray-100 px-4 py-2">
                  <span>{i + 1}. {p.nickname}</span>
                  <span className="font-semibold">{p.score}点</span>
                </li>
              ))}
          </ul>
          <button
            onClick={nextQuestionOrEnd}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-700"
          >
            {room.current_question_index + 1 >= questions.length ? '最終結果を見る' : '次の問題へ'}
          </button>
        </>
      )}

      {room.status === 'ended' && (
        <>
          <h1 className="text-3xl font-bold">最終結果</h1>
          <ul className="w-full max-w-md space-y-2">
            {[...players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <li key={p.id} className="flex justify-between rounded-lg bg-yellow-100 px-4 py-2">
                  <span>{i + 1}位 {p.nickname}</span>
                  <span className="font-semibold">{p.score}点</span>
                </li>
              ))}
          </ul>
        </>
      )}
    </main>
  );
}
