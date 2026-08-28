'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Room = {
  id: string;
  status: 'lobby' | 'question' | 'reveal' | 'ended';
  current_question_index: number;
};

type Question = {
  id: string;
  order_index: number;
  body: string;
  choices: string[];
  correct_index: number;
  time_limit_sec: number;
};

type PlayerInfo = {
  playerId: string;
};

type Player = {
  id: string;
  nickname: string;
  score: number;
  correct_streak: number;
};

export default function PlayGamePage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const [room, setRoom] = useState<Room | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]); // 全員のランキング表示用

  // このブラウザでの「回答済みかどうか」「選んだ選択肢」を持つローカル状態
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false); // 制限時間が来たらtrueにする
  const [remainingMs, setRemainingMs] = useState(0);

  // タイマーの起点となる時刻(ミリ秒のUNIXタイムスタンプ)。
  // performance.now()ではなくDate.now()を使うのは、
  // ページをリロードしてもDBに保存した時刻と同じ基準で計算し直せるようにするため。
  // ★refではなくstateにしているのが今回のポイント:
  //   「DBへの問い合わせが終わって正しい基準時刻が確定するまではnullのまま」にすることで、
  //   カウントダウン処理(下のeffect)が前の問題の古い基準時刻を使って
  //   一瞬だけ誤った残り時間を計算してしまう問題を防ぐ。
  const [timerStartMs, setTimerStartMs] = useState<number | null>(null);
  const questionIdRef = useRef<string | null>(null);

  const currentQuestion = useMemo(() => {
    if (!room) return null;
    return questions.find((q) => q.order_index === room.current_question_index) ?? null;
  }, [room, questions]);

  // 1. localStorageから自分のplayerIdを読み出す
  useEffect(() => {
    const saved = localStorage.getItem(`kahoot_player_${roomId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setPlayerInfo({ playerId: parsed.playerId });
    }
  }, [roomId]);

  // 2. 初期データ取得
  useEffect(() => {
    async function fetchInitialData() {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, status, current_question_index, quiz_id')
        .eq('id', roomId)
        .single();
      if (!roomData) return;
      setRoom(roomData);

      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, order_index, body, choices, correct_index, time_limit_sec')
        .eq('quiz_id', roomData.quiz_id)
        .order('order_index');
      if (questionsData) setQuestions(questionsData);

      // ランキング表示用に、参加者全員のスコアも取得しておく
      const { data: playersData } = await supabase
        .from('players')
        .select('id, nickname, score, correct_streak')
        .eq('room_id', roomId);
      if (playersData) setPlayers(playersData);
    }
    fetchInitialData();
  }, [roomId]);

  // 3. ルーム状態・参加者スコアのRealtime購読
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}:player`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as Room)
      )
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
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 4. 新しい問題になったら、DB上のタイマー開始時刻を確認して復元 or 新規記録する
  useEffect(() => {
    if (!currentQuestion || !playerInfo) return;
    if (questionIdRef.current === currentQuestion.id) return; // 同じ問題なら何もしない

    questionIdRef.current = currentQuestion.id;
    setHasAnswered(false);
    setSelectedChoice(null);
    setIsLocked(false);
    setRemainingMs(currentQuestion.time_limit_sec * 1000);
    setTimerStartMs(null);

    // このeffectが「もう古くなった(別の問題に切り替わった)」かどうかを判定するフラグ。
    // 通信の遅延で古い問題の非同期処理が後から完了し、
    // 新しい問題の画面に誤って反映されてしまう(状態の競合)のを防ぐために使う。
    let cancelled = false;

    async function setupTimer() {
      const { data: existingAnswer } = await supabase
        .from('answers')
        .select('choice_index')
        .eq('player_id', playerInfo!.playerId)
        .eq('question_id', currentQuestion!.id)
        .maybeSingle();

      if (cancelled) return; // すでに次の問題に切り替わっていたら、ここで処理を打ち切る

      if (existingAnswer) {
        setSelectedChoice(existingAnswer.choice_index);
        setHasAnswered(true);
        setIsLocked(true);
        setRemainingMs(0);
        return;
      }

      const { data: playerRow } = await supabase
        .from('players')
        .select('current_question_timer_started_at')
        .eq('id', playerInfo!.playerId)
        .single();

      if (cancelled) return; // ここでも念のため確認する

      const existingStartedAt = playerRow?.current_question_timer_started_at as string | null | undefined;

      let startMs: number;
      if (existingStartedAt) {
        startMs = new Date(existingStartedAt).getTime();
      } else {
        const now = new Date();
        startMs = now.getTime();
        await supabase
          .from('players')
          .update({ current_question_timer_started_at: now.toISOString() })
          .eq('id', playerInfo!.playerId);
      }

      if (cancelled) return; // 更新完了を待っている間に切り替わっていたら反映しない

      setTimerStartMs(startMs);

      const timeLimitMs = currentQuestion!.time_limit_sec * 1000;
      const elapsed = Date.now() - startMs;
      const remaining = Math.max(timeLimitMs - elapsed, 0);
      setRemainingMs(remaining);
      if (remaining <= 0) setIsLocked(true);
    }

    setupTimer();

    // 問題が切り替わる・画面を離れる際に呼ばれる後片付け処理
    return () => {
      cancelled = true;
    };
  }, [currentQuestion, playerInfo]);

  // 5. カウントダウン表示 + 制限時間到達で自動ロック
  //    setIntervalの回数を積算せず、開始時刻との差分で毎回計算し直す
  //    (バックグラウンドタブでのスロットリング対策)
  //    回答済みでもカウントダウン自体は止めない(全員に「あと何秒か」を見せ続けるため)
  //    timerStartMsがnullの間(=基準時刻がまだ確定していない間)は動かさない
  useEffect(() => {
    if (!currentQuestion || room?.status !== 'question' || timerStartMs === null) return;

    const timeLimitMs = currentQuestion.time_limit_sec * 1000;

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - timerStartMs;
      const remaining = Math.max(timeLimitMs - elapsed, 0);
      setRemainingMs(remaining);

      if (remaining <= 0) {
        setIsLocked(true);
        clearInterval(intervalId);
      }
    }, 200);

    return () => clearInterval(intervalId);
  }, [currentQuestion, room?.status, timerStartMs]);

  async function handleAnswer(choiceIndex: number) {
    if (hasAnswered || isLocked || !currentQuestion || !playerInfo) return;

    // 経過時間はクライアント側の計測値をそのまま送る(設計方針:クライアント時刻基準)
    const elapsedMs = timerStartMs
      ? Math.round(Date.now() - timerStartMs)
      : currentQuestion.time_limit_sec * 1000;

    setSelectedChoice(choiceIndex);
    setHasAnswered(true); // 連打防止のため先にロックしてから送信する

    const { error } = await supabase.from('answers').insert({
      room_id: roomId,
      player_id: playerInfo.playerId,
      question_id: currentQuestion.id,
      choice_index: choiceIndex,
      client_time_taken_ms: elapsedMs,
    });

    if (error) {
      console.error('回答の送信に失敗しました', error);
    }
  }

  if (!room || !playerInfo) {
    return <main className="p-8">読み込み中...</main>;
  }

  if (room.status === 'lobby') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">参加しました!</h1>
        <p className="text-gray-600">ホストが開始するまでお待ちください</p>
      </main>
    );
  }

  if (room.status === 'ended') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 p-8">
        <h1 className="text-2xl font-bold">クイズ終了!</h1>
        <p className="text-gray-600">お疲れさまでした</p>
        <ul className="w-full max-w-md space-y-2">
          {sortedPlayers.map((p, i) => (
            <li
              key={p.id}
              className={`flex justify-between rounded-lg px-4 py-2 ${
                p.id === playerInfo.playerId ? 'bg-yellow-200 font-bold' : 'bg-gray-100'
              }`}
            >
              <span>{i + 1}位 {p.nickname}{p.id === playerInfo.playerId ? '(あなた)' : ''}</span>
              <span>{p.score}点</span>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  if (!currentQuestion) {
    return <main className="p-8">問題を読み込み中...</main>;
  }

  // 出題中(question)の画面
  if (room.status === 'question') {
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 p-8">
        <p className="text-2xl font-mono font-bold">
          残り {Math.ceil(remainingMs / 1000)}秒
        </p>
        <h1 className="max-w-xl text-center text-2xl font-bold">{currentQuestion.body}</h1>

        <div className="grid w-full max-w-xl grid-cols-2 gap-4">
          {currentQuestion.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={hasAnswered || isLocked}
              className={`rounded-lg p-6 text-lg font-semibold text-white transition
                ${selectedChoice === i ? 'bg-indigo-800' : 'bg-indigo-500 hover:bg-indigo-600'}
                disabled:opacity-50`}
            >
              {choice}
            </button>
          ))}
        </div>

        {hasAnswered && <p className="text-gray-600">回答を送信しました。結果をお待ちください</p>}
        {!hasAnswered && isLocked && <p className="text-red-600">時間切れです</p>}
      </main>
    );
  }

  // 結果発表(reveal)の画面
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const myPlayer = players.find((p) => p.id === playerInfo.playerId);
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">結果発表</h1>
      <p className="text-xl">正解: {currentQuestion.choices[currentQuestion.correct_index]}</p>
      {selectedChoice !== null ? (
        <div className="text-center">
          <p className={selectedChoice === currentQuestion.correct_index ? 'text-green-600' : 'text-red-600'}>
            あなたの回答: {currentQuestion.choices[selectedChoice]}
            {selectedChoice === currentQuestion.correct_index ? '(正解!)' : '(不正解)'}
          </p>
          {myPlayer && myPlayer.correct_streak >= 2 && (
            <p className="mt-1 font-bold text-orange-500">
              🔥 {myPlayer.correct_streak}連続正解中!
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-500">未回答でした</p>
      )}

      <div className="w-full max-w-md">
        <p className="mb-2 text-gray-600">現在のランキング</p>
        <ul className="space-y-2">
          {sortedPlayers.map((p, i) => (
            <li
              key={p.id}
              className={`flex justify-between rounded-lg px-4 py-2 ${
                p.id === playerInfo.playerId ? 'bg-yellow-200 font-bold' : 'bg-gray-100'
              }`}
            >
              <span>{i + 1}. {p.nickname}{p.id === playerInfo.playerId ? '(あなた)' : ''}</span>
              <span>{p.score}点</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
