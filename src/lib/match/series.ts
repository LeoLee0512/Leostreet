import { ROLE_IDS } from "./roles.ts";
import type { MatchFormat, MatchMode, MatchState, RoundResult, Seat, TeamCount, TeamId } from "./types.ts";

/** Wins needed to take the series: 3 of 5, or 4 of 7. */
export function winsNeeded(format: MatchFormat): number {
  return format === "bo7" ? 4 : 3;
}

export function maxRounds(format: MatchFormat): number {
  return format === "bo7" ? 7 : 5;
}

export function winsFor(results: RoundResult[], team: TeamId): number {
  return results.reduce((n, r) => n + (r.winner === team ? 1 : 0), 0);
}

export function scoreboard(match: MatchState): { team: TeamId; wins: number }[] {
  return match.teams.map((team) => ({ team, wins: winsFor(match.results, team) }));
}

/**
 * Who has taken the series, or null if it is still live.
 *
 * With three teams the target is unchanged — 3 of 5 is still 3 of 5 — but the
 * series can also exhaust its rounds with nobody there. That is not a draw: the
 * most round wins takes it, and a genuine tie on wins is broken by total return
 * across the series, which `decideSeries` handles.
 */
export function seriesWinner(match: MatchState): TeamId | null {
  const target = winsNeeded(match.format);
  for (const { team, wins } of scoreboard(match)) {
    if (wins >= target) return team;
  }
  return null;
}

export function roundsPlayed(match: MatchState): number {
  return match.results.length;
}

/** True once a winner exists, or the format has no rounds left to play. */
export function isMatchOver(match: MatchState): boolean {
  return seriesWinner(match) !== null || roundsPlayed(match) >= maxRounds(match.format);
}

/**
 * Can `team` still reach the target with the rounds that remain? Used to end a
 * series early once it is mathematically settled (3-0 in a Bo5 with two teams).
 */
export function stillAlive(match: MatchState, team: TeamId): boolean {
  const left = maxRounds(match.format) - roundsPlayed(match);
  return winsFor(match.results, team) + left >= winsNeeded(match.format);
}

/** The final call, including the tiebreak when the rounds run out. */
export function decideSeries(match: MatchState): TeamId | null {
  const outright = seriesWinner(match);
  if (outright) return outright;
  if (roundsPlayed(match) < maxRounds(match.format)) return null;

  const board = scoreboard(match).sort((x, y) => y.wins - x.wins);
  const top = board[0];
  if (!top) return null;
  const tied = board.filter((r) => r.wins === top.wins).map((r) => r.team);
  if (tied.length === 1) return top.team;

  // Same number of round wins: the desk that made the most money takes it.
  const totalReturn = (team: TeamId) =>
    match.results.reduce((a, r) => a + (r.standings.find((s) => s.team === team)?.returnPct ?? 0), 0);
  return tied.reduce((best, team) => (totalReturn(team) > totalReturn(best) ? team : best), tied[0]!);
}

const TEAM_ORDER: TeamId[] = ["a", "b", "c"];

const BOT_NAMES_ZH = [
  "老张", "安娜", "卡洛", "小林", "芒格街", "薇拉", "陈太", "琼斯", "玛雅", "鲍勃",
  "阿泰", "周叔", "米娅", "老赵", "图图",
];
const BOT_NAMES_EN = [
  "Zhang", "Ana", "Carlo", "Kobayashi", "Munger", "Vera", "Chan", "Jones", "Maya", "Bob",
  "Tai", "Zhou", "Mia", "Zhao", "Tutu",
];

/**
 * Fill every seat in the match. The player takes `playerRole` on team A; the
 * other fourteen seats are bots whose skill is drawn from `rng` around
 * `botSkill`, so a casual lobby is not the same lobby every time.
 */
export function buildSeats(
  teamCount: TeamCount,
  playerRole: Seat["role"],
  playerName: string,
  rng: () => number,
  botSkill = 0.55,
): Seat[] {
  const seats: Seat[] = [];
  let botIndex = 0;
  for (const team of TEAM_ORDER.slice(0, teamCount)) {
    for (const role of ROLE_IDS) {
      const human = team === "a" && role === playerRole;
      const n = botIndex % BOT_NAMES_ZH.length;
      seats.push({
        id: `${team}-${role}`,
        team,
        role,
        name: human ? playerName : `${BOT_NAMES_ZH[n]}·${BOT_NAMES_EN[n]}`,
        human,
        skill: human ? 1 : clamp01(botSkill + (rng() - 0.5) * 0.3),
      });
      if (!human) botIndex += 1;
    }
  }
  return seats;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function createMatch(opts: {
  id: string;
  mode: MatchMode;
  format: MatchFormat;
  teamCount: TeamCount;
  playerRole: Seat["role"];
  playerName: string;
  seed: number;
  rng: () => number;
  botSkill?: number;
}): MatchState {
  return {
    id: opts.id,
    mode: opts.mode,
    format: opts.format,
    teams: TEAM_ORDER.slice(0, opts.teamCount),
    seats: buildSeats(opts.teamCount, opts.playerRole, opts.playerName, opts.rng, opts.botSkill),
    seed: opts.seed,
    results: [],
    winner: null,
  };
}

/** Record a finished round and settle the series if that round ended it. */
export function recordRound(match: MatchState, result: RoundResult): MatchState {
  const next: MatchState = { ...match, results: [...match.results, result] };
  next.winner = isMatchOver(next) ? decideSeries(next) : null;
  return next;
}

export function seatsOfTeam(match: MatchState, team: TeamId): Seat[] {
  return match.seats.filter((s) => s.team === team);
}

export function playerSeat(match: MatchState): Seat | undefined {
  return match.seats.find((s) => s.human);
}
