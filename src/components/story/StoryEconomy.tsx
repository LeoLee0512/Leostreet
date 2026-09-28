import { Factory, Package, Truck, ArrowRight, Hammer, Cog, Ship, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { useI18n } from "@/lib/i18n";
import { useStory } from "@/lib/story/store";
import { economicEnvironment, economyIssue, methodCost, METHODS, projectCost, SECTORS, TRADE_STANCES, type Priority, type SectorId } from "@/lib/story/economy";

const icons = [Package, Factory, Truck];
export function StoryEconomy() {
  const st = useStory();
  const en = useI18n(s => s.lang) === "en";
  const e = st.economy;
  const issue = economyIssue(e);
  const environment = economicEnvironment(e);
  return <section id="story-production" className="vic-panel mb-4 scroll-mt-44 p-4 sm:p-5" data-testid="story-economy">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="vic-kicker">{en ? "THE ECONOMY IS RUNNING" : "经济正在运转"}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold">{en ? "Credit → production → livelihoods" : "信贷 → 生产 → 民生"}</h2></div>
      <span className="rounded-full bg-teal-soft px-3 py-1 font-mono text-xs text-teal-deep">{en ? "Next settlement" : "下次结算"} {Math.max(1, Math.ceil(5 - e.remainder))}s</span>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-muted">{en ? "Businesses produce, pay wages and trade between crisis events. Support a bottleneck, choose a production method and watch the next link respond. Operating orders do not replace an official response to the crisis." : "企业持续生产、发薪和贸易。为瓶颈融资、选择工艺，再观察下一环的变化。经营安排不代替你在危机期限前的正式表态。"}</p>
    <div className="mt-4 rounded-xl border border-teal/30 bg-teal-soft p-3 text-teal-deep" data-testid="economic-environment">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">{en ? "Simulated business conditions · " : "模拟经济环境 · "}{en ? environment.current.en : environment.current.zh}</p><span className="font-mono text-xs">{Math.ceil(environment.secondsLeft)}s</span></div>
      <p className="mt-1 text-xs leading-relaxed">{en ? environment.current.detailEn : environment.current.detailZh}</p>
      <p className="mt-2 text-xs">{en ? "Next: " : "接下来："}{en ? environment.next.en : environment.next.zh} · {en ? "A forecastable 90-second cycle, separate from historical events." : "每 90 秒轮换，可提前准备；这套原创经营周期与历史事件分别结算。"}</p>
    </div>
    <div className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="economy-metrics">
      <Metric label={en ? "Output index" : "产出指数"} value={e.output.toFixed(1)} values={e.history.map(h => h.output)} />
      <Metric label={en ? "Real income" : "实际收入指数"} value={e.income.toFixed(1)} values={e.history.map(h => h.income)} />
      <Metric label={en ? "Consumer prices" : "消费物价指数"} value={e.price.toFixed(1)} values={e.history.map(h => h.price)} lowerIsBetter />
      <Metric label={en ? "Employment" : "就业率"} value={`${e.employment.toFixed(1)}%`} />
    </div>
    <div className="mb-4 rounded-md border-l-4 border-brass bg-paper p-3" role="status">
      <p className="text-xs font-bold text-teal-deep">{en ? "Current bottleneck" : "现在值得你处理的事"}</p>
      <p className="mt-1 text-sm leading-relaxed">{en ? issue.en : issue.zh}</p>
    </div>
    <div className="grid gap-3 lg:grid-cols-3">
      {SECTORS.map((sector, index) => {
        const Icon = icons[index]!;
        const utilization = Math.round(e.utilization[sector.id] * 100);
        const cost = projectCost(st.run!, e, sector.id);
        const capped = e.capacity[sector.id] + e.projects.filter(p => p.sector === sector.id).length * 0.25 >= 2.5;
        return <article key={sector.id} className="min-w-0 rounded-md border border-line bg-surface p-3 shadow-[var(--shadow-border)]">
          <div className="flex items-center gap-2"><Icon className="size-4 text-teal-deep" /><h3 className="font-bold">{en ? sector.en : sector.zh}</h3>{index < 2 && <ArrowRight className="ml-auto size-4 text-muted" />}</div>
          <p className="mt-1 text-xs text-muted">{en ? sector.detailEn : sector.detailZh}</p>
          <p className="mt-3 font-mono text-sm">{en ? "Capacity" : "产能"} ×{e.capacity[sector.id].toFixed(2)} · {en ? "Utilization" : "开工"} {utilization}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-teal transition-[width]" style={{ width: `${utilization}%` }} /></div>
          <p className="my-2 text-xs text-muted">{en ? "Credit share" : "获得信贷"} {(e.credit[sector.id] * 100).toFixed(0)}%</p>
          <PriorityButtons sector={sector.id} />
          <div className="mt-3 border-t border-line pt-3">
            <h4 className="mb-2 flex items-center gap-1 text-xs font-bold"><Cog className="size-3.5" />{en ? "Production method" : "生产方式"}</h4>
            <MethodButtons sector={sector.id} />
          </div>
          <button type="button" disabled={st.run!.reserves < cost || e.projects.length >= 3 || capped} onClick={() => st.construct(sector.id)} className="mt-3 min-h-11 w-full rounded-md border border-brass px-2 py-2 text-xs font-bold text-brass-deep disabled:opacity-40">
            {capped ? (en ? "Capacity limit reached" : "已达产能上限") : `${en ? "Expand +25%" : "扩建 +25%"} · ${Math.round(cost).toLocaleString()}`}
          </button>
          <p className="mt-2 text-xs text-muted">{sector.id === "materials" ? `${en ? "Inputs produced" : "本次原料产出"} ${e.materialOutput.toFixed(1)}` : sector.id === "industry" ? `${en ? "Input consumption" : "本次原料消耗"} ${e.materialUse.toFixed(1)}` : `${en ? "Freight capacity" : "本次可用运力"} ${e.freight.toFixed(1)}`}</p>
        </article>;
      })}
    </div>
    <p className="mt-2 text-xs leading-relaxed text-muted">{en ? "Credit settings are relative weights: putting every sector on Priority is identical to Normal everywhere. Expand the weak link, not every industry. Capacity alone earns no return without workers, inputs and buyers." : "信贷是相对权重：三个行业都设为「优先」与都设为「常规」分配相同。扩建最薄弱的一环；缺少工人、原料或买家的产能不会自动带来收益。"}</p>
    <div className="mt-4 rounded-xl border border-line bg-paper p-4" data-testid="economy-trade">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Ship className="size-4 text-teal-deep" />{en ? "Trade policy" : "贸易安排"}</h3>
      <TradeButtons />
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <p className="rounded-lg bg-surface-2 p-2">{en ? "Inputs imported" : "本次进口原料"}<strong className="mt-1 block vic-letterpress text-base">{e.lastTrade.materials.toFixed(1)}</strong></p>
        <p className="rounded-lg bg-surface-2 p-2">{en ? "Goods exported" : "本次出口商品"}<strong className="mt-1 block vic-letterpress text-base">{e.lastTrade.goods.toFixed(1)}</strong></p>
        <p className="rounded-lg bg-surface-2 p-2">{en ? "Last trade cash flow" : "本次贸易收支"}<strong className={`mt-1 block font-mono text-base ${e.lastTrade.cash < 0 ? "text-down" : "text-teal-deep"}`}>{e.lastTrade.cash >= 0 ? "+" : ""}{e.lastTrade.cash.toFixed(1)}</strong></p>
        <p className="rounded-lg bg-surface-2 p-2">{en ? "Net trade cash" : "累计贸易收支"}<strong className="mt-1 block vic-letterpress text-base">{e.tradeCash >= 0 ? "+" : ""}{e.tradeCash.toFixed(1)}</strong></p>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">{en ? "Imports stop when reserves are exhausted or input stocks reach 18. Export earnings are lower than the cost of importing enough material to manufacture the same goods. Overseas trade competes with household deliveries." : "原料库存达到 18 时停止进口，储备不足则只买得起的数量。进口再加工出口存在贸易折损；海外货运会挤占居民商品配送。"}</p>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-paper p-3">
        <h3 className="mb-2 text-sm font-bold">{en ? "Funding & household burden" : "救助筹资与居民负担"}</h3>
        <TaxButtons />
        <p className="mt-2 text-xs text-muted">{en ? "A heavier funding burden replenishes reserves but cuts consumption. Lower burdens leave less for crisis defence." : "加大筹资补充可用资金，却压低消费；减轻负担改善购买力，但救市资金回补更少。"}</p>
        <p className="mt-2 font-mono text-xs">{en ? "Last collection" : "本次回款"} +{e.lastRevenue.toFixed(1)} · {en ? "Total" : "累计"} {Math.round(e.revenue).toLocaleString()}</p>
      </div>
      <div className="rounded-xl bg-paper p-3 text-xs leading-relaxed">
        <h3 className="mb-2 text-sm font-bold">{en ? "Where the money goes" : "资金与商品流向"}</h3>
        <p>{en ? "Input inventory" : "原料库存"} {e.materials.toFixed(1)} → {en ? "Goods inventory" : "商品库存"} {e.goods.toFixed(1)}</p>
        <p>{en ? "Delivered / demanded" : "商品交付 / 消费需求"} {e.sales.toFixed(1)} / {e.demand.toFixed(1)}</p>
        <p>{en ? "Bank health" : "银行健康度"} {e.bankHealth.toFixed(1)} / 100</p>
        <p className={e.lastPressure > 0 ? "text-down" : "text-teal-deep"}>{en ? "Economic feedback" : "本次经济反馈"} {e.lastPressure > 0 ? (en ? "adds crisis pressure" : "正在增加危机压力") : (en ? "eases crisis pressure" : "正在缓解危机压力")} {Math.abs(e.lastPressure * 100).toFixed(3)}%</p>
      </div>
    </div>
    <div className="mt-4 border-t border-line pt-3">
      <h3 className="flex items-center gap-2 text-sm font-bold"><Hammer className="size-4" />{en ? "Construction queue · one crew" : "建设队列 · 一支施工队"} ({e.projects.length}/3)</h3>
      <p className="mt-1 text-xs text-muted">{en ? "45 seconds per project. Construction uses 12% of distribution capacity. Cancelling refunds 80% of unfinished work. Do not build capacity that has no inputs or buyers." : "每项施工 45 秒，依次建设；施工期间占用 12% 运输能力。撤销退回未施工部分的 80%。没有原料或买家的扩产会闲置。"}</p>
      {e.projects.length === 0 && <p className="mt-2 text-sm text-muted">{en ? "Crew available. Retaining cash is also a choice." : "施工队空闲。保留现金也是一种选择。"}</p>}
      {e.projects.map((p, i) => <div key={p.id} className="mt-2 flex items-center gap-2 rounded-lg bg-paper p-2 text-xs">
        <span className="min-w-0 flex-1 font-bold">{en ? SECTORS.find(s => s.id === p.sector)!.en : SECTORS.find(s => s.id === p.sector)!.zh} · {i === 0 ? `${en ? "Building" : "施工中"} ${Math.ceil(p.left - e.remainder)}s` : (en ? "Queued" : "待开工")}</span>
        <button type="button" className="min-h-11 px-3 text-down underline" onClick={() => st.cancelConstruction(p.id)}>{en ? "Cancel" : "撤销"}</button>
      </div>)}
    </div>
    {st.economicNotice && <p className="mt-3 rounded-lg bg-teal-soft p-3 text-sm text-teal-deep" role="status">{en ? st.economicNotice.en : st.economicNotice.zh}</p>}
  </section>;
}

export function PausedEconomyOrders() {
  const st = useStory();
  const en = useI18n(s => s.lang) === "en";
  return <section className="vic-panel space-y-3 p-4" data-testid="paused-economy-orders">
    <h2 className="text-lg font-bold">{en ? "Operating decisions" : "经营决策"}</h2>
    {SECTORS.map(s => <div key={s.id}><p className="mb-1 text-sm font-bold">{en ? s.en : s.zh}</p><PriorityButtons sector={s.id} /><div className="mt-2"><MethodButtons sector={s.id} paused /></div>
      <button type="button" className="mt-1 min-h-11 w-full rounded-lg bg-paper p-2 text-sm" disabled={st.pendingBuilds.length >= 3} onClick={() => st.construct(s.id)}>{en ? "Queue expansion request" : "排入扩建意向"} {st.pendingBuilds.filter(x => x === s.id).length || ""}</button></div>)}
    <TaxButtons />
    <TradeButtons />
    <p className="text-xs text-muted">{en ? "Requests execute on resume if funds and construction slots allow. No market information is available here." : "恢复时间后按顺序检查资金和施工空位并执行；此处不显示市场信息。"}</p>
  </section>;
}
function MethodButtons({ sector, paused = false }: { sector: SectorId; paused?: boolean }) {
  const st = useStory();
  const en = useI18n(s => s.lang) === "en";
  const selected = st.economicDraft.methods[sector];
  const cooldown = paused ? 0 : st.economy.methodCooldowns[sector];
  const cost = paused ? 0 : methodCost(st.run!, st.economy, sector);
  const labels = sector === "industry"
    ? (en ? ["Balanced output, input use and jobs.", "+35% nominal output; +30% input per good; −30% jobs; +12% financing needs.", "−12% nominal output; −22% input per good; +20% jobs; −10% financing needs."] : ["平衡产出、耗料与岗位。", "名义产出 +35%；单件耗料 +30%；岗位 −30%；融资需求 +12%。", "名义产出 −12%；单件耗料 −22%；岗位 +20%；融资需求 −10%。"])
    : (en ? ["Balanced output and jobs.", "+35% nominal output; −30% jobs; +12% financing needs.", "−12% nominal output; +20% jobs; −10% financing needs."] : ["平衡产出与岗位。", "名义产出 +35%；岗位 −30%；融资需求 +12%。", "名义产出 −12%；岗位 +20%；融资需求 −10%。"]);
  return <div>
    <div className="grid grid-cols-3 gap-1" role="group" aria-label={`${sector} ${en ? "production method" : "生产方式"}`}>
      {METHODS.map(m => <button type="button" key={m.id} aria-pressed={selected === m.id} disabled={!paused && selected !== m.id && (cooldown > 0 || st.run!.reserves < cost)} className={`min-h-11 rounded-md px-1 text-xs font-bold disabled:opacity-40 ${selected === m.id ? "bg-teal text-paper" : "bg-surface-2 text-ink"}`} onClick={() => st.setEconomy({ methods: { ...st.economicDraft.methods, [sector]: m.id } })}>{en ? m.en : m.zh}</button>)}
    </div>
    <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted">{METHODS.map((m, i) => <li key={m.id}><span className={m.id === selected ? "font-bold text-teal-deep" : "font-semibold"}>{en ? m.en : m.zh}</span> · {labels[i]}</li>)}</ul>
    <p className="mt-2 text-xs font-semibold text-muted">{paused ? (en ? "Conversion costs 0.8% of opening funds × installed capacity; 30s between changes. Checked on resume." : "切换成本：起始可用资金的 0.8% × 已有产能；30 秒内不能再切换，恢复后检查执行。") : `${en ? "Switch cost" : "切换拨款"} ${Math.round(cost).toLocaleString()} · ${cooldown > 0 ? `${en ? "Adjustment" : "调整中"} ${Math.ceil(cooldown)}s` : (en ? "30s between changes" : "切换后调整 30 秒")}`}</p>
  </div>;
}
function TradeButtons() {
  const st = useStory();
  const en = useI18n(s => s.lang) === "en";
  return <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={en ? "Trade stance" : "贸易安排"}>{TRADE_STANCES.map(t => <button type="button" key={t.id} aria-pressed={st.economicDraft.trade === t.id} onClick={() => st.setEconomy({ trade: t.id })} className={`min-h-11 rounded-lg border p-3 text-left ${st.economicDraft.trade === t.id ? "border-teal bg-teal-soft text-teal-deep" : "border-line bg-surface-2 text-ink"}`}><strong className="block text-sm">{en ? t.en : t.zh}</strong><span className="mt-1 block text-xs leading-relaxed">{en ? t.detailEn : t.detailZh}</span></button>)}</div>;
}
function PriorityButtons({ sector }: { sector: typeof SECTORS[number]["id"] }) {
  const st = useStory();
  const en = useI18n(s => s.lang) === "en";
  return <div className="grid grid-cols-3 gap-1" role="group" aria-label={`${sector} ${en ? "credit priority" : "信贷优先级"}`}>
    {([1, 2, 4] as Priority[]).map((p, i) => <button key={p} type="button" aria-pressed={st.economicDraft.priorities[sector] === p} className={`min-h-11 rounded-md px-1 text-xs font-bold ${st.economicDraft.priorities[sector] === p ? "bg-teal text-paper" : "bg-surface-2 text-ink"}`} onClick={() => st.setEconomy({ priorities: { ...st.economicDraft.priorities, [sector]: p } })}>{en ? ["Low", "Normal", "Priority"][i] : ["收紧", "常规", "优先"][i]}</button>)}
  </div>;
}
function TaxButtons() {
  const st = useStory();
  const en = useI18n(s => s.lang) === "en";
  return <div className="grid grid-cols-3 gap-1" role="group" aria-label={en ? "Funding burden" : "筹资安排"}>{([0, 1, 2] as const).map((tax, i) => <button type="button" key={tax} aria-pressed={st.economicDraft.tax === tax} className={`min-h-11 rounded-md px-1 text-xs font-bold ${st.economicDraft.tax === tax ? "bg-teal text-paper" : "bg-surface-2 text-ink"}`} onClick={() => st.setEconomy({ tax })}>{en ? ["Light", "Standard", "Heavy"][i] : ["减轻负担", "常规筹资", "加大筹资"][i]}</button>)}</div>;
}
function Metric({ label, value, values, lowerIsBetter = false }: { label: string; value: string; values?: number[]; lowerIsBetter?: boolean }) {
  const en = useI18n(s => s.lang) === "en";
  const delta = values && values.length > 1 ? values[values.length - 1]! - values[0]! : 0;
  return <div className="min-w-0 rounded-md border border-line border-t-[3px] [border-top-style:double] border-t-brass/70 bg-surface p-3 shadow-[inset_0_1px_0_#ffffff59]"><p className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p><p className="mt-1 text-xl font-bold tabular-nums"><span className="vic-letterpress">{value}</span></p>{values && <>
    <div className="mt-1 h-9 text-teal" aria-hidden="true"><ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><LineChart data={values.map(v => ({ value: v }))} margin={{ top: 3, right: 2, bottom: 3, left: 2 }}><Line dataKey="value" type="monotone" stroke="var(--color-teal)" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
    <p className={`flex items-center gap-1 text-xs ${(lowerIsBetter ? delta > 0 : delta < 0) ? "text-down" : "text-teal-deep"}`}><TrendingUp className="size-3 shrink-0" />{values.length > 1 ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} ${en ? "in recent history" : "近期变化"}` : (en ? "Waiting for trend" : "等待结算趋势")}</p>
  </>}</div>;
}
