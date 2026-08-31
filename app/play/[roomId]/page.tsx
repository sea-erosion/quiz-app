'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { revealTextGradually } from '@/lib/revealTextGradually';

type Room = {
  id: string;
  status: 'lobby' | 'preview' | 'question' | 'reveal' | 'ended';
  current_question_index: number;
  is_tutorial: boolean;
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

type PlayerInfo = {
  playerId: string;
};

type Player = {
  id: string;
  nickname: string;
  score: number;
  correct_streak: number;
};

type Answer = {
  id: string;
  question_id: string;
};

export default function PlayGamePage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const [room, setRoom] = useState<Room | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]); // 全員のランキング表示用
  const [answers, setAnswers] = useState<Answer[]>([]); // 先着◯人制限の判定用

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

  // 出題演出用:何文字目まで表示済みか、選択肢をフェードインさせるかどうか
  const [revealedCount, setRevealedCount] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const questionIdRef = useRef<string | null>(null);

  // 早押し用:trueにすると、実行中の文字送り演出をその場で打ち切る
  const skipRevealRef = useRef(false);

  const currentQuestion = useMemo(() => {
    if (!room) return null;
    return questions.find((q) => q.order_index === room.current_question_index) ?? null;
  }, [room, questions]);

  const ANSWER_LIMIT = 3;

  // 今の問題に、先着で何人が回答済みかを数える(先着3人制限の判定に使う)
  const answeredCountForCurrentQuestion = useMemo(() => {
    if (!currentQuestion) return 0;
    return answers.filter((a) => a.question_id === currentQuestion.id).length;
  }, [answers, currentQuestion]);

  const isAnswerLimitReached = answeredCountForCurrentQuestion >= ANSWER_LIMIT;

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
        .select('id, status, current_question_index, quiz_id, is_tutorial')
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

      // ランキング表示用に、参加者全員のスコアも取得しておく
      const { data: playersData } = await supabase
        .from('players')
        .select('id, nickname, score, correct_streak')
        .eq('room_id', roomId);
      if (playersData) setPlayers(playersData);

      // 先着◯人制限の判定用に、これまでの回答も取得しておく
      const { data: answersData } = await supabase
        .from('answers')
        .select('id, question_id')
        .eq('room_id', roomId);
      if (answersData) setAnswers(answersData);
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

  // 4. 新しい問題(question状態になった瞬間)に、DB上のタイマー開始時刻を確認して復元 or 新規記録する
  //    previewの間はまだタイマーを動かしたくないので、status==='question'になってから実行する
  useEffect(() => {
    if (!currentQuestion || !playerInfo || room?.status !== 'question') return;
    if (questionIdRef.current === currentQuestion.id) return; // 同じ問題なら何もしない

    questionIdRef.current = currentQuestion.id;
    setHasAnswered(false);
    setSelectedChoice(null);
    setIsLocked(false);
    setRemainingMs(currentQuestion.time_limit_sec * 1000);
    setTimerStartMs(null);
    setRevealedCount(0);
    setShowChoices(false);
    skipRevealRef.current = false; // 早押しフラグも新しい問題ごとにリセットする

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
        // 回答済み(=リロードで戻ってきた)場合は演出を飛ばしてすぐ全部見せる
        setRevealedCount(currentQuestion!.body.length);
        setShowChoices(true);
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

      if (existingStartedAt) {
        // リロード・再接続の場合:演出は飛ばして即フル表示し、残り時間を計算して再開する
        setRevealedCount(currentQuestion!.body.length);
        setShowChoices(true);

        const startMs = new Date(existingStartedAt).getTime();
        setTimerStartMs(startMs);

        const timeLimitMs = currentQuestion!.time_limit_sec * 1000;
        const elapsed = Date.now() - startMs;
        const remaining = Math.max(timeLimitMs - elapsed, 0);
        setRemainingMs(remaining);
        if (remaining <= 0) setIsLocked(true);
        return;
      }

      // 初めての表示:1文字ずつ表示する演出を行い、演出が終わってから初めてタイマーを開始する
      // ただし早押しでタップされた場合(skipRevealRef)は、その場で演出を打ち切る
      await revealTextGradually(
        currentQuestion!.body.length,
        125,
        () => cancelled || skipRevealRef.current,
        (count) => setRevealedCount(count)
      );

      if (cancelled) return; // 問題自体が切り替わっていたら、ここで打ち切る(早押しでの打ち切りとは区別する)

      // 早押しでタップされた場合は、その時点の中途半端な表示のまま先へ進む
      // (最後まで表示してしまうと「押した瞬間に止まる」感じが薄れてしまうため、あえて何もしない)

      // 演出が終わった瞬間(または早押しでタップされた瞬間)に選択肢をフェードインさせ、同時にタイマーを開始する
      setShowChoices(true);

      const now = new Date();
      const startMs = now.getTime();
      await supabase
        .from('players')
        .update({ current_question_timer_started_at: now.toISOString() })
        .eq('id', playerInfo!.playerId);

      if (cancelled) return; // 更新完了を待っている間に切り替わっていたら反映しない

      setTimerStartMs(startMs);
      setRemainingMs(currentQuestion!.time_limit_sec * 1000); // 演出後に開始するので満タンから始まる
    }

    setupTimer();

    // 問題が切り替わる・画面を離れる際に呼ばれる後片付け処理
    return () => {
      cancelled = true;
    };
  }, [currentQuestion, playerInfo, room?.status]);

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

  // 出題演出の途中で画面をタップした時に呼ばれる(早押し)
  function handleSkipReveal() {
    if (showChoices || hasAnswered) return; // すでに選択肢が出ていたら何もしない
    skipRevealRef.current = true;
  }

  async function handleAnswer(choiceIndex: number) {
    if (hasAnswered || isLocked || !currentQuestion || !playerInfo || !showChoices) return;
    if (isAnswerLimitReached) return; // 先着枠が埋まっていたら送信すらしない

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
      // ほぼ同時に3人目の回答と重なり、DB側の先着チェックで拒否された場合はここに来る。
      // 送信前の状態(未回答)に戻し、枠が埋まっている旨を表示する。
      if (error.message.includes('ANSWER_LIMIT_REACHED')) {
        setHasAnswered(false);
        setSelectedChoice(null);
      }
    }
  }

  if (!room || !playerInfo) {
    return <main className="p-8">読み込み中...</main>;
  }

  if (room.status === 'lobby') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        {room.is_tutorial && (
          <p className="max-w-md rounded-lg bg-yellow-100 p-3 text-sm text-yellow-800">
            🔰 参加できました。ここは「待機画面」です。ホストが開始するまでこのままお待ちください。
          </p>
        )}
        <h1 className="text-2xl font-bold">参加しました!</h1>
        <p className="text-gray-600">ホストが開始するまでお待ちください</p>
      </main>
    );
  }

  if (room.status === 'ended') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 p-8">
        {room.is_tutorial && (
          <p className="max-w-md rounded-lg bg-yellow-100 p-3 text-sm text-yellow-800">
            🔰 これで一連の流れは以上です。お疲れさまでした!実際のクイズもこの流れで進みます。
          </p>
        )}
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

  // 予告(preview)画面:次の問題が何点かだけを見せる
  if (room.status === 'preview') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        {room.is_tutorial && (
          <p className="max-w-md rounded-lg bg-yellow-100 p-3 text-sm text-yellow-800">
            🔰 「予告画面」です。次の問題が何点かだけ先に分かります。もうすぐ問題文が表示されます。
          </p>
        )}
        <h1 className="text-2xl font-bold">次の問題は…</h1>
        <p className="text-7xl font-bold text-indigo-600">{currentQuestion.points}点</p>
        <p className="text-gray-500">まもなく出題されます</p>
      </main>
    );
  }

  // 出題中(question)の画面
  if (room.status === 'question') {
    return (
      <main
        onClick={handleSkipReveal}
        className="flex min-h-screen flex-col items-center gap-6 p-8"
      >
        {room.is_tutorial && (
          <p className="max-w-xl rounded-lg bg-yellow-100 p-3 text-sm text-yellow-800">
            🔰 「出題画面」です。問題文をタップすると早く選択肢を表示できます(早押し)。選択肢が出たらタップして回答してください。
          </p>
        )}
        <p className="text-2xl font-mono font-bold">
          残り {Math.ceil(remainingMs / 1000)}秒
        </p>
        {/* 1文字ずつ表示する演出。まだ表示していない部分は透明な文字で場所だけ確保しておき、
            表示が進むにつれてレイアウトがガタつかないようにする */}
        <h1 className="max-w-xl text-center text-2xl font-bold">
          <span>{currentQuestion.body.slice(0, revealedCount)}</span>
          <span className="text-transparent">{currentQuestion.body.slice(revealedCount)}</span>
        </h1>

        {!showChoices && !hasAnswered && (
          <p className="animate-pulse text-sm text-indigo-500">
            画面をタップすると早く選択肢を表示できます
          </p>
        )}

        {showChoices && !hasAnswered && !isAnswerLimitReached && (
          <p className="font-semibold text-orange-500">
            先着{ANSWER_LIMIT}人だけ回答できます(残り{ANSWER_LIMIT - answeredCountForCurrentQuestion}人)
          </p>
        )}

        {showChoices && !hasAnswered && isAnswerLimitReached && (
          <p className="font-semibold text-red-600">
            先着{ANSWER_LIMIT}人の回答枠が埋まりました
          </p>
        )}

        <div
          className={`grid w-full max-w-xl grid-cols-2 gap-4 transition-opacity duration-500
            ${showChoices ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          {currentQuestion.choices.map((choice, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation(); // 選択肢のクリックがmainのタップ判定(早押し)に伝わらないようにする
                handleAnswer(i);
              }}
              disabled={hasAnswered || isLocked || !showChoices || isAnswerLimitReached}
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
      {room.is_tutorial && (
        <p className="max-w-xl rounded-lg bg-yellow-100 p-3 text-sm text-yellow-800">
          🔰 「結果発表画面」です。正解と、あなたの正誤・現在のランキングが表示されます。もうすぐ最終結果に進みます。
        </p>
      )}
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
