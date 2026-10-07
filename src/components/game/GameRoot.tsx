import { useEffect, useState } from "react";
import { addPlaySeconds, recordSession } from "@/lib/game/honor";
import { bootLang } from "@/lib/i18n";
import { readProfile, writeProfile, type Profile } from "@/lib/profile";
import { useStory } from "@/lib/story/store";
import { readAppearance } from "@/lib/story/engagement";
import { StoryPicker } from "@/components/story/StoryPicker";
import { StoryBriefing } from "@/components/story/StoryBriefing";
import { StoryRoom } from "@/components/story/StoryRoom";
import { StoryDebrief } from "@/components/story/StoryDebrief";
import { StoryCollection } from "@/components/story/StoryCollection";
import { SandboxScreen } from "@/components/sandbox/SandboxScreen";
import { MapHome } from "./MapHome";
import { ModeSelect } from "./ModeSelect";
import { ProfileScreen } from "./ProfileScreen";

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

type Screen = "home" | "profile" | "modes" | "sandbox" | "story" | "collection";

/**
 * Main menu → "Start game" → (first visit: the governor's file) → sandbox or
 * story. The sandbox is the central-banker campaign on the world map.
 */
function GameContent() {
  const [booted, setBooted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  useEffect(() => {
    bootLang();
    setProfile(readProfile());
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

  const home = () => setScreen("home");
  const modes = () => setScreen("modes");
  const signed = (p: Profile) => {
    setProfile(writeProfile(p));
    modes();
  };

  switch (screen) {
    case "collection":
      return <StoryCollection onBack={home} />;
    case "profile":
      return (
        <ProfileScreen
          initial={profile}
          onBack={home}
          onDone={signed}
        />
      );
    case "modes":
      return profile ? (
        <ModeSelect
          profile={profile}
          onSandbox={() => setScreen("sandbox")}
          onStory={() => setScreen("story")}
          onEditProfile={() => setScreen("profile")}
          onBack={home}
        />
      ) : (
        <ProfileScreen initial={null} onBack={home} onDone={signed} />
      );
    case "sandbox":
      return <SandboxScreen onBack={modes} />;
    case "story":
      return <StoryGateway onBack={modes} />;
    default:
      return (
        <MapHome
          onStart={() => setScreen(profile ? "modes" : "profile")}
          onCollection={() => setScreen("collection")}
        />
      );
  }
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
