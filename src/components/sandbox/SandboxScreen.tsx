import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { WorldMap } from "@/components/world/WorldMap";
import { sfxClick, unlockAudio } from "@/lib/game/audio";
import { useI18n } from "@/lib/i18n";
import { PROFILES } from "@/lib/sandbox/countries";
import { localUnemployment } from "@/lib/sandbox/provinces";
import { dateOf, nameOf } from "@/lib/sandbox/sim";
import { SPEEDS, useSandbox, type Speed } from "@/lib/sandbox/store";
import type { SandboxGame } from "@/lib/sandbox/types";
import { countryOf, type WorldProvince } from "@/lib/world/world";
import { cn } from "@/lib/utils";
import { CountryPicker } from "./CountryPicker";
import { Dashboard } from "./Dashboard";
import { EndDialog, EventDialog } from "./Dialogs";
import { FocusTree } from "./FocusTree";
import { layerTint, type Layer } from "./layers";
import { PolicyDesk } from "./PolicyDesk";
import { pct, tx } from "./format";

/** Sandbox entry: resume a saved term, or choose a country and take office. */
export function SandboxScreen({ onBack }: { onBack: () => void }) {
  const game = useSandbox((s) => s.game);
  const load = useSandbox((s) => s.load);
  const start = useSandbox((s) => s.start);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    load();
    setLoaded(true);
  }, [load]);
  if (!loaded) return <div className="min-h-dvh bg-paper" />;
  if (!game) {
    return (
      <CountryPicker
        onBack={onBack}
        onStart={(id) => {
          unlockAudio();
          start(id);
        }}
      />
    );
  }
  return <GameView game={game} onBack={onBack} />;
}

