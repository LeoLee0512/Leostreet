import { useState } from "react";
import { ArrowLeft, Crosshair, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfxClick, sfxGood } from "@/lib/game/audio";
import { useGame } from "@/lib/game/store";
import { ROLES, ROLE_IDS } from "@/lib/match/roles";
import { readRanked, tierOf, toNextTier } from "@/lib/match/rating";
import { ownsItem } from "@/lib/game/progress";
import { CUSTOM_ROOM_ID } from "@/lib/game/storefront";
import { MATCH_TICK_SECONDS, useMatch } from "@/lib/match/store";
import type { MatchFormat, MatchMode, RoleId, TeamCount } from "@/lib/match/types";
import { useI18n, useT } from "@/lib/i18n";
import { Coin3D } from "@/components/3d";
import { PlayerName } from "@/components/game/PlayerName";
import { ROLE_ACCENT, ROLE_ICON } from "./teamStyle";
import { cn } from "@/lib/utils";

/**
 * Queue up. Mode, field size, series length, seat.
 *
 * The seat is the interesting choice and it is deliberately last: it is the one
 * that decides what you can see for the next half hour.
 */
export function MatchLobby({ onPractice, onHome }: { onPractice: () => void; onHome: () => void }) {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const startMatch = useMatch((s) => s.startMatch);
  const playerName = useGame((s) => s.name);
  const [mode, setMode] = useState<MatchMode>("practice");
  const [format, setFormat] = useState<MatchFormat>("bo5");
  const [teamCount, setTeamCount] = useState<TeamCount>(2);
  const [role, setRole] = useState<RoleId>("trader");
  const [ranked] = useState(() => (typeof window === "undefined" ? null : readRanked()));
  // The custom room is a purchased MODE, so it is offered only where it cannot
  // distort a result: practice. Ranked and casual always run the defaults.
  const hasCustom = typeof window !== "undefined" && ownsItem(CUSTOM_ROOM_ID);
  const [custom, setCustom] = useState(false);
  const [roundMin, setRoundMin] = useState(5);
  const [botSkill, setBotSkill] = useState(0.38);
  const [boardSize, setBoardSize] = useState(12);
  const customOn = hasCustom && custom && mode === "practice";

  const tier = ranked ? tierOf(ranked.rating) : null;
  const next = ranked ? toNextTier(ranked.rating) : null;

  const MODES: { id: MatchMode; label: string; blurb: string; icon: React.ReactNode }[] = [
    {
      id: "practice",
      label: t("mm.practice"),
      blurb: t("mm.practiceB"),
      icon: <Crosshair className="size-4" />,
    },
    {
      id: "casual",
      label: t("mm.casual"),
      blurb: t("mm.casualB"),
      icon: <Swords className="size-4" />,
    },
    {
      id: "ranked",
      label: t("mm.ranked"),
      blurb: t("mm.rankedB"),
      icon: <Trophy className="size-4" />,
    },
  ];

  return (
    <div className="min-h-dvh overflow-y-auto bg-paper px-3 pb-24 pt-6 sm:px-5">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Coin3D size={40} spinning className="mt-1 shrink-0" />
            <div>
              <p className="vic-kicker">{t("mm.kicker")}</p>
              <h1 className="vic-letterpress mt-1 text-3xl font-semibold">{t("mm.title")}</h1>
              <p className="mt-1 text-xs font-bold text-muted">
                <PlayerName name={playerName} />
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <Button variant="secondary" size="sm" onClick={onHome}>
              <ArrowLeft className="size-3.5" aria-hidden />
              {lang === "en" ? "Main menu" : "返回主菜单"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onPractice}>
              {t("mm.practiceGround")}
            </Button>
          </div>
        </div>

        {ranked && tier ? (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-sm border border-brass-deep bg-ink px-4 py-3 text-paper shadow-[inset_0_0_0_1px_#b08a2e4d,0_4px_14px_#3a2c1826]">
            <div>
              <p className="text-[11px] font-bold tracking-wide text-paper/60">{t("mm.rank")}</p>
              <p className="font-display text-xl font-semibold">
                {lang === "en" ? tier.nameEn : tier.nameZh} · {ranked.rating}
              </p>
            </div>
            <p className="text-right text-[11px] leading-snug text-paper/70">
              {t("mm.record", { p: ranked.played, w: ranked.won })}
              {next ? (
                <>
                  <br />
                  {t("mm.toNext", {
                    n: next.points,
                    tier: lang === "en" ? next.tier.nameEn : next.tier.nameZh,
                  })}
                </>
              ) : null}
            </p>
          </div>
        ) : null}

        <Section title={t("mm.mode")}>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  sfxClick();
                  setMode(m.id);
                }}
                className={cn(
                  "rounded-sm p-3 text-left transition-transform active:scale-[0.99]",
                  mode === m.id
                    ? "border border-teal-deep bg-teal text-paper shadow-[inset_0_0_0_1px_#ffffff2e,0_3px_10px_#3a2c1830]"
                    : "vic-panel vic-frame",
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-extrabold">
                  {m.icon}
                  {m.label}
                </span>
                <span
                  className={cn(
                    "mt-1 block text-[11px] leading-snug",
                    mode === m.id ? "text-paper/80" : "text-muted",
                  )}
                >
                  {m.blurb}
                </span>
              </button>
            ))}
          </div>
        </Section>

        <Section title={t("mm.field")}>
          <Choice
            value={teamCount}
            onChange={(v) => setTeamCount(v)}
            items={[
              { id: 2 as TeamCount, label: t("mm.f2"), blurb: t("mm.f2B") },
              { id: 3 as TeamCount, label: t("mm.f3"), blurb: t("mm.f3B") },
            ]}
          />
        </Section>

        <Section title={t("mm.format")}>
          <Choice
            value={format}
            onChange={(v) => setFormat(v)}
            items={[
              { id: "bo5" as MatchFormat, label: t("mm.bo5"), blurb: t("mm.bo5B") },
              { id: "bo7" as MatchFormat, label: t("mm.bo7"), blurb: t("mm.bo7B") },
            ]}
          />
        </Section>

        <Section title={t("mm.seat")}>
          <p className="mb-2 text-xs leading-relaxed text-muted">{t("mm.seatNote")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLE_IDS.map((id) => {
              const spec = ROLES[id];
              const on = role === id;
              const accent = ROLE_ACCENT[id];
              const Icon = ROLE_ICON[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    sfxClick();
                    setRole(id);
                  }}
                  // Each seat carries its own colour here and on the desk, so the
                  // palette is already familiar by the time the chatter starts.
                  className={cn(
                    "relative overflow-hidden rounded-sm p-3 pl-4 text-left",
                    "transition-transform duration-150 active:scale-[0.99]",
                    on
                      ? "border border-ink-soft text-paper shadow-[inset_0_0_0_1px_#ffffff2e,0_3px_10px_#3a2c1830]"
                      : "vic-panel",
                  )}
                  style={on ? { background: accent } : undefined}
                >
                  <span
                    className="absolute inset-y-0 left-0 w-1.5"
                    style={{ background: on ? "rgba(255,255,255,0.45)" : accent }}
                  />
                  <p className="flex items-center gap-1.5 text-sm font-extrabold">
                    <Icon className="size-4" />
                    {lang === "en" ? spec.nameEn : spec.nameZh}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[11px] leading-snug",
                      on ? "text-paper/85" : "text-muted",
                    )}
                  >
                    {lang === "en" ? spec.blurbEn : spec.blurbZh}
                  </p>
                </button>
              );
            })}
          </div>
        </Section>

        {hasCustom && mode === "practice" ? (
          <Section title={t("cr.title")}>
            <button
              type="button"
              onClick={() => {
                sfxClick();
                setCustom((v) => !v);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-sm p-3 text-left",
                custom
                  ? "border border-brass-deep bg-ink text-paper shadow-[inset_0_0_0_1px_#b08a2e4d]"
                  : "vic-panel",
              )}
            >
              <span className="text-sm font-extrabold">{t("cr.toggle")}</span>
              <span className="text-xs font-extrabold">
                {custom ? t("toggle.on") : t("toggle.off")}
              </span>
            </button>
            {custom ? (
              <div className="vic-panel mt-2 space-y-3 rounded-sm p-3">
                <Slider
                  label={t("cr.length", { n: roundMin })}
                  min={1}
                  max={10}
                  step={1}
                  value={roundMin}
                  onChange={setRoundMin}
                />
                <Slider
                  label={t("cr.skill", { n: Math.round(botSkill * 100) })}
                  min={0.1}
                  max={0.95}
                  step={0.05}
                  value={botSkill}
                  onChange={setBotSkill}
                />
                <Slider
                  label={t("cr.board", { n: boardSize })}
                  min={6}
                  max={12}
                  step={1}
                  value={boardSize}
                  onChange={setBoardSize}
                />
                <p className="text-[11px] leading-relaxed text-muted">{t("cr.note")}</p>
              </div>
            ) : null}
          </Section>
        ) : null}

        {/*
          The queue button follows you down the page. Burying the only action
          that matters under five role cards is how a lobby feels like a form.
        */}
        <div className="vic-divider" aria-hidden />
        <div className="sticky bottom-3 z-20 mt-2">
          <Button
            className="w-full shadow-[0_6px_18px_#3a2c1840]"
            size="lg"
            onClick={() => {
              sfxGood();
              startMatch({
                mode,
                format,
                teamCount,
                role,
                playerName,
                setup: customOn
                  ? { lengthTicks: Math.round((roundMin * 60) / MATCH_TICK_SECONDS), boardSize }
                  : undefined,
                botSkill: customOn ? botSkill : undefined,
              });
            }}
          >
            {t("mm.go", {
              n: teamCount === 3 ? "5v5v5" : "5v5",
              f: format === "bo7" ? t("mm.bo7") : t("mm.bo5"),
            })}
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">{t("mm.botNote")}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="vic-kicker mb-2 flex items-center gap-2">
        <span className="inline-block h-px w-4 bg-line" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Choice<T extends string | number>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; blurb: string }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((it) => (
        <button
          key={String(it.id)}
          type="button"
          onClick={() => {
            sfxClick();
            onChange(it.id);
          }}
          className={cn(
            "rounded-sm p-3 text-left transition-transform active:scale-[0.99]",
            value === it.id
              ? "border border-teal-deep bg-teal text-paper shadow-[inset_0_0_0_1px_#ffffff2e,0_3px_10px_#3a2c1830]"
              : "vic-panel",
          )}
        >
          <p className="text-sm font-extrabold">{it.label}</p>
          <p
            className={cn(
              "mt-1 text-[11px] leading-snug",
              value === it.id ? "text-paper/80" : "text-muted",
            )}
          >
            {it.blurb}
          </p>
        </button>
      ))}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block text-xs font-bold text-muted">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full"
      />
    </label>
  );
}
