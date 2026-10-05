import type { ReactNode } from "react";
import { Globe2, ScrollText } from "lucide-react";
import { sfxClick, unlockAudio } from "@/lib/game/audio";
import { useI18n, useT } from "@/lib/i18n";
import type { Profile } from "@/lib/profile";
import { BankerPortrait } from "./BankerPortrait";
import { LangToggle } from "./LangToggle";

/** After "Start game": the signed-in governor picks the sandbox or the story. */
export function ModeSelect({
  profile,
  onSandbox,
  onStory,
  onEditProfile,
  onBack,
}: {
  profile: Profile;
  onSandbox: () => void;
  onStory: () => void;
  onEditProfile: () => void;
  onBack: () => void;
}) {
  const t = useT();
  const en = useI18n((s) => s.lang) === "en";
  const pick = (go: () => void) => () => {
    unlockAudio();
    sfxClick();
    go();
  };

  return (
    <div className="strategy-register relative min-h-dvh overflow-x-hidden bg-paper text-ink">
      <button
        type="button"
        onClick={pick(onBack)}
        className="vic-btn-ghost absolute right-4 top-4 z-20 whitespace-nowrap"
        style={{ background: "var(--color-surface)" }}
      >
        {en ? "Main menu" : "返回主菜单"}
      </button>
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 pb-10 pt-20">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <p className="vic-kicker">{t("game.kicker")}</p>
            <LangToggle full className="shrink-0" />
          </div>
          <div className="vic-divider" aria-hidden />
          <div className="mt-2 flex items-center justify-center gap-4">
            <BankerPortrait
              variant={profile.gender === "female" ? "woman" : "man"}
              className="w-16 shrink-0 drop-shadow-[0_3px_4px_#3a2c1840]"
            />
            <div>
              <p className="text-xs tracking-[0.2em] text-muted">{en ? "GOVERNOR" : "行长"}</p>
              <h1 className="vic-letterpress text-3xl font-semibold">{profile.name}</h1>
              <button
                type="button"
                onClick={pick(onEditProfile)}
                className="mt-0.5 text-xs text-brass-deep underline decoration-dotted underline-offset-4 hover:text-ink"
              >
                {en ? "Edit file" : "修改档案"}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <ModeCard
            icon={<Globe2 className="size-7" aria-hidden />}
            kicker={en ? "SANDBOX" : "沙盒"}
            title={en ? "Govern a nation" : "执掌一国央行"}
            body={
              en
                ? "Choose a country on the world map and run its central bank as you see fit."
                : "在世界地图上选择一个国家，按你的方式执掌它的中央银行。"
            }
            onClick={pick(onSandbox)}
          />
          <ModeCard
            icon={<ScrollText className="size-7" aria-hidden />}
            kicker={en ? "STORY" : "剧情"}
            title={en ? "History of crises" : "危机历史"}
            body={
              en
                ? "Step into the crisis cabinet, one historical financial crisis at a time."
                : "进入危机内阁，一场一场穿过历史金融危机。"
            }
            seal
            onClick={pick(onStory)}
          />
        </div>
      </main>
    </div>
  );
}

function ModeCard({
  icon,
  kicker,
  title,
  body,
  seal = false,
  onClick,
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  body: string;
  seal?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="vic-panel vic-frame group flex flex-col items-center gap-3 px-6 py-8 text-center transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.99] sm:py-10"
    >
      <span
        className={`grid size-16 place-items-center rounded-full shadow-[var(--shadow-border)] ${
          seal ? "vic-wax" : "bg-gradient-to-b from-[#e7c46c] to-[#9c7224] text-surface"
        }`}
        style={seal ? { width: 64, height: 64 } : undefined}
      >
        {icon}
      </span>
      <span className="vic-kicker">{kicker}</span>
      <span className="font-display text-2xl font-semibold">{title}</span>
      <span className="max-w-xs text-sm leading-relaxed text-ink-soft">{body}</span>
    </button>
  );
}
