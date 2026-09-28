import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LogOut, Megaphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfxBad, sfxGood } from "@/lib/game/audio";
import { compactLeo, pct } from "@/lib/game/format";
import { realizedVol } from "@/lib/game/math";
import { calloutsFor } from "@/lib/match/bots";
import { roleOf } from "@/lib/match/roles";
import {
  MATCH_BOARD,
  SEAT_START_CASH,
  bookOf,
  priceOf,
  seatNav,
  slippageFor,
  standingsOf,
  teamLeverage,
  teamNav,
} from "@/lib/match/round";
import { playerSeat, winsFor, winsNeeded } from "@/lib/match/series";
import { MATCH_TICK_SECONDS, useMatch } from "@/lib/match/store";
import { KLineChart } from "@/components/game/KLineChart";
import { Coin3D } from "@/components/3d";
import { PlayerName } from "@/components/game/PlayerName";
import { useI18n, useT } from "@/lib/i18n";
import { ROLE_ACCENT, TEAM_ACCENT, TEAM_SOFT } from "./teamStyle";
import { cn } from "@/lib/utils";

/**
 * A round in progress.
 *
 * The screen is built around the seat you drew. The analyst gets a model
 * column nobody else has; the trader gets a cheap-fill badge and no model; the
 * risk seat gets the desk's whole book with a cut button on every line. The
 * callout feed is the constant — it is where the other four seats' information
 * reaches you, and it is the reason a solo player is not just guessing.
 */
