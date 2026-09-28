import { Check, Circle, Flag, Timer } from "lucide-react";
import { missionConditions, missionTimeline } from "@/lib/story/mission";
import { useI18n } from "@/lib/i18n";
import { useStory } from "@/lib/story/store";

const clock = (s: number) => {
  const seconds = Math.ceil(s);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
};
export function StoryTimeline() {
  const st = useStory(),
    en = useI18n((s) => s.lang) === "en";
  if (!st.run || st.paused) return null;
  const line = missionTimeline(st.run, st.elapsedSeconds),
    conditions = missionConditions(st.run);
  return (
    <section
      className="mission-timeline vic-panel mb-4 p-4"
      aria-label={en ? "Campaign timeline and victory conditions" : "时间线与胜利条件"}
      data-testid="story-timeline"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Timer className="size-4 text-brass-deep" />
          <h2 className="vic-kicker">
            {en ? "TIMELINE · VICTORY CONDITIONS" : "危机时间线 · 通关条件"}
          </h2>
          <span className="font-mono text-sm">{Math.floor(line.fraction * 100)}%</span>
        </div>
        <p className="font-mono text-xs text-muted">
          {en ? "Elapsed" : "已经历"} {clock(line.elapsed)} / {clock(line.total)} ·{" "}
          {st.run.done
            ? en
              ? "Concluded"
              : "已结算"
            : `${en ? "Time left" : "距最终结算"} ${clock(line.remaining)}`}
        </p>
      </div>
      <div
        className="relative mb-3 mt-4 h-2 border border-line bg-paper-deep"
        role="progressbar"
        aria-label={en ? "Time elapsed, not chance of winning" : "时间进程，不代表胜率"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(line.fraction * 100)}
      >
        <div
          className="h-full bg-brass transition-[width]"
          style={{ width: `${line.fraction * 100}%` }}
        />
        {line.milestones.map((m, i) => (
          <span
            key={i}
            title={`${en ? m.en : m.zh} · ${m.day}/${line.totalSessions}`}
            className={`absolute top-[-3px] h-3.5 w-0.5 ${m.passed ? "bg-up" : "bg-muted"}`}
            style={{ left: `${Math.min(99.7, m.position * 100)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between gap-3 text-xs text-muted">
        <span>{en ? "Taking office" : "上任"}</span>
        <span>
          {en ? "Historical sessions" : "已完成时段"} {line.completedSessions}/{line.totalSessions}
        </span>
        <span className="flex items-center gap-1">
          <Flag className="size-3" />
          {en ? "Final reckoning" : "最终结算"}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {conditions.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-2 border border-line bg-surface px-3 py-2 border-l-2 ${c.met ? "border-l-up" : "border-l-down"}`}
          >
            {c.met ? (
              <Check className="size-4 shrink-0 text-up" />
            ) : (
              <Circle className="size-4 shrink-0 text-down" />
            )}
            <div className="flex-1 text-xs">
              <span className="block font-bold">{en ? c.en : c.zh}</span>
              <span className="mt-1 block font-mono text-muted">
                {en ? "Now" : "当前"} {c.current} · {en ? "Goal" : "目标"} {c.target}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {st.run.done
          ? en
            ? "The result has been recorded in your report."
            : "本局已经结算，结果见战报。"
          : en
            ? "Ticks show conditions met now, not a win. The final market reckoning recalculates these values. Recovery stars do not determine victory."
            : "打勾仅表示当前达标，不是已经通关。最后一次市场检验会重新计算，须以最终结果达标；民生 3 星不代替这些条件。"}
        {line.nextWave && !st.run.done && (
          <span className="ml-2 text-ink-soft">
            {en ? "Next scenario event: " : "下一次剧情事件："}
            {en ? line.nextWave.titleEn : line.nextWave.titleZh}
          </span>
        )}
      </p>
    </section>
  );
}
