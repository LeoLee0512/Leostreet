import { ArrowRight, Factory, Landmark, Users } from "lucide-react";
import { WaxSeal3D } from "@/components/3d";
import { sfxGood } from "@/lib/game/audio";
import { scenarioOf, seatLabelOf, usableReserves } from "@/lib/story/scenarios";
import { gradeOf } from "@/lib/story/difficulty";
import { estimateMinutes, lengthOf } from "@/lib/story/lengths";
import { useStory } from "@/lib/story/store";
import { useI18n, useT } from "@/lib/i18n";

/**
 * 前情提要.
 *
 * Introduce the operating loop and time rules, then keep the fictional brief,
 * historical record and assigned objective visibly distinct. Historical detail
 * still follows the selected session length.
 */
export function StoryBriefing() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const { scenarioId, role, mode, length, run, begin } = useStory();
  const s = scenarioOf(scenarioId);
  const obj = s.objectives[role];
  const en = lang === "en";
  const grade = gradeOf(s.grade);
  const spec = lengthOf(length);
  const deep = en ? s.historyDeepEn : s.historyDeepZh;
  // The deeper tellings restore the rest of the file, one documented fact at a
  // time. At 半小时 this block is simply not there, which is what that telling
  // means.
  const extra = (deep ?? []).slice(
    0,
    spec.detail === 0 ? 0 : spec.detail === 1 ? 2 : spec.detail === 2 ? 4 : 99,
  );

  return (
    <div className="cabinet-shell min-h-dvh overflow-y-auto bg-paper px-4 pb-24 pt-6 text-ink sm:px-8 sm:pt-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="vic-masthead">
          <p className="vic-kicker">
            {s.year} · {en ? seatLabelOf(s, role).en : seatLabelOf(s, role).zh} ·{" "}
            {mode === "team" ? t("sc.team") : t("sc.solo")}
          </p>
          <h1 className="vic-letterpress mt-3 text-4xl font-semibold sm:text-5xl">
            {en ? s.nameEn : s.nameZh}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-paper"
              style={{ background: grade.tint }}
            >
              {en ? grade.nameEn : grade.nameZh}
            </span>
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-extrabold text-ink-soft">
              {en ? spec.clockEn : spec.clockZh} ·{" "}
              {t("sd.minutes", { n: estimateMinutes(s, length) })}
            </span>
            {spec.achievement ? (
              <span className="rounded-full border border-brass/40 bg-surface-2 px-2.5 py-0.5 text-[11px] font-extrabold text-brass-deep">
                {en ? spec.achievement.nameEn : spec.achievement.nameZh}
              </span>
            ) : null}
            {length === "epic" && s.crown ? (
              <span className="rounded-full bg-brass px-2.5 py-0.5 text-[11px] font-extrabold text-paper">
                {en ? s.crown.nameEn : s.crown.nameZh}
              </span>
            ) : null}
          </div>
        </header>
        {length === "epic" ? (
          <p className="mt-4 border border-down/30 bg-down/10 px-4 py-3 text-xs leading-relaxed text-down">
            {t("sc.epicWarn")}
          </p>
        ) : null}

        <Fold beginner={Boolean(run?.beginner)} en={en}>
        <section className="mt-6" aria-label={en ? "Your first decisions" : "开始后的三条决策线"}>
          <h2 className="vic-kicker">{en ? "THE CITY KEEPS MOVING" : "一座持续运转的城市"}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="vic-panel p-4">
              <Factory className="size-5 text-brass-deep" aria-hidden />
              <h3 className="mt-3 font-display text-base font-semibold">
                {en ? "Industry & trade" : "产业与贸易"}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {en
                  ? "Find supply bottlenecks. Allocate credit, improve production and choose when to trade or expand."
                  : "寻找供应链瓶颈，分配信贷、改良生产，在贸易与扩建之间取舍。"}
              </p>
            </div>
            <div className="vic-panel p-4">
              <Users className="size-5 text-brass-deep" aria-hidden />
              <h3 className="mt-3 font-display text-base font-semibold">
                {en ? "Civic negotiations" : "社团与议事"}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {en
                  ? "Respond to petitions and negotiate reforms. Support from one group may cost you another's trust."
                  : "回应社团诉求、推动改革；争取一方支持，也可能让另一方付出代价。"}
              </p>
            </div>
            <div className="vic-panel p-4">
              <Landmark className="size-5 text-brass-deep" aria-hidden />
              <h3 className="mt-3 font-display text-base font-semibold">
                {en ? "Public policy" : "政策与公开回应"}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {en
                  ? "Before the deadline, announce a policy or confirm your stance. You may also choose to remain silent."
                  : "截止前提交政策或确认维持立场，也可以主动选择保持沉默。"}
              </p>
            </div>
          </div>
          <p className="mt-3 border-l-2 border-brass pl-3 text-sm font-semibold leading-relaxed text-ink-soft">
            {en
              ? "Managing businesses does not count as a public response. Keep an eye on the policy deadline while the economy runs."
              : "经营调整不等于公开回应。让企业运转的同时，也要留意政策回应截止。"}
          </p>
        </section>

        <section className="vic-panel mt-6 p-5">
          <h2 className="font-display text-lg font-semibold">
            {en ? "Time & silence" : "时间与沉默"}
          </h2>
          <p className="mt-3 text-sm leading-relaxed">
            {length === "sprint"
              ? en
                ? "30 minutes of market time. No pause."
                : "半小时市场时间，不可暂停。"
              : en
                ? "You can pause. Time freezes and all information is hidden; only decision controls remain. Queued decisions execute when time resumes."
                : "可以暂停。暂停时冻结时间、隐藏所有信息，只保留决策控件；排入的决策在恢复时间后执行。"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {en
              ? "Calls do not stop time. Leaving an unpaused game does not freeze it; elapsed market time is settled when you return."
              : "通话不会停止时间。离开未暂停的游戏不会冻结时间，返回时补算流逝的市场时间。"}
          </p>
          <p className="mt-3 text-sm font-bold leading-relaxed text-down">
            {en
              ? "Choosing silence or missing a public-response deadline invites wild market speculation about the authorities' intentions."
              : "主动保持沉默或到期未公开回应，都会让市场胡乱猜测国家部门的意图。"}
          </p>
        </section>
        <Block title={t("sc.brief")} dropcap>
          {en ? s.briefEn : s.briefZh}
        </Block>

        {/* Clearly separated from the fiction: this part is the record. */}
        <section className="vic-panel mt-6 p-5">
          <h2 className="vic-kicker">{t("sc.history")}</h2>
          {/* Said out loud, because the whole design depends on the player
              knowing which half of the screen is invented. */}
          <p className="mt-1 text-[11px] leading-relaxed text-brass-deep">{t("sc.realNames")}</p>
          <p className="vic-dropcap mt-3 text-sm leading-relaxed text-ink-soft">
            {en ? s.historyEn : s.historyZh}
          </p>
          {extra.length > 0 ? (
            <ul className="mt-4 space-y-3 border-t border-line pt-4">
              {extra.map((line, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-ink-soft">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brass"
                    aria-hidden
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat k={t("sc.peg")} v={en ? s.lexicon.lineEn : s.lexicon.lineZh} />
          <Stat
            k={t("sc.reserves")}
            v={`${Math.round(usableReserves(s) / 1000)}k / ${Math.round(s.reserves / 1000)}k`}
            warn={s.committedForward > 0}
            note={s.committedForward > 0 ? t("sc.forwardWarn") : undefined}
          />
          <Stat
            k={en ? s.lexicon.rateEn : s.lexicon.rateZh}
            v={`${(s.startRate * 100).toFixed(1)}% → ${(s.maxRate * 100).toFixed(0)}%`}
          />
          <Stat k={t("sc.days")} v={`${run?.days ?? s.days}`} />
        </div>

        </Fold>

        <section className="vic-panel vic-frame relative mt-6 border-2 border-brass p-5 text-ink">
          <span className="absolute -right-3 -top-4" aria-hidden>
            <WaxSeal3D size={56} glyph="✦" />
          </span>
          <h2 className="vic-kicker">{t("sc.orders")}</h2>
          <p className="mt-3 font-display text-2xl font-semibold">
            {en ? obj.titleEn : obj.titleZh}
          </p>
          <Row label={t("sc.youDo")} text={en ? obj.howEn : obj.howZh} />
          <Row label={t("sc.youWin")} text={en ? obj.winEn : obj.winZh} />
          <Row label={t("sc.trap")} text={en ? obj.trapEn : obj.trapZh} />
          {obj.side === "defend" || obj.side === "neutral" ? (
            // Whoever is in the other chair in THIS crisis. In 1907 that is a
            // bear syndicate and in 1933 it is a gold hoarder, and naming the
            // same fictional fund in both would be the HUD telling a story the
            // scenario is not.
            <p className="mt-4 text-xs text-muted">
              {t("sc.against", { n: en ? seatLabelOf(s, "fund").en : seatLabelOf(s, "fund").zh })}
            </p>
          ) : null}
        </section>

        <div className="sticky bottom-0 z-20 mt-6 border-t border-line bg-paper/95 pt-4 pb-9 backdrop-blur-sm">
          <button
            type="button"
            className="vic-btn-seal min-h-11 w-full items-center justify-center gap-2 px-4 py-3 font-semibold"
            onClick={() => {
              sfxGood();
              begin();
            }}
          >
            {t("sc.start")}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Beginners see the orders first; the story, the record and the rules sit behind one fold. */
function Fold({ beginner, en, children }: { beginner: boolean; en: boolean; children: React.ReactNode }) {
  if (!beginner) return <>{children}</>;
  return (
    <details className="vic-panel mt-6 px-5 py-3">
      <summary className="cursor-pointer text-sm font-bold text-teal-deep">
        {en ? "Background, history and rules (optional)" : "背景故事、史实与规则（可跳过，点开阅读）"}
      </summary>
      {children}
    </details>
  );
}

function Block({
  title,
  dropcap,
  children,
}: {
  title: string;
  dropcap?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="vic-panel mt-6 p-5">
      <h2 className="vic-kicker">{title}</h2>
      <p
        className={`mt-3 text-sm leading-relaxed text-ink-soft${dropcap ? " vic-dropcap" : ""}`}
      >
        {children}
      </p>
    </section>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <p className="mt-3 text-sm leading-relaxed text-ink-soft">
      <span className="mr-2 font-semibold text-brass-deep">{label}</span>
      {text}
    </p>
  );
}

function Stat({ k, v, warn, note }: { k: string; v: string; warn?: boolean; note?: string }) {
  return (
    <div className="border border-line bg-surface px-3 py-3">
      <p className="truncate text-[11px] font-bold text-muted">{k}</p>
      <p className={`font-mono text-sm font-semibold tabular-nums ${warn ? "text-down" : ""}`}>
        {v}
      </p>
      {note ? <p className="mt-0.5 text-[10px] leading-tight text-down">{note}</p> : null}
    </div>
  );
}
