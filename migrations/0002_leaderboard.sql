-- Global net-worth leaderboard for the online world. Unowned rows: the app
-- runs auth-off by design, and a row carries only a public score.
create table if not exists leaderboard (
  player_id text primary key,
  name text not null,
  nav double precision not null,
  updated_at timestamptz not null default now()
);

create index if not exists leaderboard_nav_idx on leaderboard (nav desc);
