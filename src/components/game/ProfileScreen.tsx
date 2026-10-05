import { useState } from "react";
import { Check, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfxClick, sfxGood, unlockAudio } from "@/lib/game/audio";
import { randomPlayerId } from "@/lib/game/math";
import { useI18n, useT } from "@/lib/i18n";
import { DEFAULT_NAME, type Gender, type Profile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { BankerPortrait, PORTRAITS } from "./BankerPortrait";
import { LangToggle } from "./LangToggle";
import { LoginCard, readLogin } from "./LoginCard";

/** The governor's file: name, player id and portrait, set before the first game. */
export function ProfileScreen({
  initial,
  onBack,
  onDone,
}: {
  initial: Profile | null;
  onBack: () => void;
  onDone: (profile: Profile) => void;
}) {
  const t = useT();
  const en = useI18n((s) => s.lang) === "en";
  const [name, setName] = useState(() => initial?.name ?? readLogin()?.name ?? "");
  const [playerId, setPlayerId] = useState(() => initial?.playerId ?? "");
  const [idWarn, setIdWarn] = useState(false);
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "male");

  return (
    <div className="strategy-register relative min-h-dvh overflow-x-hidden overflow-y-auto bg-paper text-ink">
      <button
        type="button"
        onClick={() => {
          sfxClick();
          onBack();
        }}
        className="vic-btn-ghost absolute right-4 top-4 z-20 whitespace-nowrap"
        style={{ background: "var(--color-surface)" }}
      >
        {en ? "Main menu" : "返回主菜单"}
      </button>
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col justify-start px-4 pb-8 pt-16 sm:justify-center">
        <header className="mb-5">
          <div className="flex items-center justify-between gap-3">
            <p className="vic-kicker">{t("game.kicker")}</p>
            <LangToggle full className="shrink-0" />
          </div>
          <div className="vic-divider" aria-hidden />
          <h1 className="vic-letterpress text-center text-3xl font-semibold tracking-wide sm:text-4xl">
            {en ? "The Governor's File" : "行长档案"}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-ink-soft">
            {en
              ? "Before you take the chair at the central bank, sign the register."
              : "执掌中央银行之前，请先在名册上落款。"}
          </p>
        </header>

        <div className="vic-panel vic-frame p-5 sm:p-6">
          <LoginCard onName={setName} />

          <p className="mt-5 text-xs font-bold tracking-wide text-muted">{t("title.look")}</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(["male", "female"] as Gender[]).map((g) => (
              <PortraitCard
                key={g}
                gender={g}
                active={gender === g}
                title={t(g === "male" ? "title.male" : "title.female")}
                onClick={() => {
                  sfxClick();
                  setGender(g);
                }}
              />
            ))}
          </div>

          <label className="mt-5 block text-xs font-bold tracking-wide text-muted" htmlFor="display-name">
            {t("title.name")}
          </label>
          <input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 h-11 w-full rounded-[3px] border border-line bg-surface px-3 text-base font-semibold shadow-[inset_0_0_0_1px_var(--color-paper-deep)] outline-none focus:border-brass focus:shadow-[inset_0_0_0_1px_var(--color-brass-deep)]"
            maxLength={16}
            placeholder={t("title.namePh")}
          />
          <p className="mt-1 text-[11px] text-muted">{t("title.nameHint")}</p>

          <label className="mt-4 block text-xs font-bold tracking-wide text-muted" htmlFor="player-id">
            {t("title.id")}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="player-id"
              value={playerId}
              onChange={(e) => {
                const raw = e.target.value;
                const clean = raw.replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
                setIdWarn(raw !== clean);
                setPlayerId(clean);
              }}
              className="h-11 min-w-0 flex-1 rounded-[3px] border border-line bg-surface px-3 font-mono text-sm font-semibold shadow-[inset_0_0_0_1px_var(--color-paper-deep)] outline-none focus:border-brass focus:shadow-[inset_0_0_0_1px_var(--color-brass-deep)]"
              maxLength={16}
              placeholder={t("title.idPh")}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <Button
              type="button"
              variant="secondary"
              className="h-11 shrink-0 px-3"
              onClick={() => {
                sfxClick();
                setIdWarn(false);
                setPlayerId(randomPlayerId());
              }}
            >
              <Shuffle className="size-4" />
              {t("title.reroll")}
            </Button>
          </div>
          <p className={cn("mt-1 text-[11px]", idWarn ? "font-semibold text-down" : "text-muted")}>
            {idWarn ? t("title.idBad") : t("title.idHint")}
          </p>

          <Button
            className="mt-6 w-full"
            size="lg"
            onClick={() => {
              unlockAudio();
              sfxGood();
              onDone({ name: name.trim() || DEFAULT_NAME, playerId: playerId || randomPlayerId(), gender });
            }}
          >
            {en ? "Sign the register" : "落款入册"}
          </Button>
        </div>
      </main>
    </div>
  );
}

function PortraitCard({
  active,
  gender,
  title,
  onClick,
}: {
  active: boolean;
  gender: Gender;
  title: string;
  onClick: () => void;
}) {
  const variant = gender === "female" ? "woman" : "man";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center overflow-hidden rounded-[4px] border pb-3 text-center transition-[border-color,box-shadow,transform] duration-200 active:scale-[0.99]",
        active
          ? "border-brass-deep shadow-[inset_0_0_0_1px_var(--color-brass),0_6px_18px_-8px_#3a2c1866]"
          : "border-line hover:-translate-y-0.5 hover:border-brass-deep",
      )}
      style={{
        background: active
          ? "radial-gradient(ellipse 70% 60% at 50% 38%, #fff6df 0%, var(--color-surface) 55%, var(--color-paper-deep) 100%)"
          : "radial-gradient(ellipse 70% 60% at 50% 38%, var(--color-surface) 0%, var(--color-paper) 100%)",
      }}
    >
      <BankerPortrait
        variant={variant}
        className={cn(
          "mx-auto mt-3 w-[78%] drop-shadow-[0_4px_6px_#3a2c1840] transition-[filter] duration-200",
          !active && "saturate-[0.6] brightness-95",
        )}
      />
      <span
        className={cn(
          "relative mt-2 inline-flex min-w-20 items-center justify-center rounded-[2px] border px-4 py-1 font-display text-sm font-bold tracking-[0.3em]",
          active
            ? "border-brass-deep bg-gradient-to-b from-[#ecd08a] to-[#b98f34] text-ink shadow-[inset_0_1px_0_#fff6]"
            : "border-line bg-surface text-ink-soft",
        )}
      >
        {title}
      </span>
      <span className="mt-1.5 text-[10px] italic tracking-wide text-muted">
        {PORTRAITS[variant].painter} · {PORTRAITS[variant].year}
      </span>
      {active ? (
        <span aria-hidden className="vic-wax absolute right-2 top-2 rounded-full" style={{ width: 28, height: 28 }}>
          <Check className="size-4" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}