function useClock(speed: Speed) {
  const tick = useSandbox((s) => s.tick);
  const save = useSandbox((s) => s.save);
  useEffect(() => {
    if (!speed) return;
    const perWeek = SPEEDS[speed] * 1000;
    let acc = 0;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      acc += now - last;
      last = now;
      while (acc >= perWeek) {
        acc -= perWeek;
        tick();
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [speed, tick]);
  useEffect(() => {
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [save]);
}

function GameView({ game, onBack }: { game: SandboxGame; onBack: () => void }) {
  const en = useI18n((s) => s.lang) === "en";
  const speed = useSandbox((s) => s.speed);
  const setSpeed = useSandbox((s) => s.setSpeed);
  const toast = useSandbox((s) => s.toast);
  const clearToast = useSandbox((s) => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(clearToast, 2600);
    return () => window.clearTimeout(t);
  }, [toast, clearToast]);
  const [layer, setLayer] = useState<Layer>("nations");
  const [selected, setSelected] = useState<WorldProvince | null>(null);
  const [sheet, setSheet] = useState<"desk" | "economy" | null>("desk");
  const [tree, setTree] = useState(false);
  useClock(speed);

  // Recolour the map once a month, not every week, so a running clock stays cheap.
  const month = Math.floor(game.week / 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tints = useMemo(() => layerTint(game, layer), [layer, month, game.player]);

  const p = PROFILES[game.player];
  const m = game.countries[game.player];
  const d = dateOf(game.week);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-paper text-ink">
      <WorldMap en={en} tints={tints} selectedId={selected?.id ?? null} onSelect={setSelected} className="absolute inset-0" />

      {/* Top bar: who you are, when it is, how fast time runs, the headline numbers. */}
      <header className="absolute inset-x-0 top-0 z-20 p-2 sm:p-3">
        <div className="vic-panel flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
          <button
            type="button"
            aria-label={en ? "Back" : "返回"}
            onClick={() => {
              sfxClick();
              setSpeed(0);
              onBack();
            }}
            className="grid size-9 place-items-center rounded-[3px] border border-line bg-surface hover:border-brass-deep"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </button>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold leading-tight">{tx(nameOf(game.player), en)}</p>
            <p className="text-[11px] text-muted">
              {en ? `Year ${d.year}, week ${d.week}` : `第${d.year}年 · 第${d.week}周`} · {tx(p.currency, en)}
            </p>
          </div>
          <div className="flex items-center gap-1" role="group" aria-label={en ? "Speed" : "速度"}>
            {([0, 1, 2, 3] as Speed[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={speed === s}
                disabled={!!game.event || !!game.over}
                onClick={() => {
                  sfxClick();
                  setSpeed(s);
                }}
                className={cn(
                  "grid h-8 min-w-8 place-items-center rounded-[3px] border px-1.5 text-xs font-bold disabled:opacity-40",
                  speed === s ? "border-brass-deep bg-[#ecd08a]" : "border-line bg-surface hover:border-brass-deep",
                )}
              >
                {s === 0 ? <Pause className="size-3.5" aria-label={en ? "Pause" : "暂停"} /> : s === 1 ? <Play className="size-3.5" aria-label="1×" /> : `${s}×`}
              </button>
            ))}
          </div>
          <dl className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {[
              [en ? "Rate" : "利率", pct(m.rate, 2), false],
              [en ? "Inflation" : "通胀", pct(m.pi), Math.abs(m.pi - p.piStar) > 1.5],
              [en ? "Jobless" : "失业", pct(m.u), m.u - p.uStar > 1.5],
              [en ? "Capital" : "公信力", String(Math.floor(game.points)), false],
            ].map(([k, v, bad]) => (
              <div key={k as string} className="flex items-baseline gap-1">
                <dt className="text-muted">{k}</dt>
                <dd className={cn("font-mono font-bold tabular-nums", bad && "text-down")}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-1.5 flex justify-center gap-1" role="group" aria-label={en ? "Map layer" : "地图图层"}>
          {(
            [
              ["nations", en ? "Nations" : "国别"],
              ["inflation", en ? "Inflation" : "通胀"],
              ["unemployment", en ? "Jobs" : "失业"],
            ] as [Layer, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={layer === id}
              onClick={() => setLayer(id)}
              className={cn("rounded-full border px-3 py-1 text-[11px] font-bold", layer === id ? "border-brass-deep bg-[#ecd08a]" : "border-line bg-surface/90 hover:border-brass-deep")}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Desktop: desk on the left, dashboard on the right. */}
      <aside className="vic-panel absolute bottom-9 left-3 top-[7.5rem] z-10 hidden w-80 overflow-y-auto p-3 lg:block" aria-label={en ? "Policy desk" : "央行决策台"}>
        <PolicyDesk game={game} en={en} onOpenTree={() => setTree(true)} />
      </aside>
      <aside className="vic-panel absolute bottom-9 right-3 top-[7.5rem] z-10 hidden w-80 overflow-y-auto p-3 lg:block" aria-label={en ? "Dashboard" : "经济仪表"}>
        <Dashboard game={game} en={en} />
      </aside>

      {/* Phones and tablets: one bottom sheet with a switcher. */}
      <section className="absolute inset-x-0 bottom-0 z-10 lg:hidden">
        <div className="mx-2 mb-8 vic-panel">
          <div className="flex gap-1 p-1.5">
            {(
              [
                ["desk", en ? "Desk" : "决策台"],
                ["economy", en ? "Economy" : "经济"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={sheet === id}
                onClick={() => setSheet(sheet === id ? null : id)}
                className={cn("flex-1 rounded-[3px] py-1.5 text-xs font-bold", sheet === id ? "bg-[#ecd08a]" : "bg-surface")}
              >
                {label}
              </button>
            ))}
          </div>
          {sheet ? (
            <div className="max-h-[42dvh] overflow-y-auto px-3 pb-3">{sheet === "desk" ? <PolicyDesk game={game} en={en} onOpenTree={() => setTree(true)} /> : <Dashboard game={game} en={en} />}</div>
          ) : null}
        </div>
      </section>

      {selected ? <ProvinceCard game={game} province={selected} en={en} onClose={() => setSelected(null)} /> : null}

      {toast ? (
        <div key={toast.id} className="pointer-events-none absolute inset-x-0 top-28 z-30 flex justify-center px-3">
          <p className="rounded-[3px] border border-down bg-surface px-3 py-2 text-sm font-semibold text-down shadow-[var(--shadow-border)]">{tx(toast.text, en)}</p>
        </div>
      ) : null}

      {tree ? <FocusTree game={game} en={en} onClose={() => setTree(false)} /> : null}
      <EventDialog game={game} en={en} />
      <EndDialog game={game} en={en} onExit={onBack} />
    </main>
  );
}

function ProvinceCard({ game, province, en, onClose }: { game: SandboxGame; province: WorldProvince; en: boolean; onClose: () => void }) {
  const c = game.countries[province.country];
  const mine = province.country === game.player;
  return (
    <div className="vic-panel absolute left-1/2 top-[7.5rem] z-20 w-64 -translate-x-1/2 px-3 py-2.5 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] tracking-[0.15em] text-muted">{tx(countryOf(province.country), en)}</p>
          <p className="font-display text-lg font-semibold">
            {en ? province.en : province.zh}
            {province.capital ? <span className="ml-1 text-brass">★</span> : null}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label={en ? "Close" : "关闭"} className="text-muted hover:text-ink">
          ✕
        </button>
      </div>
      <dl className="mt-1 grid grid-cols-2 gap-x-3 text-xs">
        <dt className="text-muted">{en ? "Local unemployment" : "本省失业率"}</dt>
        <dd className="text-right font-mono">{pct(localUnemployment(game, province.id))}</dd>
        <dt className="text-muted">{en ? "National inflation" : "全国通胀"}</dt>
        <dd className="text-right font-mono">{pct(c.pi)}</dd>
        <dt className="text-muted">{en ? "Policy rate" : "政策利率"}</dt>
        <dd className="text-right font-mono">{pct(c.rate, 2)}</dd>
      </dl>
      {!mine ? <p className="mt-1 text-[11px] text-muted">{en ? "Run by an AI central bank." : "由 AI 央行管理。"}</p> : null}
    </div>
  );
}
