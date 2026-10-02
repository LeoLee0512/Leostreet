import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Crown, Lock, Trophy } from "lucide-react";
import { sfxBad, sfxClick, sfxGood } from "@/lib/game/audio";
import { SCENARIOS, scenarioOf } from "@/lib/story/scenarios";
import { gradeOf, isUnlocked, nextTitle, TITLES } from "@/lib/story/difficulty";
import { estimateMinutes, lengthOf, lengthsFor } from "@/lib/story/lengths";
import { readStoryProgress } from "@/lib/story/progress";
import { readActiveRun, useStory } from "@/lib/story/store";
import type { StoryId, StoryLength, StoryMode, StoryRole } from "@/lib/story/types";
import { useI18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Choose an unlocked crisis and an available session length. The single-player
 * coordinator seat is fixed; the historical ladder and progress stay intact.
 */
export function StoryPicker({ onBack }: { onBack: () => void }) {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const en = lang === "en";
  const brief = useStory((s) => s.brief);
  // Read once on mount: the ladder only changes when a run finishes, and a run
  // finishing takes the player through the debrief and back here anyway.
  const progress = useMemo(() => readStoryProgress(), []);
  const cleared = progress.cleared;

  const [id, setId] = useState<StoryId>(
    () =>
      SCENARIOS.find((s) => !cleared.includes(s.id) && isUnlocked(s.id, cleared))?.id ?? "panic07",
  );
  const role: StoryRole = "governor";
  const mode: StoryMode = "solo";
  const activeRun = useMemo(() => readActiveRun(), []);
  const [length, setLength] = useState<StoryLength>("standard");

  const scenario = SCENARIOS.find((s) => s.id === id)!;
  const obj = scenario.objectives[role];
  const lengths = lengthsFor(scenario);
  const chosen = lengths.find((l) => l.id === length) ?? lengths[0]!;
  const nextT = nextTitle(cleared.length);
  const held = TITLES.filter((tt) => progress.titles.includes(tt.id));

  return (
    <div className="cabinet-shell min-h-dvh overflow-y-auto bg-paper px-4 pb-24 pt-6 text-ink sm:px-8 sm:pt-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="vic-masthead mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="vic-kicker">{t("sc.kicker")}</p>
              <h1 className="vic-letterpress mt-2 text-3xl font-semibold sm:text-4xl">
                {t("sc.title", { n: SCENARIOS.length })}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{t("sc.sub")}</p>
            </div>
            <button
              type="button"
              className="vic-btn-ghost min-h-11 shrink-0 items-center gap-1.5 px-4"
              onClick={onBack}
            >
              <ArrowLeft className="size-4" aria-hidden />
              {en ? "Back" : "返回"}
            </button>
          </div>
        </header>

        {activeRun && (
          <button
            type="button"
            onClick={() => useStory.getState().resumeRun()}
            className="mb-5 min-h-11 w-full border-2 border-seal bg-seal/10 p-4 text-left font-semibold text-seal"
          >
            {en ? "Continue active crisis" : "继续未完成的危机"} ·{" "}
            {en
              ? scenarioOf(activeRun.run.scenarioId).nameEn
              : scenarioOf(activeRun.run.scenarioId).nameZh}
          </button>
        )}
        {/* Where the player is on the ladder, and what the next title costs. */}
        <div className="vic-panel mb-6 px-5 py-4 text-ink">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="vic-kicker">{t("sc.ladder", { n: SCENARIOS.length })}</p>
            <p className="font-mono text-sm font-semibold tabular-nums">
              {t("sc.cleared", { n: cleared.length, of: SCENARIOS.length })}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {held.length === 0 ? (
              <p className="text-xs text-muted">{t("sc.noTitle")}</p>
            ) : (
              held.map((tt) => (
                <span
                  key={tt.id}
                  className="flex items-center gap-1 rounded-full border border-brass/40 bg-surface-2 px-2 py-1 text-xs font-semibold text-brass-deep"
                >
                  <Trophy className="size-3" aria-hidden />
                  {en ? tt.nameEn : tt.nameZh}
                </span>
              ))
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            {nextT
              ? t("sc.titleNext", {
                  n: nextT.need,
                  t: en ? nextT.title.nameEn : nextT.title.nameZh,
                })
              : t("sc.titleAll")}
          </p>
        </div>

        <h2 className="vic-kicker mb-3">{t("sc.pick")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {SCENARIOS.map((s, i) => {
            const on = id === s.id;
            const open = isUnlocked(s.id, cleared);
            const done = cleared.includes(s.id);
            const g = gradeOf(s.grade);
            const prev = i > 0 ? SCENARIOS[i - 1]! : null;
            // A crisis is named once it is open, and one step earlier than
            // that so the player can see what they are working towards. Any
            // further ahead stays masked — and the "clear the one before it"
            // hint only cites a name that is itself visible, or the mask
            // leaks what it is there to hide.
            const named = open || (prev !== null && isUnlocked(prev.id, cleared));
            const prevNamed =
              prev !== null &&
              (isUnlocked(prev.id, cleared) ||
                (i >= 2 && isUnlocked(SCENARIOS[i - 2]!.id, cleared)));
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                disabled={!open}
                onClick={() => {
                  if (!open) {
                    sfxBad();
                    return;
                  }
                  sfxClick();
                  setId(s.id);
                  const allowed = lengthsFor(s).map((l) => l.id);
                  if (!allowed.includes(length)) setLength(allowed[0]!);
                }}
                className={cn(
                  "vic-panel vic-frame relative min-h-24 p-4 text-left transition-all",
                  open ? "active:scale-[0.99]" : "cursor-not-allowed opacity-60",
                  on ? "ring-2 ring-brass ring-offset-2 ring-offset-paper" : "hover:border-brass",
                )}
              >
                <p className="flex flex-wrap items-baseline gap-2 text-sm font-extrabold">
                  <span className="font-mono text-xs text-brass-deep">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {named ? (
                    en ? (
                      s.nameEn
                    ) : (
                      s.nameZh
                    )
                  ) : (
                    <span className="tracking-[0.3em]">??????</span>
                  )}
                  <span className="font-mono text-xs text-muted">{s.year}</span>
                  <span
                    className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-extrabold text-paper"
                    style={{ background: g.tint }}
                  >
                    {en ? g.nameEn : g.nameZh}
                  </span>
                </p>
                {open ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {(en ? s.briefEn : s.briefZh).slice(0, 88)}…
                  </p>
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-muted">
                    <Lock className="size-3" aria-hidden />
                    {prevNamed && prev
                      ? t("sc.lockedHint", { n: en ? prev.nameEn : prev.nameZh })
                      : t("sc.lockedAny")}
                  </p>
                )}
                {open && done ? (
                  <p className="mt-2 text-xs font-semibold text-up">
                    {t("sc.clearedTag")}
                    {progress.best[s.id]
                      ? ` · ${t("sc.bestAt", {
                          n: en
                            ? lengthOf(progress.best[s.id]!).clockEn
                            : lengthOf(progress.best[s.id]!).clockZh,
                        })}`
                      : ""}
                  </p>
                ) : null}
                {done ? (
                  <span
                    className="vic-wax pointer-events-none absolute -right-3 -top-3 rotate-6 font-display font-bold"
                    aria-hidden
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* What this grade asks of you, in the ladder's own words. */}
        <p className="mt-3 text-xs leading-relaxed text-muted">{t("sc.escalates")}</p>
        <p className="vic-panel mt-3 px-4 py-3 text-sm leading-relaxed text-ink-soft">
          <span
            className="mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-extrabold text-paper"
            style={{ background: gradeOf(scenario.grade).tint }}
          >
            {en ? gradeOf(scenario.grade).nameEn : gradeOf(scenario.grade).nameZh}
          </span>
          {en ? gradeOf(scenario.grade).blurbEn : gradeOf(scenario.grade).blurbZh}
        </p>

        <section className="my-6 border-l-2 border-brass pl-4 text-ink-soft">
          <h2 className="font-display font-bold">
            {en ? "Single player · economic crisis coordinator" : "单人 · 经济危机决策层"}
          </h2>
          <p className="mt-2 text-sm">
            {en
              ? "Coordinate policy, institutions and public expectations. Your historical mandate varies by scenario."
              : "统筹政策、机构协调与市场预期。具体历史职权随关卡变化；1907 年由清算体系协调者承担这一视角。"}
          </p>
        </section>
        {/* What this seat is signing up for, before they sign up for it. */}
        <div className="vic-panel mt-3 space-y-3 p-5">
          <Line label={t("sc.youDo")} text={en ? obj.howEn : obj.howZh} />
          <Line label={t("sc.youWin")} text={en ? obj.winEn : obj.winZh} tone="good" />
          <Line label={t("sc.trap")} text={en ? obj.trapEn : obj.trapZh} tone="bad" />
        </div>

        <h2 className="vic-kicker mb-3 mt-8">{t("sc.length")}</h2>
        <p className="mb-2 text-[11px] leading-relaxed text-muted">
          {lengths.length > 1 ? t("sc.lengthNote") : t("sc.lengthOne")}
        </p>
        {lengths.length > 1 ? (
          <p className="mb-3 border border-down/30 bg-down/10 px-4 py-3 text-xs leading-relaxed text-down">
            {t("sc.epicWarn")}
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {lengths.map((L) => {
            const on = chosen.id === L.id;
            return (
              <button
                key={L.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  sfxClick();
                  setLength(L.id);
                }}
                className={cn(
                  "border p-4 text-left transition-colors active:scale-[0.99]",
                  on
                    ? "border-brass-deep bg-brass text-paper shadow-sm"
                    : "vic-panel hover:border-brass",
                )}
              >
                <p className="flex items-baseline gap-2 text-sm font-extrabold">
                  {en ? L.clockEn : L.clockZh}
                  <span
                    className={cn("text-[11px] font-bold", on ? "text-paper/70" : "text-muted")}
                  >
                    {en ? L.nameEn : L.nameZh}
                  </span>
                </p>
                <p
                  className={cn(
                    "mt-1 text-[11px] leading-snug",
                    on ? "text-paper/80" : "text-muted",
                  )}
                >
                  {en ? L.blurbEn : L.blurbZh}
                </p>
                <p
                  className={cn(
                    "mt-1.5 font-mono text-[10px] font-bold tabular-nums",
                    on ? "text-paper/70" : "text-muted",
                  )}
                >
                  {t("sc.estimate", {
                    t: en ? L.clockEn : L.clockZh,
                    n: estimateMinutes(scenario, L.id),
                  })}
                </p>
                <p
                  className={cn(
                    "mt-1 text-[10px] font-extrabold",
                    on ? "text-paper/85" : "text-brass-deep",
                  )}
                >
                  {L.achievement
                    ? t("sc.award", { n: en ? L.achievement.nameEn : L.achievement.nameZh })
                    : t("sc.noAward")}
                </p>
                {L.id === "epic" && scenario.crown ? (
                  <p
                    className={cn(
                      "mt-1 flex items-center gap-1 text-[10px] font-extrabold",
                      on ? "text-paper" : "text-brass-deep",
                    )}
                  >
                    <Crown className="size-3" aria-hidden />
                    {t("sc.crownAt", { n: en ? scenario.crown.nameEn : scenario.crown.nameZh })}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-sm text-muted">
          {en
            ? "Multiple seats are reserved for future multiplayer."
            : "多身份席位保留给后续联机模式。"}
        </p>
        <div className="sticky bottom-0 z-20 mt-6 border-t border-line bg-paper/95 pt-4 pb-9 backdrop-blur-sm">
          <button
            type="button"
            className="vic-btn-seal min-h-11 w-full items-center justify-center gap-2 px-4 py-3 font-semibold"
            onClick={() => {
              sfxGood();
              brief(id, role, mode, chosen.id);
            }}
          >
            <BookOpen className="size-4" aria-hidden />
            {t("sc.read")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Line({ label, text, tone }: { label: string; text: string; tone?: "good" | "bad" }) {
  return (
    <p className="text-sm leading-relaxed">
      <span
        className={cn(
          "mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-extrabold text-paper",
          tone === "good" ? "bg-up" : tone === "bad" ? "bg-down" : "bg-ink",
        )}
      >
        {label}
      </span>
      <span className="text-ink-soft">{text}</span>
    </p>
  );
}
