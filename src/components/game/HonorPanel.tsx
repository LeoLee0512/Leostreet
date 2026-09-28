import { useMemo } from "react";
import { Award, Trophy } from "lucide-react";
import { WaxSeal3D } from "@/components/3d";
import { compactUsd } from "@/lib/game/format";
import { ledgerOf, readHonor, winRate, winRateByRole, type Bout } from "@/lib/game/honor";
import { useGame } from "@/lib/game/store";
import { readRanked, tierOf } from "@/lib/match/rating";
import { ROLES, ROLE_IDS } from "@/lib/match/roles";
import { heldAchievements, heldTitles, readStoryProgress } from "@/lib/story/progress";
import { ROLE_LABEL, SCENARIOS, seatLabelOf, STORY_ROLES } from "@/lib/story/scenarios";
import { isUnlocked } from "@/lib/story/difficulty";
import { lengthOf } from "@/lib/story/lengths";
import { readLogin } from "./LoginCard";
import { PanelShell } from "./PanelShell";
import { useI18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * 荣誉室 — the record page.
 *
 * Everything here is read-only and descriptive. It grants nothing and unlocks
 * nothing: the moment a stats page can hand out a reward it stops being a
 * record and becomes another progression system to grind.
 *
 * Two deliberate choices worth knowing about:
 *
 * - A win rate with nothing behind it shows a dash, never 0%. A fresh account
 *   has not lost every game; it has not played one.
 * - The company row only appears for a player who actually started something.
 *   For everybody else there is no company, and "公司欠债: 0" is noise.
 */
export function HonorPanel() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const en = lang === "en";
  const game = useGame();

  // Read once per open: none of this changes while the panel is on screen.
  const honor = useMemo(() => readHonor(), []);
  const ranked = useMemo(() => readRanked(), []);
  const story = useMemo(() => readStoryProgress(), []);
  const login = useMemo(() => readLogin(), []);

  const overall = winRate(honor.bouts);
  const matchRoles = winRateByRole(honor.bouts, "match");
  const storyRoles = winRateByRole(honor.bouts, "story");
  const ledger = ledgerOf(game);
  const titles = heldTitles(story);
  const awards = heldAchievements(story);
  const tier = tierOf(ranked.rating);

  return (
    <PanelShell title={t("hon.title")} subtitle={t("hon.sub")}>
      {/* The headline: what you win, and where you sit. */}
      <div className="rounded-[3px] border border-ink-soft bg-ink px-4 py-3 text-paper shadow-[inset_0_0_0_2px_var(--color-ink),inset_0_0_0_3px_var(--color-brass),0_2px_6px_#3a2c1833]">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-paper/60">{t("hon.overall")}</p>
            <p className="font-display text-3xl font-semibold tabular-nums">
              {overall.rate === null ? "—" : `${Math.round(overall.rate * 100)}%`}
            </p>
            <p className="text-[11px] text-paper/70">
              {overall.rate === null
                ? t("hon.none")
                : t("hon.record", { w: overall.won, p: overall.played })}
            </p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <WaxSeal3D size={46} glyph="✦" className="shrink-0" />
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-paper/60">{t("mm.rank")}</p>
              <p className="font-display text-lg font-semibold">
                {en ? tier.nameEn : tier.nameZh} · {ranked.rating}
              </p>
            </div>
          </div>
        </div>
        {titles.length > 0 || awards.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-paper/15 pt-3">
            {titles.map((tt) => (
              <Chip key={tt.id} icon={<Trophy className="size-3" aria-hidden />}>
                {en ? tt.nameEn : tt.nameZh}
              </Chip>
            ))}
            {awards.map((a) => (
              <Chip key={a.id} icon={<Award className="size-3" aria-hidden />}>
                {en ? a.nameEn : a.nameZh}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      {/* 账号登录情况 */}
      <Section title={t("hon.account")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Cell
            k={t("hon.channel")}
            v={
              login === null
                ? t("hon.channelNone")
                : login.channel === "guest"
                  ? t("hon.channelGuest")
                  : t("hon.channelScan")
            }
          />
          <Cell k={t("title.id")} v={game.playerId} mono />
          <Cell k={t("hon.sessions")} v={t("hon.times", { n: honor.login.sessions })} />
          <Cell k={t("hon.firstAt")} v={stamp(honor.login.firstAt, lang)} />
          <Cell k={t("hon.lastAt")} v={stamp(honor.login.lastAt, lang)} />
          <Cell k={t("hon.streak")} v={t("hon.days", { n: honor.login.streak })} />
          <Cell k={t("hon.bestStreak")} v={t("hon.days", { n: honor.login.bestStreak })} />
          <Cell
            k={t("hon.playtime")}
            v={t("hon.hours", { n: (honor.login.seconds / 3600).toFixed(1) })}
          />
        </div>
      </Section>

      {/* 不同职别下的胜率 */}
      <Section title={t("hon.byRole")}>
        <p className="mb-1.5 text-[11px] font-bold tracking-wide text-muted">{t("hon.byRoleMatch")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ROLE_IDS.map((id) => {
            const w = matchRoles[id];
            return (
              <RoleCell
                key={id}
                name={en ? ROLES[id].nameEn : ROLES[id].nameZh}
                played={w?.played ?? 0}
                won={w?.won ?? 0}
                rate={w?.rate ?? null}
                none={t("hon.noRole")}
              />
            );
          })}
        </div>
        <p className="mb-1.5 mt-3 text-[11px] font-bold tracking-wide text-muted">{t("hon.byRoleStory")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STORY_ROLES.map((id) => {
            const w = storyRoles[id];
            // The generic name, not any one crisis's: this figure is summed
            // across all ten, and calling the column "clearing house chairman"
            // because 1907 happens to be first would be wrong nine times out
            // of ten.
            const label = ROLE_LABEL[id];
            return (
              <RoleCell
                key={id}
                name={en ? label.en : label.zh}
                played={w?.played ?? 0}
                won={w?.won ?? 0}
                rate={w?.rate ?? null}
                none={t("hon.noRole")}
              />
            );
          })}
        </div>
      </Section>

      {/* 总资产 / 净资产 / 个人欠债 / 公司欠债 */}
      <Section title={t("hon.ledger")}>
        <div className="grid grid-cols-2 gap-2">
          <Cell k={t("hon.totalAssets")} v={compactUsd(ledger.totalAssets)} big />
          <Cell k={t("hon.netWorth")} v={compactUsd(ledger.netWorth)} big />
          <Cell k={t("hon.liquid")} v={compactUsd(ledger.liquid)} />
          <Cell
            k={t("hon.personalDebt")}
            v={compactUsd(ledger.personalDebt)}
            tone={ledger.personalDebt > 0 ? "down" : undefined}
            note={t("hon.personalParts", {
              a: compactUsd(ledger.personalParts.bankLoan),
              b: compactUsd(ledger.personalParts.mortgage),
              c: compactUsd(ledger.personalParts.margin),
            })}
          />
        </div>
        {ledger.hasVenture ? (
          <div className="mt-2">
            <Cell
              k={t("hon.companyDebt")}
              v={compactUsd(ledger.companyDebt)}
              tone={ledger.companyDebt > 0 ? "down" : undefined}
              note={t("hon.companyParts", {
                a: compactUsd(ledger.companyParts.clientAum),
                b: compactUsd(ledger.companyParts.investors),
              })}
            />
          </div>
        ) : (
          <p className="mt-2 rounded-[3px] border border-line/80 bg-paper px-3 py-2 text-[11px] leading-relaxed text-muted">
            {t("hon.noCompany")}
          </p>
        )}
      </Section>

      {/* 危机阶梯 */}
      <Section title={t("hon.ladder")}>
        <p className="mb-2 text-[11px] font-bold text-muted">
          {t("sc.cleared", { n: story.cleared.length, of: SCENARIOS.length })}
        </p>
        <div className="flex flex-wrap gap-1">
          {SCENARIOS.map((s) => {
            const done = story.cleared.includes(s.id);
            const best = story.best[s.id];
            // A crisis the player has not reached keeps its name, the same way
            // it does on the picker. A record page that spoils the ladder is
            // not being helpful.
            const open = isUnlocked(s.id, story.cleared);
            const name = open ? (en ? s.nameEn : s.nameZh) : "??????";
            return (
              <span
                key={s.id}
                className={cn(
                  "rounded-[2px] border px-2 py-1 text-[10px] font-extrabold",
                  done ? "border-up/60 bg-up text-paper" : "border-line/70 bg-paper text-muted",
                )}
                title={open ? name : undefined}
              >
                {name}
                {done && best ? ` · ${en ? lengthOf(best).clockEn : lengthOf(best).clockZh}` : ""}
              </span>
            );
          })}
        </div>
        {awards.length === 0 ? (
          <p className="mt-2 text-[11px] leading-relaxed text-muted">{t("hon.awardsNone")}</p>
        ) : null}
      </Section>

      {/* 历史对局 */}
      <Section title={t("hon.history")}>
        {honor.bouts.length === 0 ? (
          <p className="text-[12px] text-muted">{t("hon.historyNone")}</p>
        ) : (
          <ul className="border-y-[3px] border-double border-brass/60">
            {honor.bouts.slice(0, 30).map((b) => (
              <BoutRow key={b.id} bout={b} en={en} t={t} lang={lang} />
            ))}
          </ul>
        )}
      </Section>
    </PanelShell>
  );
}

function BoutRow({
  bout,
  en,
  t,
  lang,
}: {
  bout: Bout;
  en: boolean;
  t: (k: string, v?: Record<string, string | number>) => string;
  lang: string;
}) {
  const scenario = SCENARIOS.find((s) => s.id === bout.tag);
  const what =
    bout.kind === "story"
      ? scenario
        ? en
          ? scenario.nameEn
          : scenario.nameZh
        : t("hon.storyTag")
      : t("hon.matchTag");
  const seat =
    bout.kind === "story"
      ? scenario
        ? en
          ? seatLabelOf(scenario, bout.role as never).en
          : seatLabelOf(scenario, bout.role as never).zh
        : bout.role
      : matchSeatName(bout.role, en);
  return (
    <li className="flex items-center gap-2 border-b border-line/60 px-1 py-1.5 last:border-b-0">
      <span
        aria-hidden
        className="vic-wax shrink-0"
        style={{ width: 22, height: 22, fontSize: 10 }}
      >
        {bout.won ? "✓" : "✕"}
      </span>
      <span
        className={cn(
          "shrink-0 rounded-[2px] border px-1.5 py-0.5 text-[10px] font-extrabold",
          bout.won ? "border-up/60 text-up" : "border-down/60 text-down",
        )}
      >
        {bout.won ? t("hon.win") : t("hon.loss")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold">{what}</span>
        <span className="block truncate text-[10px] text-muted">
          {seat} · {bout.note}
          {!bout.rated ? ` · ${t("mm.practice")}` : ""}
        </span>
      </span>
      {typeof bout.delta === "number" && bout.delta !== 0 ? (
        <span
          className={cn(
            "shrink-0 font-mono text-[11px] font-bold tabular-nums",
            bout.delta > 0 ? "text-up" : "text-down",
          )}
        >
          {bout.delta > 0 ? "+" : ""}
          {bout.delta}
        </span>
      ) : null}
      <span className="shrink-0 font-mono text-[10px] text-muted">{stamp(bout.at, lang, true)}</span>
    </li>
  );
}

/** A match seat's name, or the raw id for a seat that no longer ships. */
function matchSeatName(role: string, en: boolean): string {
  const spec = ROLE_IDS.includes(role as (typeof ROLE_IDS)[number])
    ? ROLES[role as (typeof ROLE_IDS)[number]]
    : null;
  if (!spec) return role;
  return en ? spec.nameEn : spec.nameZh;
}

function stamp(at: number, lang: string, short = false): string {
  if (!at) return "—";
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (short) return lang === "en" ? `${pad(d.getMonth() + 1)}/${pad(d.getDate())}` : date.slice(5);
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="vic-kicker mb-2 border-b-[3px] border-double border-brass/60 pb-1">{title}</h2>
      {children}
    </section>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-paper/15 px-2 py-0.5 text-[11px] font-extrabold">
      {icon}
      {children}
    </span>
  );
}

function Cell({
  k,
  v,
  note,
  tone,
  big,
  mono,
}: {
  k: string;
  v: string;
  note?: string;
  tone?: "up" | "down";
  big?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[3px] border border-line/80 bg-paper px-3 py-2 shadow-[inset_0_1px_0_#ffffff59]">
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-brass-deep">{k}</p>
      <p
        className={cn(
          "font-mono font-semibold tabular-nums",
          big ? "text-base" : "text-sm",
          mono && "break-all text-[11px]",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
        )}
      >
        {v}
      </p>
      {note ? <p className="mt-0.5 text-[10px] leading-tight text-muted">{note}</p> : null}
    </div>
  );
}

function RoleCell({
  name,
  played,
  won,
  rate,
  none,
}: {
  name: string;
  played: number;
  won: number;
  rate: number | null;
  none: string;
}) {
  return (
    <div className="rounded-[3px] border border-line/80 bg-paper px-3 py-2 shadow-[inset_0_1px_0_#ffffff59]">
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-brass-deep">{name}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">
        {rate === null ? "—" : `${Math.round(rate * 100)}%`}
      </p>
      <p className="text-[10px] text-muted">{played === 0 ? none : `${won} / ${played}`}</p>
    </div>
  );
}
