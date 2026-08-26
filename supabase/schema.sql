-- ============================================
-- 1. クイズ本体(問題セットのメタ情報)
-- ============================================
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author_name text,
  author_url text,
  description text,
  shuffle boolean not null default false,
  question_limit int, -- nullなら全問出題
  created_at timestamptz not null default now()
);

-- ============================================
-- 2. 個々の設問
-- ============================================
create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  order_index int not null,
  body text not null,
  choices jsonb not null,       -- 例: ["選択肢1","選択肢2","選択肢3","選択肢4"]
  correct_index int not null,
  time_limit_sec int not null default 20,
  points int not null default 1000
);

-- ============================================
-- 3. ルーム(1回のプレイセッション)
-- ============================================
create table rooms (
  id uuid primary key default gen_random_uuid(),
  pin text not null unique,                 -- 例: 6桁の数字
  quiz_id uuid not null references quizzes(id),
  mode text not null default 'individual',  -- 'individual' | 'team'
  status text not null default 'lobby',     -- lobby | team_assign | question | reveal | ended
  current_question_index int not null default 0,
  question_started_at timestamptz,          -- 演出用の目安時刻(スコア計算には使わない)
  created_at timestamptz not null default now()
);

-- ============================================
-- 4. チーム(チーム戦モードのみ使用)
-- ============================================
create table teams (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  color text not null
);

-- ============================================
-- 5. 参加者
-- ============================================
create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  nickname text not null,
  team_id uuid references teams(id),
  score int not null default 0,
  reconnect_token uuid not null default gen_random_uuid(), -- 再接続用トークン
  current_question_timer_started_at timestamptz,           -- 今の問題のタイマー開始時刻(再接続時の延長防止用)
  joined_at timestamptz not null default now()
);

-- ============================================
-- 6. 回答ログ
-- ============================================
create table answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  question_id uuid not null references questions(id),
  choice_index int not null,
  is_correct boolean not null default false,   -- トリガーが自動計算するので初期値は仮置き
  client_time_taken_ms int not null,           -- クライアントが計測した経過時間(自己申告)
  points_awarded int not null default 0,       -- トリガーが自動計算する
  answered_at timestamptz not null default now(),
  unique (player_id, question_id)              -- 二重回答防止
);

-- ============================================
-- 7. インデックス(検索を速くするための索引)
-- ============================================
create index on players (room_id);
create index on answers (room_id, question_id);
create index on teams (room_id);

-- ============================================
-- 8. 得点自動計算トリガー
--    回答がINSERTされた瞬間に、正解判定と得点計算をDB側で自動的に行う。
--    → クライアント側で得点そのものを送りつけて改ざんすることができなくなる。
-- ============================================
create or replace function calc_answer_points() returns trigger as $$
declare
  q record;
begin
  select correct_index, points, time_limit_sec into q
  from questions where id = new.question_id;

  new.is_correct := (new.choice_index = q.correct_index);

  if new.is_correct then
    -- 基本点の50%を保証し、残り時間の割合に応じて最大100%まで上乗せする早押しボーナス
    new.points_awarded := greatest(
      round(q.points * (1 - least(new.client_time_taken_ms / 1000.0, q.time_limit_sec) / q.time_limit_sec / 2)),
      round(q.points * 0.5)
    );
  else
    new.points_awarded := 0;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_calc_answer_points
  before insert on answers
  for each row execute function calc_answer_points();
