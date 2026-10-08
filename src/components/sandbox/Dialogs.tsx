import { sfxClick, sfxGood } from "@/lib/game/audio";
import { PROFILES } from "@/lib/sandbox/countries";
import { FOCUS_BY_ID } from "@/lib/sandbox/focus";
import { recommendedChoice } from "@/lib/sandbox/advisor";
import { closestGovernor, summarize } from "@/lib/sandbox/governors";
import { useSettings } from "@/lib/settings";
import { dateOf, gradeOf, has, nameOf } from "@/lib/sandbox/sim";
import { useSandbox } from "@/lib/sandbox/store";
import type { EventKind, SandboxGame } from "@/lib/sandbox/types";
import { cn } from "@/lib/utils";
import { tx } from "./format";

const KIND: Record<EventKind, { zh: string; en: string; cls: string }> = {
  crisis: { zh: "急报", en: "URGENT", cls: "bg-down text-surface" },
  history: { zh: "史实原型", en: "AFTER HISTORY", cls: "bg-brass-deep text-surface" },
  random: { zh: "时事", en: "NEWS", cls: "bg-paper-deep text-ink-soft" },
  national: { zh: "国内", en: "AT HOME", cls: "bg-teal text-surface" },
  swan: { zh: "黑天鹅", en: "BLACK SWAN", cls: "bg-ink text-surface" },
};

