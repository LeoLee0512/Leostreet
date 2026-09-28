import { useState, type ReactNode } from "react";
import { FlaskConical, Landmark, Megaphone, Shuffle, UserRound, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfxClick, sfxGood, unlockAudio } from "@/lib/game/audio";
import { randomPlayerId } from "@/lib/game/math";
import { readProgress } from "@/lib/game/progress";
import { useGame } from "@/lib/game/store";
import type { Career, CountryId, Gender } from "@/lib/game/types";
import { useI18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Figure3D } from "@/components/3d/Figure3D";
import { LangToggle } from "./LangToggle";
import { LoginCard, readLogin } from "./LoginCard";

export function TitleScreen({
  hasSave,
  onContinue,
  onBack,
}: {
  hasSave: boolean;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const t = useT();
  const en = useI18n((s) => s.lang) === "en";
  const start = useGame((s) => s.start);
  const [name, setName] = useState(() => readLogin()?.name ?? "");
  const [playerId, setPlayerId] = useState("");
  const [idWarn, setIdWarn] = useState(false);
  const [career, setCareer] = useState<Career>("retail");
  const [gender, setGender] = useState<Gender>("male");
  const [home, setHome] = useState<CountryId>("leo");
  const [step, setStep] = useState<"form" | "country">("form");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [sandboxHint, setSandboxHint] = useState(false);
  const [prog] = useState(() =>
    typeof window === "undefined"
      ? { brokerUnlocked: false, governorUnlocked: false, owned: [], activeTitle: "" }
      : readProgress(),
  );

  return (
    <div className="strategy-register relative min-h-dvh overflow-x-hidden overflow-y-auto bg-paper text-ink">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="cabinet-secondary absolute right-4 top-4 z-20"
        >
          {en ? "Main menu" : "返回主菜单"}
        </button>
      )}
      <button
        type="button"
        aria-label={t("notice.open")}
        title={t("notice.open")}
        onClick={() => {
          sfxClick();
          setNoticeOpen(true);
        }}
        className="absolute left-4 top-4 z-20 grid size-12 place-items-center border border-line bg-surface text-ink"
      >
        <Megaphone className="pointer-events-none relative size-5" aria-hidden />
      </button>
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col justify-start px-4 pb-8 pt-16 sm:justify-center sm:pt-16">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold tracking-[0.22em] text-teal-deep">
              {t("game.kicker")}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ink sm:text-4xl">
              {en ? "Match & practice desk" : "对战与练习档案"}
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
              {en
                ? "Set up your player profile for matches and the trading practice ground."
                : "建立用于对战与交易练习的玩家档案。剧情战从主菜单独立进入。"}
            </p>
          </div>
          <LangToggle full />
        </div>

        <div className="panel-shell p-5 sm:p-6">
          {step === "country" ? (
            <>
              <p className="text-xs font-bold tracking-wide text-muted">{t("title.openIn")}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{t("title.openFee")}</p>
              <div className="mt-3 grid gap-2">
                {(["leo", "ramona", "david"] as CountryId[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      sfxClick();
                      setHome(c);
                    }}
                    className={cn(
                      "rounded-[3px] border px-4 py-3 text-left transition-colors duration-150",
                      home === c
                        ? "border-brass bg-teal-soft text-ink shadow-[inset_0_0_0_1px_var(--color-brass-deep)]"
                        : "border-line bg-surface text-ink-soft hover:border-brass-deep",
                    )}
                  >
                    <p className="font-extrabold tracking-[0.06em]">{t(`world.${c}`)}</p>
                    <p className={cn("mt-1 text-xs", home === c ? "text-muted" : "text-muted")}>
                      {t(`title.tz.${c}`)}
                    </p>
                  </button>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <Button className="flex-1" variant="secondary" onClick={() => setStep("form")}>
                  {t("title.back")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    unlockAudio();
                    sfxGood();
                    start(name, career, playerId, gender, home);
                  }}
                >
                  {t("title.openGo", { n: t(`world.${home}Short`) })}
                </Button>
              </div>
            </>
          ) : (
            <>
              <LoginCard onName={setName} />

              <p className="mt-4 text-xs font-bold tracking-wide text-muted">{t("title.look")}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <LookCard
                  active={gender === "male"}
                  gender="male"
                  title={t("title.male")}
                  onClick={() => {
                    sfxClick();
                    setGender("male");
                  }}
                />
                <LookCard
                  active={gender === "female"}
                  gender="female"
                  title={t("title.female")}
                  onClick={() => {
                    sfxClick();
                    setGender("female");
                  }}
                />
              </div>

              <label
                className="mt-4 block text-xs font-bold tracking-wide text-muted"
                htmlFor="display-name"
              >
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

              <label
                className="mt-4 block text-xs font-bold tracking-wide text-muted"
                htmlFor="player-id"
              >
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
              <p
                className={cn(
                  "mt-1 text-[11px]",
                  idWarn ? "font-semibold text-down" : "text-muted",
                )}
              >
                {idWarn ? t("title.idBad") : t("title.idHint")}
              </p>

              <p className="mt-5 text-xs font-bold tracking-wide text-muted">{t("title.career")}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <CareerCard
                  active={career === "retail"}
                  icon={<UserRound className="size-5" />}
                  title={t("title.retail")}
                  cash={t("title.retailCash")}
                  blurb={t("title.retailBlurb")}
                  onClick={() => {
                    sfxClick();
                    setCareer("retail");
                  }}
                />
                <CareerCard
                  active={career === "broker"}
                  locked={!prog.brokerUnlocked}
                  icon={<Landmark className="size-5" />}
                  title={t("title.broker")}
                  cash={t("title.brokerCash")}
                  blurb={prog.brokerUnlocked ? t("title.brokerBlurb") : t("title.brokerLock")}
                  onClick={() => {
                    if (!prog.brokerUnlocked) return;
                    sfxClick();
                    setCareer("broker");
                  }}
                />
              </div>
              {prog.governorUnlocked ? (
                <div className="mt-2">
                  <CareerCard
                    active={career === "governor"}
                    icon={<Crown className="size-5" />}
                    title={t("title.gov")}
                    blurb={t("title.govBlurb")}
                    onClick={() => {
                      sfxClick();
                      setCareer("governor");
                    }}
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  sfxClick();
                  setSandboxHint((v) => !v);
                }}
                className="mt-3 flex w-full items-center justify-between gap-2 rounded-[3px] border border-dashed border-line bg-surface px-3 py-2.5 text-left transition-colors duration-150 hover:border-brass-deep active:scale-[0.99]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FlaskConical className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{t("sandbox.title")}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">
                      {t("sandbox.note")}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-ink px-2 py-1 text-[10px] font-extrabold text-paper">
                  {t("sandbox.badge")}
                </span>
              </button>
              {sandboxHint ? (
                <p className="mt-1.5 rounded-[3px] border border-line bg-paper-deep px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
                  {t("sandbox.hint")}
                </p>
              ) : null}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={() => {
                    sfxClick();
                    setStep("country");
                  }}
                >
                  {t("game.enter")}
                </Button>
                {hasSave ? (
                  <Button
                    className="flex-1"
                    size="lg"
                    variant="secondary"
                    onClick={() => {
                      unlockAudio();
                      sfxClick();
                      onContinue();
                    }}
                  >
                    {t("game.continue")}
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </main>
      {noticeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4">
          <div className="panel-shell max-h-[80dvh] w-full max-w-md overflow-y-auto p-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#f6d365] to-[#c98f2b] text-[#5c3a10] shadow-[2px_3px_0_#3d2414]">
                <Megaphone className="size-4" aria-hidden />
              </span>
              <h2 className="font-display text-2xl font-semibold">{t("notice.title")}</h2>
            </div>
            <p className="text-xs leading-relaxed text-muted">{t("notice.sub")}</p>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-ink-soft">
              <li>{t("notice.1")}</li>
              <li>{t("notice.2")}</li>
              <li>{t("notice.3")}</li>
              <li>{t("notice.4")}</li>
              <li>{t("notice.5")}</li>
              <li>{t("notice.6")}</li>
            </ol>
            <Button
              className="mt-5 w-full"
              onClick={() => {
                sfxClick();
                setNoticeOpen(false);
              }}
            >
              {t("tut.ok")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LookCard({
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center rounded-[3px] px-2 pb-3 pt-2 text-center transition-colors duration-150 active:scale-[0.99]",
        active
          ? "border border-brass bg-teal-soft text-ink shadow-[inset_0_0_0_1px_var(--color-brass-deep)]"
          : "border border-line bg-surface text-ink-soft hover:border-brass-deep",
      )}
    >
      <Figure3D
        variant={gender === "female" ? "woman" : "man"}
        size={88}
        className="mx-auto sm:hidden"
      />
      <Figure3D
        variant={gender === "female" ? "woman" : "man"}
        size={112}
        className="mx-auto hidden sm:block"
      />
      <span className="mt-1 text-sm font-extrabold tracking-[0.08em]">{title}</span>
    </button>
  );
}

function CareerCard({
  active,
  icon,
  title,
  cash,
  blurb,
  onClick,
  locked,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  cash?: string;
  blurb: string;
  onClick: () => void;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={cn(
        "rounded-[3px] border p-3 text-left transition-colors duration-150 active:scale-[0.99]",
        locked
          ? "border-line bg-surface/60 text-muted"
          : active
            ? "border-brass bg-teal-soft text-ink shadow-[inset_0_0_0_1px_var(--color-brass-deep)]"
            : "border-line bg-surface text-ink-soft hover:border-brass-deep",
      )}
    >
      <div className="flex items-center gap-2 text-sm font-bold">
        {icon}
        {title}
        {locked ? <span className="ml-auto text-[10px]">{locked ? "LOCK" : ""}</span> : null}
      </div>
      {cash && !locked ? (
        <p className="mt-1.5 text-sm font-extrabold tabular-nums text-ink">
          {cash}
        </p>
      ) : null}
      <p
        className={cn(
          "mt-1.5 text-xs leading-relaxed",
          active && !locked ? "text-ink-soft" : "text-muted",
        )}
      >
        {blurb}
      </p>
    </button>
  );
}
