import { useMemo } from "react";
import { BookOpen, FlaskConical, Globe2, ScrollText, Swords } from "lucide-react";
import { Coin3D, Crest3D } from "@/components/3d";
import { createEconomy } from "@/lib/story/economy";
import { sfxClick, sfxGood, unlockAudio } from "@/lib/game/audio";
import { useI18n, useT } from "@/lib/i18n";
import { StoryAtlas } from "@/components/story/StoryAtlas";

/**
 * The map IS the main menu: the fictional continent fills the viewport and the
 * mode entries float over it as parchment cards, under a gazette masthead.
 */
export function MapHome({
  hasSave,
  onContinue,
  onStory,
  onMatch,
  onPractice,
  onCollection,
}: {
  hasSave: boolean;
  onContinue: () => void;
  onStory: () => void;
  onMatch: () => void;
  onPractice: () => void;
  onCollection: () => void;
}) {
  const t = useT();
  const en = useI18n((s) => s.lang) === "en";
  const economy = useMemo(() => {
    const e = createEconomy();
    e.capacity = { materials: 1.5, industry: 1.75, transport: 1.5 };
    e.sales = 5.5;
    return e;
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-paper text-ink">
      <div
        aria-hidden
        className="absolute inset-0 [&_.strategic-atlas]:h-full [&_.atlas-viewport]:aspect-auto [&_.atlas-viewport]:h-full"
      >
        <StoryAtlas economy={economy} pressure={0.2} en={en} decorative />
      </div>
      {/* Paper scrims keep the masthead and cards legible over the map. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-60 bg-gradient-to-b from-paper via-paper/85 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[62%] bg-gradient-to-t from-paper via-paper/75 to-transparent"
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
        aria-label={en ? "Game modes" : "游戏模式"}
        className="absolute inset-x-0 bottom-0 z-10 px-4 pb-5 sm:px-8 sm:pb-8"
      >
        <div className="mx-auto max-w-6xl">
          {hasSave ? (
            <button
              type="button"
              onClick={() => {
                unlockAudio();
                sfxGood();
                onContinue();
              }}
              className="vic-panel vic-frame mb-4 flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left"
            >
              <Coin3D size={52} glyph="£" spinning className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="vic-kicker block">{t("home.continue")}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">
                  {t("home.continueSub")}
                </span>
              </span>
              <span className="vic-btn-seal min-h-11 px-5">{t("game.continue")}</span>
            </button>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <ModeCard
              icon={<ScrollText className="size-6" aria-hidden />}
              kicker={t("home.story")}
              body={t("home.storySub")}
              seal
              onClick={() => {
                unlockAudio();
                sfxClick();
                onStory();
              }}
            />
            <ModeCard
              icon={<Swords className="size-6" aria-hidden />}
              kicker={t("home.match")}
              body={t("home.matchSub")}
              onClick={() => {
                unlockAudio();
                sfxClick();
                onMatch();
              }}
            />
            <ModeCard
              icon={<FlaskConical className="size-6" aria-hidden />}
              kicker={t("home.practice")}
              body={t("home.practiceSub")}
              onClick={() => {
                unlockAudio();
                sfxClick();
                onPractice();
              }}
            />
          </div>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
            {t("home.footer")}
          </p>
        </div>
      </section>
    </main>
  );
}

function ModeCard({
  icon,
  kicker,
  body,
  seal = false,
  onClick,
}: {
  icon: React.ReactNode;
  kicker: string;
  body: string;
  seal?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="vic-panel group flex min-h-11 items-center gap-4 px-4 py-4 text-left transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.99] sm:flex-col sm:items-start sm:gap-3 sm:px-5 sm:py-5"
    >
      <span
        className={`grid size-11 shrink-0 place-items-center shadow-[var(--shadow-border)] ${
          seal
            ? "vic-wax"
            : "rounded-full bg-brass text-paper ring-2 ring-brass-deep/60 ring-offset-2 ring-offset-surface"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="vic-kicker block group-hover:text-brass-deep">{kicker}</span>
        <span className="mt-1 block text-xs leading-relaxed text-ink-soft sm:text-sm">
          {body}
        </span>
      </span>
    </button>
  );
}
