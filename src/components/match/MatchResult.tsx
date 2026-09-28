import { Button } from "@/components/ui/button";
import { compactLeo, pct } from "@/lib/game/format";
import { tierOf } from "@/lib/match/rating";
import { roleOf } from "@/lib/match/roles";
import { playerSeat, winsFor, winsNeeded } from "@/lib/match/series";
import { useMatch } from "@/lib/match/store";
import { useI18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { WaxSeal3D } from "@/components/3d";
import { TEAM_ACCENT, TEAM_SOFT } from "./teamStyle";

/** Between rounds: who took it, and the series so far. */
export function RoundResult() {
  const t = useT();
  const store = useMatch();
  const { match, lastResult } = store;
  if (!match || !lastResult) return null;
  const me = playerSeat(match);
  const drawn = lastResult.winner === null;
  const iWon = !drawn && lastResult.winner === me?.team;

  return (
    <Sheet
      kicker={t("mr.roundOver", { n: lastResult.index + 1 })}
      title={drawn ? t("mr.drawnRound") : iWon ? t("mr.wonRound") : t("mr.lostRound")}
      tone={iWon ? "up" : "down"}
    >
      <Standings />
      <Series />
      <Button className="mt-5 w-full" size="lg" onClick={() => store.nextRound()}>
        {t("mr.next", { n: lastResult.index + 2 })}
      </Button>
    </Sheet>
  );
}

/** The series is decided. Ranked also settles the rating here. */
export function MatchOver({ onExit }: { onExit: () => void }) {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const store = useMatch();
  const { match, ranked, ratingDelta } = store;
  if (!match?.winner) return null;
  const me = playerSeat(match);
  const iWon = match.winner === me?.team;
  const tier = tierOf(ranked.rating);

  return (
    <Sheet
      kicker={t("mr.matchOver")}
      title={iWon ? t("mr.wonMatch") : t("mr.lostMatch")}
      tone={iWon ? "up" : "down"}
    >
      <Series />
      {match.mode === "ranked" ? (
        <div className="mt-3 rounded-sm border border-brass-deep bg-ink px-4 py-3 text-paper shadow-[inset_0_0_0_1px_#b08a2e4d]">
          <p className="text-[11px] font-bold tracking-wide text-paper/60">{t("mm.rank")}</p>
          <p className="font-display text-xl font-semibold">
            {lang === "en" ? tier.nameEn : tier.nameZh} · {ranked.rating}
            <span className={cn("ml-2 text-sm", ratingDelta >= 0 ? "text-up" : "text-down")}>
              {ratingDelta >= 0 ? "+" : ""}
              {ratingDelta}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-paper/70">{t("mm.record", { p: ranked.played, w: ranked.won })}</p>
        </div>
      ) : null}
      <Button
        className="mt-5 w-full"
        size="lg"
        onClick={() => {
          store.quit();
          onExit();
        }}
      >
        {t("mr.exit")}
      </Button>
    </Sheet>
  );
}

function Standings() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const { match, lastResult } = useMatch();
  if (!match || !lastResult) return null;
  const me = playerSeat(match);

  return (
    <div className="space-y-1.5">
      {lastResult.standings.map((s, i) => (
        <div
          key={s.team}
          className={cn(
            "flex items-center justify-between rounded-sm px-3 py-2 text-sm",
            s.team === me?.team ? "text-paper shadow-[inset_0_0_0_1px_#ffffff2e]" : "vic-panel",
          )}
          style={s.team === me?.team ? { background: TEAM_ACCENT[s.team] } : undefined}
        >
          <span className="font-bold">
            {i + 1}. {t("mr.team", { n: s.team.toUpperCase() })}
            {s.team === me?.team ? ` · ${t("mr.you")}` : ""}
          </span>
          <span className="font-mono tabular-nums">
            {pct(s.returnPct)} · {compactLeo(s.nav)}
          </span>
        </div>
      ))}
      <p className="pt-1 text-[11px] leading-relaxed text-muted">
        {lang === "en"
          ? "Team return is the whole desk's book, not your seat alone."
          : "队伍收益率算的是全桌五个人的合计，不是你一个人的。"}
      </p>
    </div>
  );
}

function Series() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const { match } = useMatch();
  if (!match) return null;
  const me = playerSeat(match);
  const target = winsNeeded(match.format);

  return (
    <div className="mt-4">
      <p className="vic-kicker mb-1.5">
        {t("mr.series", { n: target })}
      </p>
      {/*
        One pip per win needed, filled as they are taken — a scoreboard you can
        read in half a second, the way a set score is read in tennis.
      */}
      <div className="space-y-1.5">
        {match.teams.map((team) => {
          const wins = winsFor(match.results, team);
          const mine = team === me?.team;
          return (
            <div
              key={team}
              className="flex items-center gap-2 rounded-sm border border-line px-3 py-2 shadow-[inset_0_1px_0_#ffffff59]"
              style={{ background: mine ? TEAM_SOFT[team] : "var(--color-surface-2)" }}
            >
              <span
                className="text-sm font-extrabold"
                style={{ color: mine ? TEAM_ACCENT[team] : "var(--color-muted)" }}
              >
                {team.toUpperCase()}
                {mine ? ` · ${t("mr.you")}` : ""}
              </span>
              <span className="ml-auto flex gap-1">
                {Array.from({ length: target }).map((_, i) => (
                  <span
                    key={i}
                    className="size-3.5 rounded-full"
                    style={{
                      background: i < wins ? TEAM_ACCENT[team] : "rgba(0,0,0,0.10)",
                    }}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>
      {me ? (
        <p className="mt-2 text-[11px] text-muted">
          {t("mr.yourSeat", { role: lang === "en" ? roleOf(me.role).nameEn : roleOf(me.role).nameZh })}
        </p>
      ) : null}
    </div>
  );
}

function Sheet({
  kicker,
  title,
  tone,
  children,
}: {
  kicker: string;
  title: string;
  tone: "up" | "down";
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="vic-cert animate-pop max-h-[88dvh] w-full max-w-md overflow-y-auto p-6 text-center sm:p-8">
        <div className="flex justify-center">
          <WaxSeal3D size={44} glyph={tone === "up" ? "✦" : "✝"} />
        </div>
        <p className={cn("vic-kicker mt-2", tone === "up" ? "text-up" : "text-down")}>
          {kicker}
        </p>
        <h2 className="vic-letterpress mt-1 text-3xl font-semibold">{title}</h2>
        <div className="vic-divider" aria-hidden />
        <div className="text-left">{children}</div>
      </div>
    </div>
  );
}
