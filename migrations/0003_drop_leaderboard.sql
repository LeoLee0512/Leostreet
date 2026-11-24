-- The match-mode leaderboard was removed. The table had no owner, and with
-- sign-in off any later server function could read or overwrite every score.
-- 0002 stays so databases that already applied it are not asked to create the
-- table again; this file drops it once.
drop table if exists leaderboard;
