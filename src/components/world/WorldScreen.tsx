import { useState } from "react";
import { ArrowLeft, Landmark, X } from "lucide-react";
import { sfxClick } from "@/lib/game/audio";
import { useI18n } from "@/lib/i18n";
import { WORLD_COUNTRIES, WORLD_PROVINCES, countryOf, type WorldProvince } from "@/lib/world/world";
import { WorldMap } from "./WorldMap";

/**
 * Full-screen world map: pan, zoom and inspect provinces. This is the board
 * the central-banker campaign (G1) will be played on.
 */
export function WorldScreen({ onBack }: { onBack: () => void }) {
  const en = useI18n((s) => s.lang) === "en";
  const [selected, setSelected] = useState<WorldProvince | null>(null);
  const country = selected ? countryOf(selected.country) : null;
  const siblings = selected ? WORLD_PROVINCES.filter((p) => p.country === selected.country).length : 0;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-paper text-ink">
      <WorldMap
        en={en}
        selectedId={selected?.id ?? null}
        onSelect={(p) => {
          if (p) sfxClick();
          setSelected(p);
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
          className="vic-btn-ghost pointer-events-auto inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-bold"
          style={{ background: "var(--color-surface)" }}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {en ? "Back" : "返回"}
        </button>
        <div className="vic-panel pointer-events-auto px-4 py-2 text-right">
          <h1 className="font-display text-lg font-semibold tracking-wide">{en ? "World Map" : "世界地图"}</h1>
          <p className="text-[11px] text-muted max-sm:hidden">
            {en ? "Drag to pan · scroll or pinch to zoom · tap a province" : "拖动平移 · 滚轮或双指缩放 · 点击省份"}
          </p>
        </div>
      </header>

      <aside
        aria-label={en ? "Countries" : "国家"}
        className="vic-panel absolute bottom-3 left-3 z-10 hidden px-3 py-2.5 sm:bottom-5 sm:left-5 md:block"
      >
        <ul className="grid gap-1.5 text-xs">
          {WORLD_COUNTRIES.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <span className="size-3 rounded-[2px] border border-ink/30" style={{ background: c.tint }} aria-hidden />
              {en ? c.en : c.zh}
            </li>
          ))}
        </ul>
      </aside>

      {selected && country ? (
        <section
          aria-live="polite"
          className="vic-panel absolute inset-x-3 bottom-3 z-10 px-4 py-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-72"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] text-muted">{en ? country.en.toUpperCase() : country.zh}</p>
              <h2 className="font-display text-xl font-semibold">{en ? selected.en : selected.zh}</h2>
            </div>
            <button
              type="button"
              aria-label={en ? "Close" : "关闭"}
              onClick={() => setSelected(null)}
              className="vic-btn-ghost grid size-11 shrink-0 place-items-center"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          {selected.capital ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-brass-deep">
              <Landmark className="size-4" aria-hidden />
              {en ? "Capital — seat of the central bank" : "首都 · 中央银行所在地"}
            </p>
          ) : null}
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {en
              ? `One of ${siblings} provinces of ${country.en}. Economic data arrives with the central-banker campaign.`
              : `${country.zh}的 ${siblings} 个省份之一。经济数据将在央行行长战役中接入。`}
          </p>
        </section>
      ) : null}
    </main>
  );
}
