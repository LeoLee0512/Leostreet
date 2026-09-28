import { useEffect, useMemo, useState } from "react";
import { Swords, X } from "lucide-react";
import { HOUR_SECONDS } from "@/lib/game/catalog";
import { compactUsd } from "@/lib/game/format";
import { netWorth } from "@/lib/game/economy";
import { hasSave } from "@/lib/game/save";
import { addPlaySeconds, recordSession } from "@/lib/game/honor";
import { bootFromStorage, useGame } from "@/lib/game/store";
import { sfxClick, unlockAudio } from "@/lib/game/audio";
import { bootLang, useI18n, useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dock } from "./Dock";
import { HudBar } from "./HudBar";
import { LangToggle } from "./LangToggle";
import { NewsTicker } from "./NewsTicker";
import { PanelHost } from "./PanelHost";
import { PlaceMenu } from "./PlaceMenu";
import { MapHome } from "./MapHome";
import { TitleScreen } from "./TitleScreen";
import { MatchLobby } from "@/components/match/MatchLobby";
import { MatchDesk } from "@/components/match/MatchDesk";
import { MatchOver, RoundResult } from "@/components/match/MatchResult";
import { RoundIntro } from "@/components/match/RoundIntro";
import { useMatch } from "@/lib/match/store";
import { useStory } from "@/lib/story/store";
import { createEconomy } from "@/lib/story/economy";
import { StoryPicker } from "@/components/story/StoryPicker";
import { StoryBriefing } from "@/components/story/StoryBriefing";
import { StoryRoom } from "@/components/story/StoryRoom";
import { StoryDebrief } from "@/components/story/StoryDebrief";
import { StoryCollection } from "@/components/story/StoryCollection";
import { readAppearance } from "@/lib/story/engagement";
import { StoryAtlas } from "@/components/story/StoryAtlas";

export function GameRoot() {
  const [appearance, setAppearance] = useState("naval");
  useEffect(() => {
    const update = () => setAppearance(readAppearance());
    update();
    window.addEventListener("leo-street-appearance", update);
    return () => window.removeEventListener("leo-street-appearance", update);
  }, []);
  return (
    <div className="strategy-app" data-appearance={appearance}>
      <GameContent />
    </div>
  );
}

function GameContent() {
  const started = useGame((s) => s.started);
  const [booted, setBooted] = useState(false);
  const [saveExists, setSaveExists] = useState(false);
  const [dest, setDest] = useState<"home" | "match" | "practice">("home");
  const [directStory, setDirectStory] = useState(false);
  const [entry, setEntry] = useState<"collection" | null>(null);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [dest, directStory, entry, started]);

  useEffect(() => {
    bootLang();
    setSaveExists(hasSave());
    setBooted(true);
    // 荣誉室 shows 账号登录情况, so the session has to be recorded when it
    // starts rather than reconstructed later. Play time only accrues while the
    // tab is actually visible — a game left open overnight did not get played.
    recordSession();
    let since = Date.now();
    const flush = () => {
      const now = Date.now();
      addPlaySeconds((now - since) / 1000);
      since = now;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else since = Date.now();
    };
    const id = window.setInterval(flush, 60_000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  if (!booted) {
    return <div className="min-h-dvh bg-paper" />;
  }

  if (entry === "collection") return <StoryCollection onBack={() => setEntry(null)} />;

  if (directStory)
    return (
      <StoryGateway
        onBack={() => {
          setDirectStory(false);
        }}
      />
    );

  if (dest === "home") {
    return (
      <MapHome
        hasSave={saveExists}
        onContinue={() => {
          bootFromStorage();
          setDest("match");
        }}
        onStory={() => {
          unlockAudio();
          sfxClick();
          setDirectStory(true);
        }}
        onMatch={() => {
          unlockAudio();
          sfxClick();
          setDest("match");
        }}
        onPractice={() => {
          unlockAudio();
          sfxClick();
          setDest("practice");
        }}
        onCollection={() => setEntry("collection")}
      />
    );
  }

  if (!started) {
    return (
      <TitleScreen
        onBack={() => setDest("home")}
        hasSave={saveExists}
        onContinue={() => {
          bootFromStorage();
        }}
      />
    );
  }

  return (
    <Shell initialView={dest === "practice" ? "solo" : "lobby"} onHome={() => setDest("home")} />
  );
}

function StoryGateway({ onBack }: { onBack: () => void }) {
  const screen = useStory((s) => s.screen);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);
  return (
    <div className="cabinet-shell">
      {screen === "briefing" ? (
        <StoryBriefing />
      ) : screen === "playing" ? (
        <StoryRoom />
      ) : screen === "debrief" ? (
        <>
          <StoryRoom />
          <StoryDebrief onExit={() => {}} />
        </>
      ) : (
        <StoryPicker onBack={onBack} />
      )}
    </div>
  );
}

/**
 * What the player is looking at once they are in.
 *
 * The lobby is the front door, not the practice ground. This is a team game
 * now, and landing in a solo economy with a "compete" button at the bottom
 * buried the mode the whole thing is built around.
 */
type View = "lobby" | "solo";

function Shell({
  initialView = "lobby",
  onHome,
}: {
  initialView?: View;
  onHome: () => void;
}) {
  const [view, setView] = useState<View>(initialView);
  const phase = useMatch((s) => s.phase);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view, phase]);

  if (phase === "intro") {
    return (
      <>
        <MatchDesk />
        <RoundIntro />
      </>
    );
  }
  if (phase === "round") return <MatchDesk />;
  if (phase === "roundResult") {
    return (
      <>
        <MatchDesk />
        <RoundResult />
      </>
    );
  }
  if (phase === "matchResult") {
    return (
      <>
        <MatchDesk />
        <MatchOver onExit={() => setView("lobby")} />
      </>
    );
  }
  if (view === "lobby") {
    return <MatchLobby onPractice={() => setView("solo")} onHome={onHome} />;
  }
  return <PlayScreen onCompete={() => setView("lobby")} />;
}