export function MatchDesk() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const store = useMatch();
  const { match, round } = store;
  const [ticker, setTicker] = useState<string>(MATCH_BOARD[0]);
  const [qty, setQty] = useState(100);
  const [lev, setLev] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);

  // The round clock. A tick is a game hour; the interval is what makes the
  // session land at four to six minutes of real time.
  useEffect(() => {
    const id = window.setInterval(() => useMatch.getState().tick(), MATCH_TICK_SECONDS * 1000);
    return () => window.clearInterval(id);
  }, []);

  // Which way each name moved on the last tick, so the board can flash. A tape
  // where the numbers change silently reads as a spreadsheet, not a market.
  const prices = store.round ? MATCH_BOARD.map((tk) => store.round!.market.stocks[tk]?.price ?? 0) : [];
  const prev = useRef<number[]>(prices);
  const tickDir: Record<string, "up" | "down" | null> = {};
  MATCH_BOARD.forEach((tk, i) => {
    const before = prev.current[i];
    const now = prices[i];
    tickDir[tk] = before === undefined || now === undefined || now === before ? null : now > before ? "up" : "down";
  });
  useEffect(() => {
    prev.current = prices;
  });

  if (!match || !round) return null;
  const me = playerSeat(match);
  if (!me) return null;
  const spec = roleOf(me.role);
  const book = bookOf(round, me.id);
  const st = round.market.stocks[ticker];
  const nav = seatNav(round, me.id);
  const myPnl = nav - SEAT_START_CASH;
  const lev4Team = teamLeverage(round, match, me.team);
  const feed = calloutsFor(round, me.team).slice(-7).reverse();
  const left = round.lengthTicks - round.elapsed;
  const live = standingsOf(round, match);

  const act = (fn: () => string | null) => {
    const e = fn();
    setErr(e);
    if (e) sfxBad();
    else sfxGood();
  };

  return (
    <div className="min-h-dvh overflow-y-auto bg-paper px-3 pb-24 pt-3 sm:px-5">
      <div className="mx-auto w-full max-w-4xl">
        <header className="sticky top-0 z-20 -mx-3 mb-3 bg-paper px-3 pt-1 sm:-mx-5 sm:px-5">
          <div className="flex flex-wrap items-center gap-2 rounded-sm border border-brass-deep bg-ink px-4 py-3 text-paper shadow-[inset_0_0_0_1px_#b08a2e4d,0_4px_14px_#3a2c1826]">
            <Coin3D size={30} spinning className="shrink-0" />
            <div className="mr-auto">
              <p className="text-[11px] font-bold tracking-wide text-paper/60">
                {t("md.round", { n: round.index + 1 })} · {lang === "en" ? spec.nameEn : spec.nameZh} ·{" "}
                {t("md.toWin", { n: winsNeeded(match.format) })}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5">
                {match.teams.map((tm) => (
                  <span
                    key={tm}
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-sm font-extrabold tabular-nums",
                      tm === me.team ? "text-paper" : "text-paper/70",
                    )}
                    style={{ background: tm === me.team ? TEAM_ACCENT[tm] : "rgba(255,255,255,0.1)" }}
                  >
                    {tm.toUpperCase()} {winsFor(match.results, tm)}
                  </span>
                ))}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("md.forfeit")}
              title={t("md.forfeit")}
              onClick={() => setConfirmQuit(true)}
              className="mr-2 rounded-sm px-2 py-1 text-[11px] font-extrabold text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
            <div className="text-right">
              <p className="text-[11px] font-bold tracking-wide text-paper/60">{t("md.left")}</p>
              <p
                className={cn(
                  "font-mono text-lg font-semibold tabular-nums",
                  left * MATCH_TICK_SECONDS <= 30 && "animate-pulse text-down",
                )}
              >
                {Math.floor((left * MATCH_TICK_SECONDS) / 60)}:
                {String(Math.floor((left * MATCH_TICK_SECONDS) % 60)).padStart(2, "0")}
              </p>
            </div>
          </div>

          {/*
            The live scoreboard. Without it a five-minute round is played blind:
            you cannot tell whether to press or to protect a lead, which is the
            decision the format exists to create.
          */}
          <div className="mt-1.5 flex gap-1.5 rounded-sm border border-line bg-surface p-1.5 shadow-[inset_0_1px_0_#ffffff59]">
            {live.map((s, i) => (
              <div
                key={s.team}
                className={cn(
                  "flex flex-1 items-center justify-between gap-1 rounded-sm px-2 py-1",
                  s.team === me.team && "shadow-[inset_0_0_0_2px_currentColor]",
                )}
                style={{
                  background: TEAM_SOFT[s.team],
                  color: TEAM_ACCENT[s.team],
                }}
              >
                <span className="text-[11px] font-extrabold">
                  {i + 1}. {s.team.toUpperCase()}
                  {s.team === me.team ? ` · ${t("mr.you")}` : ""}
                </span>
                <span className="font-mono text-xs font-extrabold tabular-nums">{pct(s.returnPct, 1)}</span>
              </div>
            ))}
          </div>
        </header>

        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat k={t("md.myNav")} v={compactLeo(nav)} tone={myPnl >= 0 ? "up" : "down"} />
          <Stat k={t("md.myPnl")} v={pct(myPnl / SEAT_START_CASH)} tone={myPnl >= 0 ? "up" : "down"} />
          <Stat k={t("md.teamNav")} v={compactLeo(teamNav(round, match, me.team))} />
          <Stat
            k={t("md.teamLev")}
            v={`${lev4Team.toFixed(2)}x`}
            tone={lev4Team > 2.6 ? "down" : undefined}
          />
        </div>

        {/* The desk's chatter. In single-player this is the whole information channel. */}
        <section className="vic-panel mb-3 rounded-sm p-3">
          <h2 className="mb-2 flex items-center gap-1.5 vic-kicker">
            <Megaphone className="size-3.5" /> {t("md.feed")}
          </h2>
          {feed.length === 0 ? (
            <p className="text-sm text-muted">{t("md.feedEmpty")}</p>
          ) : (
            <ul className="space-y-1.5">
              {feed.map((c) => {
                const who = match.seats.find((s) => s.id === c.seatId);
                return (
                  <li
                    key={c.id}
                    className={cn(
                      "animate-slide-in rounded-sm border-l-4 px-2.5 py-1.5 text-[13px] leading-snug shadow-[inset_0_1px_0_#ffffff40]",
                      c.tone === "alert"
                        ? "bg-down/12 text-down"
                        : c.tone === "edge"
                          ? "bg-teal-soft text-teal-deep"
                          : "bg-paper text-ink-soft",
                    )}
                    // A seat always speaks in its own colour, so you learn to
                    // recognise the analyst's line without reading the label.
                    style={{ borderLeftColor: ROLE_ACCENT[c.role] }}
                  >
                    <span className="font-extrabold" style={{ color: ROLE_ACCENT[c.role] }}>
                      {who?.human ? <PlayerName name={who.name} /> : (who?.name ?? c.seatId)} ·{" "}
                      {lang === "en" ? roleOf(c.role).nameEn : roleOf(c.role).nameZh}
                    </span>
                    <span className="ml-1.5">{lang === "en" ? c.en : c.zh}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="vic-panel mb-3 rounded-sm p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="vic-kicker">{t("md.board")}</h2>
            {spec.slippageMult < 1 ? (
              <span className="flex items-center gap-1 rounded-full bg-up px-2 py-0.5 text-[10px] font-extrabold text-paper">
                <Zap className="size-3" /> {t("md.cheapFills")}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {MATCH_BOARD.map((tk) => {
              const s = round.market.stocks[tk];
              if (!s) return null;
              const chg = s.price / s.prevClose - 1;
              const held = book?.positions.find((p) => p.ticker === tk);
              const move = tickDir[tk];
              return (
                <button
                  key={tk}
                  type="button"
                  onClick={() => setTicker(tk)}
                  // `key` on the inner price forces the flash to replay whenever
                  // the number actually changes, rather than once on mount.
                  className={cn(
                    "rounded-sm border border-line bg-paper px-2 py-2 text-left shadow-[inset_0_1px_0_#ffffff59] transition-shadow",
                    ticker === tk && "ring-2 ring-brass",
                    held && "shadow-[inset_0_0_0_2px_#2f6b62]",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold">{tk}</span>
                    {held ? (
                      <span className="text-[9px] font-extrabold text-teal">
                        {held.shares > 0 ? "▲" : "▼"}
                      </span>
                    ) : null}
                  </div>
                  <div
                    key={`${tk}-${s.price.toFixed(2)}`}
                    className={cn(
                      "rounded font-mono text-xs tabular-nums",
                      move === "up" && "flash-up",
                      move === "down" && "flash-down",
                    )}
                  >
                    {s.price.toFixed(1)}
                  </div>
                  <div className={cn("text-[10px] font-bold", chg >= 0 ? "tick-up" : "tick-down")}>{pct(chg)}</div>
                </button>
              );
            })}
          </div>
        </section>

        {st ? (
          <section className="vic-panel mb-3 rounded-sm p-3">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-extrabold">
                  {lang === "en" ? st.nameEn : st.nameZh} · {ticker}
                </p>
                <p className="font-mono text-2xl font-semibold tabular-nums">{st.price.toFixed(2)}</p>
              </div>
              <p className="text-[11px] text-muted">
                {t("md.slip", { n: (slippageFor(me) * 100).toFixed(2) })}
              </p>
            </div>
            <KLineChart data={st.history} className="mt-2 h-24 w-full" />

            {/* The analyst's private column. Every other seat is told, or guesses. */}
            {spec.seesModel ? (
              <p className="mt-1 rounded-sm border border-teal/40 bg-teal-soft px-2.5 py-1.5 text-[12px] font-semibold text-teal-deep">
                {t("md.model", {
                  fair: st.fair.toFixed(1),
                  gap: pct(st.price / Math.max(0.01, st.fair) - 1, 1),
                  dur: st.duration.toFixed(0),
                  rv: realizedVol(st.history) ? `${(realizedVol(st.history) * 100).toFixed(0)}%` : "—",
                })}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-muted">{t("md.noModel")}</p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-bold text-muted">{t("md.qty")}</span>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                  className="mt-1 h-11 w-full rounded-sm border border-line bg-paper px-3 font-mono text-sm font-semibold shadow-[inset_0_1px_2px_#3a2c181f] outline-none focus-visible:outline-2 focus-visible:outline-brass"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-muted">{t("md.lev", { n: lev })}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={lev}
                  onChange={(e) => setLev(Number(e.target.value))}
                  className="mt-3 w-full"
                />
              </label>
            </div>
            {err ? <p className="mt-2 text-sm font-semibold text-down">{t(err)}</p> : null}
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Button variant="up" onClick={() => act(() => store.trade(ticker, qty, lev))}>
                {t("ex.buy")}
              </Button>
              <Button variant="danger" onClick={() => act(() => store.trade(ticker, -qty, 1))}>
                {t("ex.sell")}
              </Button>
              <Button
                variant="secondary"
                disabled={!book?.positions.some((p) => p.ticker === ticker)}
                onClick={() => act(() => store.closeOut(ticker))}
              >
                {t("ex.close")}
              </Button>
            </div>
          </section>
        ) : null}

        <section className="vic-panel mb-3 rounded-sm p-3">
          <h2 className="mb-2 vic-kicker">{t("md.myBook")}</h2>
          {!book?.positions.length ? (
            <p className="text-sm text-muted">{t("md.flat")}</p>
          ) : (
            <ul className="space-y-1.5">
              {book.positions.map((p) => {
                const pnl = (priceOf(round, p.ticker) - p.avgCost) * p.shares;
                return (
                  <li key={p.ticker} className="flex items-center justify-between rounded-sm border border-line bg-paper px-3 py-2 text-sm shadow-[inset_0_1px_0_#ffffff59]">
                    <span>
                      {p.ticker} {p.shares > 0 ? t("ex.long") : t("ex.short")} {Math.abs(p.shares)}
                    </span>
                    <span className={pnl >= 0 ? "tick-up" : "tick-down"}>{compactLeo(pnl)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Risk and PM see the whole desk. Only risk can act on it. */}
        {spec.seesTeamBook ? (
          <section className="vic-panel mb-3 rounded-sm p-3">
            <h2 className="mb-2 flex items-center gap-1.5 vic-kicker">
              <AlertTriangle className="size-3.5" /> {t("md.deskBook")}
            </h2>
            {match.seats
              .filter((s) => s.team === me.team && s.id !== me.id)
              .map((mate) => {
                const mb = bookOf(round, mate.id);
                return (
                  <div key={mate.id} className="mb-1.5 rounded-sm border border-line bg-paper px-3 py-2 shadow-[inset_0_1px_0_#ffffff59]">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold">
                        {mate.name} · {lang === "en" ? roleOf(mate.role).nameEn : roleOf(mate.role).nameZh}
                      </span>
                      <span className="font-mono text-xs tabular-nums">{compactLeo(seatNav(round, mate.id))}</span>
                    </div>
                    {!mb?.positions.length ? (
                      <p className="mt-0.5 text-[11px] text-muted">{t("md.flat")}</p>
                    ) : (
                      mb.positions.map((p) => (
                        <div key={p.ticker} className="mt-1 flex items-center justify-between text-[12px]">
                          <span>
                            {p.ticker} {p.shares > 0 ? "+" : ""}
                            {p.shares}
                          </span>
                          {spec.canForceCut ? (
                            <Button size="sm" variant="ghost" onClick={() => act(() => store.forceCut(mate.id, p.ticker))}>
                              {t("md.cut")}
                            </Button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
          </section>
        ) : null}
      </div>

      {/*
        A Bo7 is up to fifty minutes. Starting one with no way out is a trap,
        so there is always a door — it just costs the series, and in ranked it
        costs the rating too, which is what stops it being a rage-quit button.
      */}
      {confirmQuit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="panel-shell animate-pop w-full max-w-sm p-6 text-center">
            <h2 className="font-display text-2xl font-semibold">{t("md.forfeitQ")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {match.mode === "ranked" ? t("md.forfeitRanked") : t("md.forfeitCasual")}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirmQuit(false)}>
                {t("md.forfeitNo")}
              </Button>
              <Button variant="danger" onClick={() => store.forfeit()}>
                {t("md.forfeitYes")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-sm border border-line bg-surface px-3 py-2 shadow-[inset_0_1px_0_#ffffff59,0_2px_4px_#3a2c181f]">
      <p className="text-[11px] font-bold text-muted">{k}</p>
      <p
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
        )}
      >
        {v}
      </p>
    </div>
  );
}
