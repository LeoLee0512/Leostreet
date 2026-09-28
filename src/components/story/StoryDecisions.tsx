import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useStory } from "@/lib/story/store";
import { scenarioOf } from "@/lib/story/scenarios";
import { POLICIES, SILENCE_WARNING_EN, SILENCE_WARNING_ZH } from "@/lib/story/realtime";

/** This whole surface is safe in a pause: orders only, no market observations. */
export function StoryDecisions() {
  const st = useStory();
  const en = useI18n((s) => s.lang) === "en";
  const run = st.run!;
  const scenario = scenarioOf(run.scenarioId);
  const lx = scenario.lexicon;
  const rate = st.draft.rate ?? run.rate;
  return <section className="vic-panel space-y-4 p-4 sm:p-5" data-testid="story-decisions">
    <div>
      <p className="vic-kicker">{en ? "WAR CABINET DESPATCHES" : "战时内阁公文"}</p>
      <h2 className="mt-1 text-lg font-bold">{en ? "Decision desk" : "决策台"}</h2>
      <p className="mt-1 text-sm text-muted">{en ? "Policies execute immediately. Production and financing keep running between historical events." : "方案立即执行，历史事件按时到来。提交后可以继续经营与调整，不必等待截止。"}</p>
    </div>
    <label className="block text-sm font-bold">{en ? lx.rateEn : lx.rateZh} · {(rate * 100).toFixed(2)}%
      <input aria-label={en ? "Policy setting" : "政策设定"} className="mt-2 block min-h-11 w-full" type="range" min={scenario.startRate} max={scenario.maxRate} step={0.0025} value={rate} onChange={(e) => st.setDraft({ rate: Number(e.target.value) })} />
    </label>
    <AmountOrder label={en ? lx.spendEn : lx.spendZh} field="spend" />
    {scenario.allowEquityDefence && <AmountOrder label={en ? lx.buyEn ?? "Support the market" : lx.buyZh ?? "支持市场"} field="buyEquity" />}
    <div className="grid gap-2 sm:grid-cols-2">
      {scenario.allowPledge && <button type="button" aria-pressed={Boolean(st.draft.pledge)} className={`min-h-11 rounded-md border p-3 text-left text-sm font-bold ${st.draft.pledge ? "border-brass bg-teal-soft text-teal-deep" : "border-line bg-surface text-ink"}`} onClick={() => st.setDraft({ pledge: !st.draft.pledge })}>
        {en ? "Public commitment" : "公开承诺"} · {st.draft.pledge ? (en ? "Selected" : "已选择") : (en ? "Not selected" : "未选择")}
      </button>}
      {scenario.allowHalt && <button type="button" aria-pressed={Boolean(st.draft.halt)} className={`min-h-11 rounded-md border p-3 text-left text-sm font-bold ${st.draft.halt ? "border-brass bg-teal-soft text-teal-deep" : "border-line bg-surface text-ink"}`} onClick={() => st.setDraft({ halt: !st.draft.halt })}>
        {en ? "Close the market" : "申请休市"} · {st.draft.halt ? (en ? "Selected" : "已选择") : (en ? "Not selected" : "未选择")}
      </button>}
    </div>
    <p className="text-xs text-muted">{en ? "Standing policy remains in force. One-off actions are checked at execution; commitments are usable once and market closure twice." : "原有常设政策继续生效。一次性行动在执行时检查条件：公开承诺限一次，休市限两次。"}</p>
    <div className="vic-divider" aria-hidden="true" />
    <div className="pt-1">
      <p className="vic-kicker">{en ? "COORDINATION" : "机构协调"}</p>
      <h3 className="mt-1 text-sm font-bold">{en ? "Coordination route · choose one" : "机构协调路线 · 三选一"}</h3>
      <p className="my-2 text-xs text-muted">{en ? "Simplified scenario rules; amounts and timings are game parameters, not historical facts." : "本版采用简化博弈规则；资金比例与实施时长为游戏参数，并非史实数字。"}</p>
      <div className="grid gap-2">
        {POLICIES.map((p) => <button key={p.id} type="button" disabled={Boolean(st.cabinet.route)} aria-pressed={(st.queuedPolicy ?? st.cabinet.route) === p.id}
          onClick={() => st.choosePolicy(p.id)} className={`min-h-11 rounded-md border-2 p-3 text-left ${((st.queuedPolicy ?? st.cabinet.route) === p.id) ? "border-brass bg-teal-soft text-teal-deep" : "border-line bg-surface text-ink"} disabled:cursor-default`}>
          <span className="block text-sm font-bold">{en ? p.en : p.zh}</span>
          {!st.paused && <span className="mt-1 block text-xs leading-relaxed">{en ? p.detailEn : p.detailZh}</span>}
        </button>)}
      </div>
    </div>
    {st.paused && st.phone && st.phone.status === "live" && <div className="space-y-2 border-t border-line pt-3">
      <p className="vic-kicker">{en ? "TELEGRAM" : "电报往来"}</p>
      <h3 className="text-sm font-bold">{en ? "Telephone decision" : "电话决策"}</h3>
      {st.phone.script.options.map((o) => <button key={o.id} type="button" aria-pressed={st.pendingReply === o.id} onClick={() => st.say(o.id)} className={`min-h-11 w-full rounded-lg p-3 text-left text-sm ${st.pendingReply === o.id ? "bg-teal-soft text-teal-deep" : "bg-paper text-ink"}`}>{en ? o.en : o.zh}</button>)}
    </div>}
    {st.paused && st.phone && st.phone.status !== "reply" && <button type="button" className="min-h-11 w-full rounded-lg border-2 border-down p-3 text-sm font-bold text-down" onClick={() => st.decline()}>{en ? "Remain silent on the call" : "电话保持沉默"}{st.pendingReply === "__silence__" ? (en ? " · queued" : " · 已选择") : ""}</button>}
    <Button className="min-h-11 w-full" onClick={() => st.commitDay()}>{st.paused ? (en ? "Queue decision for resume" : "排入恢复后执行") : st.submitted === "orders" ? (en ? "Execute new decision" : "执行新决策") : (en ? "Execute decision now" : "立即执行决策")}</Button>
    <button type="button" aria-pressed={st.submitted === "silence"} onClick={() => st.keepSilent()} className="min-h-11 w-full rounded-lg border-2 border-down bg-paper p-3 text-left text-down">
      <span className="block text-base font-extrabold">{en ? "Remain silent" : "保持沉默"}{st.submitted === "silence" ? (en ? " · selected" : " · 已选择") : ""}</span>
      <span className="mt-1 block text-sm font-bold leading-relaxed">{en ? SILENCE_WARNING_EN : SILENCE_WARNING_ZH}</span>
    </button>
    <p className="text-xs text-muted">{en ? "No decision by the deadline counts as silence. Executed spending cannot be withdrawn; unconfirmed drafts do not execute." : "到期未决策同样视为沉默。已执行的支出不会撤回；未确认的修改不会执行。"}</p>
  </section>;
}

function AmountOrder({ label, field }: { label: string; field: "spend" | "buyEquity" }) {
  const st = useStory();
  const en = useI18n((s) => s.lang) === "en";
  // Fixed range while paused: never expose the current reserve balance via max.
  const s = scenarioOf(st.scenarioId);
  const pot = Math.max(1, s.reserves - s.committedForward);
  const pct = Math.round((st.draft[field] ?? 0) / pot * 100);
  return <label className="block text-sm font-bold">{label} · {pct}% {en ? "of opening funds" : "初始可用资金"}
    <input className="mt-2 block min-h-11 w-full" aria-label={label} type="range" min={0} max={100} step={1} value={pct} onChange={(e) => st.setDraft({ [field]: Number(e.target.value) / 100 * pot })} />
  </label>;
}