/** Back to the lobby, parked above the dock on the practice screen. */
function CompeteButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => {
        sfxClick();
        onClick();
      }}
      className="fixed inset-x-0 bottom-16 z-30 mx-auto flex w-[min(28rem,calc(100%-1.5rem))] items-center justify-center gap-2 rounded-[3px] border border-brass-deep bg-brass px-4 py-3 text-sm font-extrabold tracking-[0.06em] text-paper-deep transition-colors hover:bg-brass-bright active:scale-[0.99] sm:bottom-14"
    >
      <Swords className="size-4" aria-hidden />
      {t("mm.backToLobby")}
    </button>
  );
}

function PlayScreen({ onCompete }: { onCompete: () => void }) {
  const tutorial = useGame((s) => s.tutorial);
  const over = useGame((s) => s.gameOver);
  const toast = useGame((s) => s.lastToast);
  const en = useI18n((s) => s.lang) === "en";
  const economy = useMemo(() => {
    const e = createEconomy();
    e.capacity = { materials: 1.5, industry: 1.75, transport: 1.5 };
    e.sales = 5.5;
    return e;
  }, []);

  useEffect(() => {
    unlockAudio();
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const st = useGame.getState();
      if (st.started && !st.gameOver && st.speed > 0) {
        acc += dt;
        const step = HOUR_SECONDS / st.speed;
        while (acc >= step) {
          acc -= step;
          useGame.getState().tickHour();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const save = () => useGame.getState().persist();
    const id = window.setInterval(save, 8000);
    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", save);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, []);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-paper">
      {/* Vic3 sandbox: the practice desk sits on the living 3D map. */}
      <div
        className="fixed inset-0 z-0 [&_.strategic-atlas]:h-full [&_.atlas-viewport]:aspect-auto [&_.atlas-viewport]:h-full"
      >
        <StoryAtlas economy={economy} pressure={0.2} en={en} decorative zoomable />
      </div>
      {/* Paper fog: edges stay veiled, the middle clears so the map reads. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(95%_80%_at_50%_45%,transparent_0%,color-mix(in_oklab,var(--color-paper)_16%,transparent)_58%,color-mix(in_oklab,var(--color-paper)_52%,transparent)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] bg-gradient-to-b from-paper/35 via-transparent to-paper/50"
      />
      <div className="relative z-10">
        <PlaceMenu />
      </div>
      <CompeteButton onClick={onCompete} />
      <HudBar />
      <NewsTicker />
      <Dock />
      <PanelHost />
      {toast ? <Toast key={toast.id} zh={toast.zh} en={toast.en} tone={toast.tone} /> : null}
      {tutorial > 0 ? <Tutorial /> : null}
      {over ? <GameOver kind={over} /> : null}
    </div>
  );
}

function Toast({ zh, en, tone }: { zh: string; en: string; tone: string }) {
  const lang = useI18n((s) => s.lang);
  const clearToast = useGame((s) => s.clearToast);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-28 z-50 flex justify-center px-3 sm:top-24">
      <button
        type="button"
        onClick={clearToast}
        className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-[3px] border px-4 py-2 text-sm font-semibold shadow-[var(--shadow-border)] ${
          tone === "bad"
            ? "border-down bg-down text-paper-deep"
            : tone === "good"
              ? "border-up bg-up text-paper-deep"
              : "border-line bg-surface text-ink"
        }`}
      >
        <span>{lang === "en" ? en : zh}</span>
        <X className="size-4 shrink-0 opacity-70" aria-hidden />
      </button>
    </div>
  );
}

function Tutorial() {
  const t = useT();
  const dismiss = useGame((s) => s.dismissTutorial);
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-ink/20 p-3 sm:items-center">
      <div className="panel-shell max-w-md p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">{t("tut.title")}</h2>
          <LangToggle full />
        </div>
        <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-ink-soft">
          <li>{t("tut.1")}</li>
          <li>{t("tut.2")}</li>
          <li>{t("tut.3")}</li>
          <li>{t("tut.4")}</li>
        </ol>
        <Button className="mt-5 w-full" onClick={dismiss}>
          {t("tut.ok")}
        </Button>
      </div>
    </div>
  );
}

function GameOver({ kind }: { kind: "bust" | "retire" | "depression" }) {
  const t = useT();
  const nw = useGame((s) => netWorth(s));
  const reset = useGame((s) => s.reset);
  const name = useGame((s) => s.name);
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/35 p-4">
      <div className="vic-cert max-w-md p-8 text-center">
        <p className="vic-kicker">
          {kind === "bust" ? "MARGIN CALL" : kind === "depression" ? "DEPRESSION" : "EXIT"}
        </p>
        <h2 className="vic-letterpress mt-2 font-display text-3xl font-semibold">
          {kind === "bust"
            ? t("over.bust")
            : kind === "depression"
              ? t("over.depression")
              : t("over.retire", { name })}
        </h2>
        <p className="mt-3 text-sm text-muted">{t("over.nav", { n: compactUsd(nw) })}</p>
        <div className="vic-divider" aria-hidden />
        <Button className="w-full" onClick={reset}>
          {t("over.again")}
        </Button>
      </div>
    </div>
  );
}
