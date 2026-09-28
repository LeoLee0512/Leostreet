import { useEffect, useState } from "react";
import { Award, Crown, Shuffle, Trophy, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaxSeal3D } from "@/components/3d";
import { pct } from "@/lib/game/format";
import { POLICIES } from "@/lib/story/realtime";
import { REFORMS, getCivicOverview, getRecoveryRating } from "@/lib/story/civic";
import { gradeOf } from "@/lib/story/difficulty";
import { lengthOf } from "@/lib/story/lengths";
import { scenarioOf, seatLabelOf, SCENARIOS } from "@/lib/story/scenarios";
import { useStory } from "@/lib/story/store";
import { readCollection, recordStoryReport } from "@/lib/story/engagement";
import { missionConditions } from "@/lib/story/mission";
import { StoryMissionReview } from "./StoryMissionReview";
import { useI18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The debrief.
 *
 * Win or lose, this screen does the same job: say what happened to you, say
 * what happened in 1720 or 1907 or 2008, and put the lesson underneath both. A
 * scenario the player beats without being told what they beat has taught them
 * nothing.
 *
 * What is new is everything the run *earned* — the next rung, a title, the
 * name attached to this telling — and it sits above the lesson rather than
 * replacing it. The rewards are for coming back; the lesson is the reason the
 * scenario exists.
 */
export function StoryDebrief({ onExit }: { onExit: () => void }) {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const store = useStory();
  const { run, clear } = store;
  const [reportSaved, setReportSaved] = useState(false);
  useEffect(() => {
    if (!run?.done || !run.finishedAt) return;
    const scenario = scenarioOf(run.scenarioId);
    const rating = getRecoveryRating(store.civic);
    recordStoryReport({
      scenarioId: run.scenarioId,
      scenarioNameZh: scenario.nameZh,
      scenarioNameEn: scenario.nameEn,
      won: run.won,
      stars: rating.stars,
      income: store.economy.income,
      employment: store.economy.employment,
      seed: run.seed,
      length: run.length,
      elapsedSeconds: store.elapsedSeconds,
      completedAt: run.finishedAt,
      conditions: missionConditions(run),
    });
    setReportSaved(
      readCollection().reports.some(
        (r) =>
          r.scenarioId === run.scenarioId &&
          r.seed === run.seed &&
          r.completedAt === run.finishedAt,
      ),
    );
  }, [run, store.civic, store.economy, store.elapsedSeconds]);
  if (!run) return null;
  const s = scenarioOf(run.scenarioId);
  const en = lang === "en";
  const matchedHistory = run.pegBroken === (s.historicalOutcome === "broke");
  // In one scenario the line was meant to go. Colouring that red, and calling
  // it "断了", would score the player's best decision as their worst.
  const breakIsGood = s.endsOnBreak === false;
  const grade = gradeOf(s.grade);
  const spec = lengthOf(run.length);
  const unlocked = clear?.unlocked ? SCENARIOS.find((x) => x.id === clear.unlocked) : null;
  const recovery = getRecoveryRating(store.civic);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-wood-deep/55 p-4 backdrop-blur-sm">
      <div className="panel-shell vic-cert animate-pop max-h-[90dvh] w-full max-w-lg overflow-y-auto p-6 sm:p-8">
        <p
          className={cn(
            "vic-kicker text-center",
            run.won ? "text-up" : "text-down",
          )}
        >
          {en ? seatLabelOf(s, run.role).en : seatLabelOf(s, run.role).zh} · {s.year}
        </p>
        <h2 className="vic-letterpress mt-1 text-center text-3xl font-semibold">
          {run.won ? t("sd.won") : t("sd.lost")}
        </h2>
        <div className="mt-4 flex justify-center">
          <WaxSeal3D
            size={64}
            glyph={run.won ? "✓" : "✕"}
            className={cn(!run.won && "opacity-60 saturate-50")}
          />
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-paper"
            style={{ background: grade.tint }}
          >
            {en ? grade.nameEn : grade.nameZh}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-extrabold text-ink-soft">
            {en ? spec.clockEn : spec.clockZh}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-extrabold text-ink-soft">
            {t("sd.elapsed")} {t("sd.minutes", { n: Math.round(store.elapsedSeconds / 60) })}
          </span>
        </div>

        <StoryMissionReview conditions={missionConditions(run)} en={en} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Cell
            k={t("sd.peg")}
            v={run.pegBroken ? (breakIsGood ? t("sd.lineGone") : t("sd.broke")) : t("sd.held")}
            tone={run.pegBroken === breakIsGood ? "up" : "down"}
          />
          <Cell k={t("sd.lastedDays")} v={`${Math.min(run.day - 1, run.days)} / ${run.days}`} />
          <Cell k={t("sd.spent")} v={Math.round(run.spent).toLocaleString()} />
          <Cell
            k={t("sd.book")}
            v={pct(run.book / 100 - 1)}
            tone={run.book >= 100 ? "up" : "down"}
          />
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">
          {t("sd.calls", { n: run.callsDone.length })}
        </p>
        <p className="mt-3 text-center text-xs text-muted" role="status">
          {reportSaved
            ? en
              ? "Report saved on this device. Find it under Collection on the main menu."
              : "战报已存入本机。主菜单的「知识与收藏」可以回看、复制分享。"
            : en
              ? "Report could not be saved on this device. Your result remains visible here."
              : "本机暂未保存战报，可以先查看本页结果。"}
        </p>

        <section className="my-4 border border-line bg-surface-2 p-4">
          <h3 className="vic-kicker">{en ? "Decisions and consequences" : "决策与后果"}</h3>
          <p className="mt-2 text-sm">
            {en ? "Silence recorded" : "沉默记录"}：{store.cabinet.silences} ·{" "}
            {en ? "periods" : "个时段"}
          </p>
          <p className="mt-1 text-sm">
            {en ? "Coordination route" : "协调路线"}：
            {store.cabinet.route
              ? en
                ? POLICIES.find((p) => p.id === store.cabinet.route)!.en
                : POLICIES.find((p) => p.id === store.cabinet.route)!.zh
              : en
                ? "None"
                : "未启动"}
          </p>
          <p className="mt-1 text-sm">
            {en ? "Route funds committed" : "路线投入资金"}：
            {Math.round(store.cabinet.cost).toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-muted">
            {en ? "Banks / Business / Public confidence" : "金融机构 / 企业 / 公众信心"}：
            {Math.round(store.cabinet.banks)} / {Math.round(store.cabinet.business)} /{" "}
            {Math.round(store.cabinet.publicTrust)}
          </p>
        </section>
        <section className="my-4 border border-line bg-surface-2 p-4">
          <h3 className="vic-kicker">{en ? "The economy you leave behind" : "你留下的经济"}</h3>
          <p className="mt-2 text-sm">
            {en ? "Completed expansions" : "已投产扩建"}：{store.economy.completed} ·{" "}
            {en ? "Funds replenished" : "累计资金回补"}：
            {Math.round(store.economy.revenue).toLocaleString()}
          </p>
          <p className="mt-2 text-sm">
            {en ? "Output / real income / prices" : "产出 / 实际收入 / 物价指数"}：
            {store.economy.output.toFixed(1)} / {store.economy.income.toFixed(1)} /{" "}
            {store.economy.price.toFixed(1)}
          </p>
          <p className="mt-2 text-sm">
            {en ? "Employment / bank health" : "就业率 / 银行健康度"}：
            {store.economy.employment.toFixed(1)}% / {store.economy.bankHealth.toFixed(1)}
          </p>
        </section>
        <section className="my-4 border border-line bg-teal-soft p-4">
          <h3 className="vic-kicker">{en ? "The society you leave behind" : "你留下的社会"}</h3>
          <p className="mt-3 font-display text-xl font-bold text-teal-deep">
            {"★".repeat(recovery.stars)}
            {"☆".repeat(3 - recovery.stars)} · {en ? recovery.en : recovery.zh}
          </p>
          {recovery.ready && (
            <p className="mt-2 text-xs text-muted">
              {en
                ? "Last minute average · income / employment"
                : "最近一分钟均值 · 实际收入 / 就业率"}
              ：{recovery.income.toFixed(1)} / {recovery.employment.toFixed(1)}%
            </p>
          )}
          <p className="mt-2 text-sm">
            {en ? "Petitions answered / left unanswered" : "已答复 / 沉默的诉求"}：
            {store.civic.resolved} / {store.civic.silences}
          </p>
          <p className="mt-2 text-sm">
            {en ? "Accords in force" : "已生效协定"}：
            {store.civic.enacted
              .map((id) => {
                const r = REFORMS.find((r) => r.id === id)!;
                return en ? r.en : r.zh;
              })
              .join("、") || (en ? "None" : "无")}
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {getCivicOverview(store.civic, store.economy, run).milestones.map((m) => (
              <li key={m.id}>
                {store.civic.achievements.includes(m.id) ? "✓" : "○"} {en ? m.en : m.zh}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            {en
              ? "These record your social legacy; the historical mission determines victory."
              : "这些记录本局的社会成果；历史使命单独判定胜负。"}
          </p>
        </section>
        {/* What this run earned, if anything. */}
        {clear?.newAchievement ? (
          <Earned
            icon={<Award className="size-4" aria-hidden />}
            kicker={t("sd.newAward")}
            title={en ? clear.newAchievement.nameEn : clear.newAchievement.nameZh}
            body={en ? clear.newAchievement.blurbEn : clear.newAchievement.blurbZh}
          />
        ) : run.won && !spec.achievement ? (
          <p className="mt-3 border border-line bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-muted">
            {t("sd.noAward")}
          </p>
        ) : null}

        {clear?.newCrown ? (
          <Earned
            icon={<Crown className="size-4" aria-hidden />}
            kicker={t("sd.crown")}
            title={en ? clear.newCrown.nameEn : clear.newCrown.nameZh}
            body={en ? clear.newCrown.blurbEn : clear.newCrown.blurbZh}
          />
        ) : null}

        {clear?.newTitles.map((tt) => (
          <Earned
            key={tt.id}
            icon={<Trophy className="size-4" aria-hidden />}
            kicker={t("sd.newTitle")}
            title={en ? tt.nameEn : tt.nameZh}
            body={en ? tt.blurbEn : tt.blurbZh}
          />
        ))}

        {unlocked ? (
          <p className="mt-3 flex items-center gap-2 border border-brass/40 bg-surface-2 px-3 py-2 text-[12px] font-bold text-brass-deep">
            <Unlock className="size-4 shrink-0" aria-hidden />
            {t("sd.unlocked", { n: en ? unlocked.nameEn : unlocked.nameZh })}
          </p>
        ) : null}

        {/* Did you repeat history, or step off it? */}
        <div
          className={cn(
            "mt-3 border border-line px-4 py-3 text-[12px] leading-relaxed",
            matchedHistory ? "bg-surface-2 text-ink-soft" : "bg-teal-soft text-teal-deep",
          )}
        >
          <p className="vic-kicker opacity-70">
            {matchedHistory ? t("sd.sameAsHistory") : t("sd.brokeFromHistory")}
          </p>
          <p className="mt-1">
            {(en ? s.outcomeNoteEn : s.outcomeNoteZh) ??
              (s.historicalOutcome === "broke" ? t("sd.historyBroke") : t("sd.historyHeld"))}
          </p>
        </div>

        {/* What this telling did differently. Two small things, every run. */}
        {run.divergences.length > 0 ? (
          <section className="mt-3 border border-line bg-surface-2 px-4 py-3">
            <h3 className="vic-kicker flex items-center gap-1.5 text-muted">
              <Shuffle className="size-3.5" aria-hidden />
              {t("sd.divergence")}
            </h3>
            <ul className="mt-1.5 space-y-1">
              {run.divergences.map((d, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-ink-soft">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brass"
                    aria-hidden
                  />
                  <span>{en ? d.en : d.zh}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-3 border-2 border-dashed border-brass/50 p-3">
          <h3 className="vic-kicker text-muted">{t("sd.lesson")}</h3>
          <p className="vic-dropcap mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            {en ? s.lessonEn : s.lessonZh}
          </p>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            // The same seed: this replays the run that just happened, not a new
            // one at the same crisis. Losing to a history you cannot re-read is
            // not something to learn from.
            onClick={() => store.brief(run.scenarioId, run.role, run.mode, run.length, run.seed)}
          >
            {t("sd.retry")}
          </Button>
          <Button
            onClick={() => {
              store.exit();
              onExit();
            }}
          >
            {t("sd.exit")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Earned({
  icon,
  kicker,
  title,
  body,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mt-3 flex gap-2.5 border border-brass bg-surface px-4 py-3 text-ink shadow-sm">
      <span className="mt-0.5 shrink-0 text-brass">{icon}</span>
      <div className="min-w-0">
        <p className="vic-kicker text-brass-deep">{kicker}</p>
        <p className="vic-letterpress text-lg font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

function Cell({ k, v, tone }: { k: string; v: string; tone?: "up" | "down" }) {
  return (
    <div className="border border-line bg-surface-2 px-3 py-2">
      <p className="text-[11px] font-bold text-muted">{k}</p>
      <p
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
        )}
      >
        {v}
      </p>
    </div>
  );
}