/** A crisis telegram: the clock stops until the governor answers. */
export function EventDialog({ game, en }: { game: SandboxGame; en: boolean }) {
  const act = useSandbox((s) => s.act);
  const beginner = useSettings((s) => s.beginner);
  const e = game.event;
  if (!e) return null;
  const pick = beginner ? recommendedChoice(game) : null;
  const d = dateOf(e.week);
  const kind = KIND[e.kind] ?? KIND.crisis; // saves from before categories existed
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-3 pb-9 sm:items-center" role="dialog" aria-modal aria-labelledby="event-title">
      <div className="vic-panel vic-frame max-h-[88dvh] w-full max-w-lg overflow-y-auto p-5 sm:p-6">
        <p className="flex items-center gap-2">
          <span className={cn("rounded-[2px] px-1.5 py-0.5 text-[10px] font-bold tracking-[0.15em]", kind.cls)}>{en ? kind.en : kind.zh}</span>
          <span className="vic-kicker">{en ? `YEAR ${d.year}, WEEK ${d.week}` : `第${d.year}年第${d.week}周`}</span>
        </p>
        <h2 id="event-title" className="vic-letterpress mt-1 text-2xl font-semibold">
          {tx(e.title, en)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{tx(e.body, en)}</p>
        <div className="vic-divider" aria-hidden />
        <ul className="grid gap-2">
          {e.choices.map((c) => {
            const locked = !!c.requires && !has(game, c.requires);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    sfxClick();
                    act({ type: "choose", choice: c.id });
                  }}
                  className={cn(
                    "w-full rounded-[3px] border px-3 py-2.5 text-left transition-colors",
                    locked ? "cursor-not-allowed border-dashed border-line opacity-55" : "border-line bg-surface hover:border-brass-deep hover:bg-[#f6ecd2] active:scale-[0.99]",
                  )}
                >
                  <span className="flex items-center gap-2 font-bold">
                    {tx(c.label, en)}
                    {pick === c.id ? (
                      <span className="rounded-[2px] bg-up px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-surface">{en ? "ADVISOR" : "顾问推荐"}</span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {locked ? `🔒 ${en ? "Needs" : "需要国策"}「${tx(FOCUS_BY_ID[c.requires!].name, en)}」` : tx(c.hint, en)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {e.history ? (
          <details className="mt-4 rounded-[3px] border border-line bg-paper-deep/50 px-3 py-2 text-xs leading-relaxed text-ink-soft">
            <summary className="cursor-pointer font-bold text-brass-deep">{en ? "The real story" : "史实档案"}</summary>
            <p className="mt-1.5">{tx(e.history, en)}</p>
          </details>
        ) : null}
      </div>
    </div>
  );
}

const VERDICT = {
  S: { zh: "教科书级的任期。后人会研究你的会议纪要。", en: "A textbook term. People will study your minutes." },
  A: { zh: "稳健而可信。偶有颠簸，但从未失控。", en: "Steady and credible. Some bumps, never out of control." },
  B: { zh: "及格。经济熬过来了，但代价不小。", en: "A pass. The economy came through, at a price." },
  C: { zh: "坎坷的十年。通胀或失业长期偏离目标。", en: "A rough decade. Inflation or jobs were off target for long stretches." },
  D: { zh: "一段要写进教科书反面案例的任期。", en: "A term for the textbooks, as the cautionary tale." },
} as const;

/** End of the term (or of the governor). */
export function EndDialog({ game, en, onExit }: { game: SandboxGame; en: boolean; onExit: () => void }) {
  const quit = useSandbox((s) => s.quit);
  if (!game.over) return null;
  const grade = gradeOf(game);
  const m = game.countries[game.player];
  const p = PROFILES[game.player];
  const years = (game.week / 52).toFixed(1);
  const { avgPi, avgU } = summarize(game);
  const twin = closestGovernor(game);
  const titles = {
    term: en ? "Your term is over" : "任期届满",
    retired: en ? "You step down" : "光荣卸任",
    fired: en ? "Dismissed" : "你被解职了",
    hyperinflation: en ? "Hyperinflation" : "恶性通胀",
  } as const;
  const title = titles[game.over];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal aria-labelledby="end-title">
      <div className="vic-panel vic-frame w-full max-w-md p-6 text-center">
        <p className="vic-kicker">
          {tx(nameOf(game.player), en)} · {tx(p.currency, en)}
        </p>
        <h2 id="end-title" className="vic-letterpress mt-1 text-3xl font-semibold">
          {title}
        </h2>
        <div className="mx-auto mt-4 grid size-24 place-items-center rounded-full border-4 border-double border-brass-deep bg-[#f3e2b4] font-display text-5xl font-bold text-ink">
          {grade.letter}
        </div>
        <p className="mt-3 text-sm text-ink-soft">{tx(VERDICT[grade.letter], en)}</p>
        {game.decades?.length ? (
          <p className="mt-2 text-xs text-muted">
            {en ? "Decade reviews: " : "历次十年评级："}
            <span className="font-mono font-bold tracking-widest text-ink">{game.decades.map((d) => d.letter).join(" ")}</span>
          </p>
        ) : null}
        <dl className="mt-4 grid grid-cols-2 gap-2 text-left text-xs">
          {[
            [en ? "Years served" : "在任", `${years} ${en ? "yrs" : "年"}`],
            [en ? "Average inflation" : "平均通胀", `${avgPi.toFixed(1)}% (${en ? "target" : "目标"} ${p.piStar}%)`],
            [en ? "Average unemployment" : "平均失业", `${avgU.toFixed(1)}%`],
            [en ? "Crises faced" : "经历危机", String(game.crises)],
            [en ? "Final trust" : "最终信誉", String(Math.round(m.trust))],
            [en ? "Reforms passed" : "完成国策", String(game.focusDone.length)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[3px] border border-line bg-surface px-2 py-1.5">
              <dt className="text-[10px] text-muted">{k}</dt>
              <dd className="font-mono font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 rounded-[3px] border border-brass-deep/60 bg-[#f6ecd2] px-3 py-2.5 text-left">
          <p className="vic-kicker">{en ? "HISTORY'S VERDICT" : "史实对照"}</p>
          <p className="mt-1 text-sm">
            {en ? "Your term most resembles " : "你的任期最像："}
            <b>{tx(twin.name, en)}</b>
            <span className="text-muted">
              {" "}
              · {tx(twin.bank, en)} {twin.years}
            </span>
          </p>
          <p className="mt-1 text-xs text-ink-soft">{tx(twin.note, en)}</p>
          <p className="mt-1 text-[10px] text-muted">
            {en
              ? `Their term: inflation ≈${twin.pi}%, unemployment ≈${twin.u}% (rounded annual averages).`
              : `其任期年均：通胀约 ${twin.pi}%，失业约 ${twin.u}%（近似值，仅供对照）。`}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm font-bold hover:border-brass-deep"
            onClick={() => {
              sfxClick();
              quit();
              onExit();
            }}
          >
            {en ? "Leave" : "离开"}
          </button>
          <button
            type="button"
            className="rounded-[3px] border border-brass-deep bg-gradient-to-b from-[#ecd08a] to-[#b98f34] px-3 py-2.5 text-sm font-bold"
            onClick={() => {
              sfxGood();
              quit();
            }}
          >
            {en ? "Another term" : "再任一届"}
          </button>
        </div>
      </div>
    </div>
  );
}
