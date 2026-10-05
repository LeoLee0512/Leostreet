import { BookOpen, Globe2, Landmark } from "lucide-react";
import { Crest3D } from "@/components/3d";
import { sfxClick, sfxGood, unlockAudio } from "@/lib/game/audio";
import { useI18n, useT } from "@/lib/i18n";
import { WorldMap } from "@/components/world/WorldMap";

/**
 * The map IS the main menu: the fictional continent fills the viewport and the
 * mode entries float over it as parchment cards, under a gazette masthead.
 */
export function MapHome({
  onStart,
  onCollection,
}: {
  onStart: () => void;
  onCollection: () => void;
}) {
  const t = useT();
  const en = useI18n((s) => s.lang) === "en";

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-paper text-ink">
      <div aria-hidden className="absolute inset-0">
        <WorldMap en={en} decorative className="relative h-full w-full" />
      </div>
      {/* Paper scrims keep the masthead and cards legible over the map. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-52 bg-gradient-to-b from-paper via-paper/85 to-transparent sm:h-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[46%] bg-gradient-to-t from-paper via-paper/75 to-transparent sm:h-[62%]"
      />

      <header className="vic-masthead absolute inset-x-0 top-0 z-10 px-4 pt-4 sm:px-8 sm:pt-5">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-muted">
            <span className="max-sm:hidden">{t("home.kicker")}</span>
            <span className="hidden sm:inline">{t("home.issue")}</span>
            <span className="flex items-center gap-2 max-sm:ml-auto">
              <button
                type="button"
                onClick={() => {
                  sfxClick();
                  onCollection();
                }}
                className="vic-btn-ghost inline-flex min-h-11 items-center gap-1.5 px-3 text-[11px] font-bold tracking-[0.14em]"
              >
                <BookOpen className="size-4" aria-hidden />
                {t("home.collection")}
              </button>
              <button
                type="button"
                onClick={() => {
                  sfxClick();
                  useI18n.getState().setLang(en ? "zh" : "en");
                }}
                className="vic-btn-ghost inline-flex min-h-11 items-center gap-1.5 px-3 text-[11px] font-bold tracking-[0.14em]"
              >
                <Globe2 className="size-4" aria-hidden />
                {en ? "中文" : "English"}
              </button>
            </span>
          </div>
          <div className="vic-divider mt-2" aria-hidden />
          {/* Gazette crest, centred with the nameplate ruled around it. */}
          <div className="mt-2 flex items-center justify-center gap-4 sm:gap-6">
            <span className="hidden h-px min-w-16 flex-1 bg-line/80 sm:block" aria-hidden />
            <span className="hidden text-lg leading-none text-brass-deep sm:block" aria-hidden>
              ❦
            </span>
            <Crest3D size={72} className="shrink-0 origin-center scale-[0.82] sm:scale-100" />
            <span className="hidden -scale-x-100 text-lg leading-none text-brass-deep sm:block" aria-hidden>
              ❦
            </span>
            <span className="hidden h-px min-w-16 flex-1 bg-line/80 sm:block" aria-hidden />
          </div>
          <h1 className="vic-letterpress mt-2 text-center font-display text-4xl font-semibold tracking-wide sm:text-5xl">
            {t("game.title")}
          </h1>
          <p className="mt-1.5 flex items-center justify-center gap-3 text-center text-xs tracking-[0.3em] text-muted">
            <span className="vic-rosette scale-75" aria-hidden />
            <span>{en ? "LEO STREET LEGEND" : "灯湾公报 · 战略特刊"}</span>
            <span className="vic-rosette scale-75" aria-hidden />
          </p>
          <div className="vic-divider mt-2" aria-hidden />
        </div>
      </header>

      <section
        aria-label={en ? "Start" : "开始"}
        className="absolute inset-x-0 bottom-0 z-10 px-4 pb-8 sm:px-8 sm:pb-12"
      >
        <div className="mx-auto flex max-w-md flex-col items-center">
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              sfxGood();
              onStart();
            }}
            className="vic-panel vic-frame group flex w-full items-center justify-center gap-4 px-8 py-6 transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.99]"
          >
            <span className="vic-wax shrink-0 rounded-full" style={{ width: 52, height: 52 }}>
              <Landmark className="size-6" aria-hidden />
            </span>
            <span className="text-left">
              <span className="vic-kicker block">{en ? "THE CENTRAL BANK AWAITS" : "中央银行虚位以待"}</span>
              <span className="vic-letterpress mt-1 block text-3xl font-semibold tracking-[0.18em]">
                {en ? "Start game" : "开始游戏"}
              </span>
            </span>
          </button>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">{t("home.footer")}</p>
        </div>
      </section>
    </main>
  );
}
