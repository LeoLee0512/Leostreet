import { useMemo, useState } from "react";
import { ArrowLeft, Landmark } from "lucide-react";
import { WorldMap } from "@/components/world/WorldMap";
import { sfxClick, sfxGood } from "@/lib/game/audio";
import { useI18n } from "@/lib/i18n";
import { COUNTRY_ORDER, PROFILES, initialMacro } from "@/lib/sandbox/countries";
import { nameOf } from "@/lib/sandbox/sim";
import type { CountryId } from "@/lib/sandbox/types";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { countryTint } from "./layers";
import { pct, tx } from "./format";

const STARS = ["", "简单", "普通", "进阶", "困难", "极难"];
const STARS_EN = ["", "Easy", "Normal", "Advanced", "Hard", "Very hard"];

/** Sandbox start: choose the country whose central bank you will run. */
export function CountryPicker({ onBack, onStart }: { onBack: () => void; onStart: (id: CountryId, endless: boolean) => void }) {
  const en = useI18n((s) => s.lang) === "en";
  const beginner = useSettings((s) => s.beginner);
  const [pick, setPick] = useState<CountryId>(beginner ? "velden" : "lion");
  const [endless, setEndless] = useState(false);
  const tints = useMemo(() => countryTint(pick, 0.42), [pick]);
  const p = PROFILES[pick];
  const m = initialMacro(pick);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-paper text-ink">
      <WorldMap
        en={en}
        tints={tints}
        onSelect={(prov) => {
          if (!prov) return;
          sfxClick();
          setPick(prov.country);
        }}
        className="absolute inset-0"
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-5">
        <button
          type="button"
          onClick={() => {
            sfxClick();
            onBack();
          }}
          className="vic-btn-ghost pointer-events-auto whitespace-nowrap"
          style={{ background: "var(--color-surface)" }}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {en ? "Back" : "返回"}
        </button>
        <div className="vic-panel pointer-events-auto px-4 py-2 text-right">
          <p className="vic-kicker">{en ? "SANDBOX" : "沙盒"}</p>
          <h1 className="font-display text-lg font-semibold">{en ? "Choose your central bank" : "选择你要执掌的央行"}</h1>
        </div>
      </header>

      {/* vic-frame is unlayered `position: relative`; the inline style keeps the panel absolute. */}
      <section
        className="vic-panel vic-frame inset-x-3 bottom-9 z-10 max-h-[58dvh] overflow-y-auto p-4 sm:inset-x-auto sm:left-5 sm:top-24 sm:bottom-9 sm:max-h-none sm:w-[23rem]"
        style={{ position: "absolute" }}
      >
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-2">
          {COUNTRY_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={pick === id}
              onClick={() => {
                sfxClick();
                setPick(id);
              }}
              className={cn(
                "rounded-[3px] border px-2 py-1.5 text-left transition-colors",
                pick === id ? "border-brass-deep bg-[#f3e2b4]" : "border-line bg-surface hover:border-brass-deep",
              )}
            >
              <span className="block truncate text-sm font-bold">{tx(nameOf(id), en).replace(/^the /, "")}</span>
              <span className="block text-[10px] tracking-wider text-brass-deep">
                {"★".repeat(PROFILES[id].difficulty)}
                {beginner && id === "velden" ? <span className="ml-1 rounded-[2px] bg-up px-1 text-surface">{en ? "start here" : "新手推荐"}</span> : null}
              </span>
            </button>
          ))}
        </div>

        <div className="vic-divider" aria-hidden />
        <h2 className="font-display text-2xl font-semibold">{tx(nameOf(pick), en)}</h2>
        <p className="text-xs text-muted">
          {tx(p.currency, en)} · {en ? STARS_EN[p.difficulty] : STARS[p.difficulty]}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{tx(p.blurb, en)}</p>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [en ? "Inflation" : "通胀", pct(m.pi)],
            [en ? "Jobless" : "失业", pct(m.u)],
            [en ? "Policy rate" : "利率", pct(m.rate, 2)],
            [en ? "Trust" : "信誉", String(Math.round(m.trust))],
            [en ? "Debt/GDP" : "国债", pct(m.debt, 0)],
            [en ? "Target" : "目标", pct(p.piStar, 0)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[3px] border border-line bg-surface px-1 py-1.5">
              <dt className="text-[10px] text-muted">{k}</dt>
              <dd className="font-mono text-sm font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-1.5" role="group" aria-label={en ? "Term" : "任期"}>
          {[
            [false, en ? "Ten-year term" : "十年任期", en ? "Graded at the end" : "期满结算评级"],
            [true, en ? "Endless term" : "无限任期", en ? "A review every ten years" : "每十年评级一次"],
          ].map(([value, label, hint]) => (
            <button
              key={String(value)}
              type="button"
              aria-pressed={endless === value}
              onClick={() => {
                sfxClick();
                setEndless(value as boolean);
              }}
              className={cn(
                "rounded-[3px] border px-2 py-1.5 text-left transition-colors",
                endless === value ? "border-brass-deep bg-[#f3e2b4]" : "border-line bg-surface hover:border-brass-deep",
              )}
            >
              <span className="block text-sm font-bold">{label as string}</span>
              <span className="block text-[10px] text-muted">{hint as string}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            sfxGood();
            onStart(pick, endless);
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[3px] border border-brass-deep bg-gradient-to-b from-[#ecd08a] to-[#b98f34] px-4 py-3 font-display text-lg font-semibold tracking-[0.2em] text-ink shadow-[inset_0_1px_0_#fff6] active:scale-[0.99]"
        >
          <Landmark className="size-5" aria-hidden />
          {en ? "Take office" : "宣誓就任"}
        </button>
      </section>
    </main>
  );
}
