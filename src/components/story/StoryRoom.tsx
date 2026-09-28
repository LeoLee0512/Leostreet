import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  Landmark,
  Megaphone,
  Pause,
  Play,
  PhoneCall as PhoneIcon,
  Users,
} from "lucide-react";
import { calendarDayOf, daysLeft, pegHealth, sessionOf } from "@/lib/story/engine";
import { outboundCalls } from "@/lib/story/calls";
import { SESSION_LABELS, sessionsOf } from "@/lib/story/lengths";
import { scenarioOf, seatLabelOf } from "@/lib/story/scenarios";
import { canPause, SILENCE_WARNING_EN, SILENCE_WARNING_ZH } from "@/lib/story/realtime";
import { economyIssue } from "@/lib/story/economy";
import { getRecoveryRating } from "@/lib/story/civic";
import { useStory } from "@/lib/story/store";
import type { Scenario, StoryRun } from "@/lib/story/types";
import { useI18n, useT } from "@/lib/i18n";
import { Coin3D } from "@/components/3d";
import { PhoneCall } from "./PhoneCall";
import { StoryDecisions } from "./StoryDecisions";
import { StoryEconomy, PausedEconomyOrders } from "./StoryEconomy";
import { StoryCivic } from "./StoryCivic";
import { StoryAtlas } from "./StoryAtlas";
import { StoryTimeline } from "./StoryTimeline";

type Desk = "overview" | "economy" | "civic" | "policy" | "wire";
export function StoryRoom() {
  const t = useT();
  const en = useI18n((s) => s.lang) === "en";
  const st = useStory();
  const { run, phone } = st;
  const [desk, setDesk] = useState<Desk>("overview");
  const [phoneOpen, setPhoneOpen] = useState<string | null>(null);
  const navigate = (next: Desk) => {
    setDesk(next);
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    window.scrollTo({ top: 0 });
    let raf = 0,
      last = performance.now(),
      saved = last;
    const flush = () => {
      const now = performance.now();
      useStory.getState().advanceTime((now - last) / 1000);
      last = now;
      return now;
    };
    const frame = () => {
      const now = performance.now();
      if (now - last >= 200) flush();
      if (now - saved >= 5000) {
        useStory.getState().persistRun();
        saved = now;
      }
      raf = requestAnimationFrame(frame);
    };
    const onHide = () => {
      flush();
      useStory.getState().persistRun();
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);
  if (!run) return null;
  const s = scenarioOf(run.scenarioId),
    lx = s.lexicon,
    health = pegHealth(run),
    issue = economyIssue(st.economy);
  const outbound = outboundCalls(run);
  const recovery = getRecoveryRating(st.civic);
  const clock = `${Math.floor(Math.ceil(st.secondsLeft) / 60)
    .toString()
    .padStart(2, "0")}:${(Math.ceil(st.secondsLeft) % 60).toString().padStart(2, "0")}`;
  const desks = [
    { id: "overview" as const, zh: "辖区总览", en: "Overview", icon: Landmark },
    { id: "economy" as const, zh: "产业与贸易", en: "Industry & trade", icon: Building2 },
    { id: "civic" as const, zh: "民生与议事", en: "Society & council", icon: Users },
    { id: "policy" as const, zh: "政策与机构", en: "Policy & institutions", icon: Activity },
    { id: "wire" as const, zh: "危机纪事", en: "Chronicle", icon: BookOpen },
  ];
  if (st.paused)
    return (
      <div className="cabinet-shell min-h-dvh bg-paper p-4 text-ink" data-testid="story-paused">
        <div className="mx-auto max-w-5xl">
          <header className="vic-panel mb-4 flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="vic-kicker">{en ? "TIME IS SUSPENDED" : "时间已冻结"}</p>
              <h1 className="text-2xl font-bold">
                {en ? "Paused · decisions only" : "暂停中 · 仅决策可见"}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {en
                  ? "Observations are hidden. Queued instructions execute after time resumes."
                  : "行情、辖区、报告与对话均已隐藏。所选意向在恢复时间后执行。"}
              </p>
            </div>
              <button className="vic-btn-seal" type="button" onClick={st.togglePause}>
              <Play className="size-4" />
              {en ? "Resume time" : "恢复时间"}
            </button>
          </header>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <PausedEconomyOrders />
              <StoryCivic paused />
            </div>
            <StoryDecisions />
          </div>
        </div>
      </div>
    );
  return (
    <main className="cabinet-shell min-h-dvh bg-paper text-ink">
      <header className="vic-topbar sticky top-0 z-30 border-b-2 border-brass-deep/60 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="vic-kicker">
                {en ? "LEO STREET · CRISIS CABINET" : "狮子街 · 危机内阁"}
              </p>
              <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold sm:text-2xl">
                <span aria-hidden="true" className="hidden shrink-0 sm:inline-flex">
                  <Coin3D size={34} glyph="£" spinning />
                </span>
                {en ? s.nameEn : s.nameZh}
                <span className="ml-3 hidden text-sm font-normal text-muted md:inline">
                  {s.year} · {en ? seatLabelOf(s, run.role).en : seatLabelOf(s, run.role).zh}
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-4" data-testid="story-clock">
              <div className="text-right">
                <p className="text-[10px] text-muted">
                  {en ? "Next market reckoning" : "下一次市场检验"}
                </p>
                <p className="font-mono text-xl font-bold tabular-nums" data-testid="deadline">
                  {clock}
                </p>
              </div>
              {canPause(run.length) ? (
                <button type="button" className="vic-btn-brass" onClick={st.togglePause}>
                  <Pause className="size-4" />
                  {en ? "Pause" : "暂停"}
                </button>
              ) : (
                <span className="rounded-md border border-line bg-surface px-3 py-2 text-xs font-bold">
                  {en ? "30m · no pause" : "30 分钟 · 不可暂停"}
                </span>
              )}
            </div>
          </div>
          <nav
            className="mt-4 flex gap-1 overflow-x-auto"
            aria-label={en ? "Cabinet departments" : "内阁分区"}
          >
            {desks.map((d) => (
              <button
                type="button"
                key={d.id}
                className={`cabinet-tab ${desk === d.id ? "cabinet-tab-active" : ""}`}
                aria-current={desk === d.id ? "page" : undefined}
                onClick={() => navigate(d.id)}
              >
                <d.icon className="size-4 shrink-0" />
                <span>{en ? d.en : d.zh}</span>
                {d.id === "civic" && st.civic.petition && (
                  <span className="rounded-full bg-down px-1.5 text-xs text-paper">1</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6">
        <StoryTimeline />
        <div className="vic-topbar mb-4 grid grid-cols-2 divide-line overflow-hidden rounded-md border border-line bg-surface shadow-[var(--shadow-border)] sm:grid-cols-3 lg:grid-cols-6">
          <Metric
            label={en ? lx.potEn : lx.potZh}
            value={Math.round(run.reserves).toLocaleString()}
          />
          <Metric
            label={en ? "Real income" : "实际收入"}
            value={st.economy.income.toFixed(1)}
            bad={st.economy.income < 65}
          />
          <Metric
            label={en ? "Employment" : "就业率"}
            value={`${st.economy.employment.toFixed(1)}%`}
            bad={st.economy.employment < 65}
          />
          <Metric
            label={en ? "Influence" : "协调力"}
            value={Math.round(st.civic.capital).toString()}
          />
          <Metric
            label={en ? lx.lineEn : lx.lineZh}
            value={gaugeText(run, s, en)}
            bad={health < 0.3}
          />
          <Metric
            label={en ? (lx.marketEn ?? "Market index") : (lx.marketZh ?? "股指")}
            value={run.equity.toFixed(1)}
            bad={run.equity < (s.objectives[run.role].equityFloor ?? 60)}
          />
        </div>
        <section
          className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 ${st.submitted === "orders" ? "border-line bg-surface" : "border-down/40 bg-down/5"}`}
          aria-label={en ? "Public response" : "公开回应"}
        >
          <div className="flex min-w-0 items-start gap-2">
            <Megaphone className="mt-0.5 size-4 shrink-0 text-teal" />
            <div>
              <p className="text-sm font-bold">
                {st.submitted === "orders"
                  ? en
                    ? "Public response on record"
                    : "本时段已公开回应"
                  : st.submitted === "silence"
                    ? en
                      ? "You have chosen silence"
                      : "你已选择保持沉默"
                    : en
                      ? "The market is waiting for your response"
                      : "市场正在等待你的公开回应"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {en
                  ? "Private operating decisions do not replace a public statement. Missing the deadline counts as silence."
                  : "经营安排不等于公开表态。到期未回应，会被市场认定为沉默。"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="vic-btn-brass" type="button" onClick={st.acknowledge}>
              <Check className="size-4" />
              {en ? "State: policy continues" : "声明维持现行政策"}
            </button>
            <button className="vic-btn-ghost text-down" type="button" onClick={st.keepSilent}>
              {en ? "Remain silent" : "保持沉默"}
            </button>
          </div>
          {st.submitted !== "orders" && (
            <p className="w-full text-xs font-bold text-down">
              {en ? SILENCE_WARNING_EN : SILENCE_WARNING_ZH}
            </p>
          )}
        </section>
        {phone && (
          <button
            type="button"
            onClick={() => setPhoneOpen(phone.script.id)}
            className="mb-4 flex min-h-14 w-full items-center gap-3 rounded-md border border-brass/60 bg-teal-deep p-3 text-left text-paper shadow-[var(--shadow-border)]"
          >
            <PhoneIcon className="size-5" />
            <span className="flex-1">
              <span className="block text-sm font-bold">
                {en ? phone.script.fromEn : phone.script.fromZh} ·{" "}
                {en ? "telephone awaiting attention" : "电话待处理"}
              </span>
              <span className="block text-xs opacity-75">
                {en
                  ? "Time continues. Unanswered calls expire at the market deadline."
                  : "时间继续流逝。请在市场检验前处理，否则记为沉默。"}
              </span>
            </span>
            <ArrowRight className="size-4" />
          </button>
        )}
        {desk === "overview" && (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="min-w-0">
              <details className="vic-panel mb-4 p-3">
                <summary className="min-h-8 cursor-pointer text-sm font-semibold text-teal-deep">
                  {en ? "Plain-language guide to this desk" : "看不懂数字？用大白话解释"}
                </summary>
                <dl className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
                  <div>
                    <dt className="font-bold">{en ? "Available funds" : "可用资金"}</dt>
                    <dd>
                      {en
                        ? "Money you can use now. Building and relief spend it; production and sales can refill it."
                        : "现在可以拿出来用的钱。建工厂、救急要花钱，生产和卖货会慢慢补回来。"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold">
                      {en ? "Real income / employment" : "实际收入 / 就业率"}
                    </dt>
                    <dd>
                      {en
                        ? "Income means what people can afford after prices change. Employment tells how many people have work."
                        : "收入看大家的钱能买多少东西；就业看有多少人有工作。物价涨得太快，工资一样也可能买得更少。"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold">{en ? "Market index / panic" : "市场指数 / 恐慌"}</dt>
                    <dd>
                      {en
                        ? "The index tracks market value against a starting point. Panic is how worried the market is. It is a game measure, not a headcount."
                        : "指数像市场价格的刻度尺；恐慌表示市场有多担心。恐慌太高会冲破防线，所以要看上方的目标值。"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold">{en ? "Influence / reserves" : "协调力 / 留余钱"}</dt>
                    <dd>
                      {en
                        ? "Influence helps bring groups into an agreement. Money and influence are limited: a helpful action now can leave less for later."
                        : "协调力用来推动大家达成协议。钱和协调力都有限：现在花光了，后面的急事就难办了。"}
                    </dd>
                  </div>
                </dl>
              </details>
              <div className="mb-3 flex items-end justify-between gap-2">
                <div>
                  <p className="vic-kicker">{en ? "A CITY IN YOUR HANDS" : "你手中的一座城"}</p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    {en ? "Every decision reaches someone" : "每个决定，都落在某个人身上"}
                  </h2>
                </div>
                <span className="hidden shrink-0 font-mono text-xs text-muted sm:block">
                  {stepLabel(run, s, en, t)}
                </span>
              </div>
              <StoryAtlas
                economy={st.economy}
                pressure={run.pressure}
                en={en}
                onManage={() => navigate("economy")}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <OverviewCard
                  n="01"
                  title={en ? "Keep the city working" : "让产业继续运转"}
                  body={en ? issue.en : issue.zh}
                  onClick={() => navigate("economy")}
                  en={en}
                />
                <OverviewCard
                  n="02"
                  title={en ? "Build a coalition" : "争取愿意合作的人"}
                  body={
                    st.civic.petition
                      ? en
                        ? "A new petition is waiting. Its answer changes who bears the cost of the crisis."
                        : "新的诉求正在等待答复。你的回答，决定谁来承担危机的代价。"
                      : en
                        ? "Workers, merchants and financiers judge results differently. Reform needs their support."
                        : "劳工、商会、金融机构对同一项政策有不同期待。改革需要他们的支持。"
                  }
                  onClick={() => navigate("civic")}
                  en={en}
                />
                <OverviewCard
                  n="03"
                  title={en ? "Prepare the defence" : "为下一次冲击留后手"}
                  body={en ? s.objectives[run.role].winEn : s.objectives[run.role].winZh}
                  onClick={() => navigate("policy")}
                  en={en}
                />
              </div>
            </section>
            <aside className="space-y-4">
              <section className="vic-frame rounded-md border border-paper/30 bg-teal-deep p-5 text-paper shadow-[var(--shadow-border),inset_0_0_40px_#00000040]">
                <p className="text-xs font-bold tracking-widest text-paper/60">
                  {en ? "YOUR MANDATE" : "这一局的使命"}
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {en ? s.objectives[run.role].winEn : s.objectives[run.role].winZh}
                </h2>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper/15">
                  <div
                    className="h-full bg-paper transition-[width]"
                    style={{ width: `${Math.max(0, health) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-paper/75">
                  {en ? "Historical sessions remaining" : "剩余历史时段"} {daysLeft(run)} ·{" "}
                  {en ? "Social milestones" : "民生里程碑"} {st.civic.achievements.length}
                </p>
              </section>
              <section className="vic-panel p-4">
                <p className="vic-kicker">
                  {en ? "RECOVERY, NOT JUST SURVIVAL" : "危机之后，生活如何"}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{en ? recovery.en : recovery.zh}</h2>
                <p
                  className="mt-2 text-sm text-brass"
                  aria-label={
                    en ? `${recovery.stars} of 3 recovery stars` : `复苏评级 ${recovery.stars} / 3`
                  }
                >
                  {"★".repeat(recovery.stars)}
                  {"☆".repeat(3 - recovery.stars)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {en
                    ? "The last minute's income and employment, together with lasting accords, determine the recovery rating."
                    : "这是额外民生评价，3 星不等于通关。通关需要满足上方金融条件；星级按最近一分钟的收入、就业和协定评价。"}
                </p>
                <button
                  type="button"
                  className="mt-3 min-h-11 text-xs font-bold text-teal-deep"
                  onClick={() => navigate("civic")}
                >
                  {en ? "View bonus social achievements →" : "查看额外民生成果 →"}
                </button>
              </section>
              <section className="vic-panel p-4">
                <h2 className="mb-3 font-bold">{en ? "Recent dispatch" : "刚刚发生"}</h2>
                {run.log.slice(0, 3).map((l, i) => (
                  <p
                    key={i}
                    className={`border-t border-line/40 py-2 text-xs leading-relaxed ${l.tone === "bad" ? "text-down" : "text-ink-soft"}`}
                  >
                    {en ? l.en : l.zh}
                  </p>
                ))}
                {!run.log.length && (
                  <p className="text-sm text-muted">
                    {en
                      ? "The offices are opening. The first reports will arrive shortly."
                      : "各部门已开始工作。第一批报告即将送达。"}
                  </p>
                )}
              </section>
            </aside>
          </div>
        )}
        {desk === "economy" && <StoryEconomy />}
        {desk === "civic" && (
          <>
            {st.economicNotice?.ok === false && (
              <p
                role="status"
                className="mb-3 rounded-lg border border-down/40 bg-down/5 p-3 text-sm text-down"
              >
                {en ? st.economicNotice.en : st.economicNotice.zh}
              </p>
            )}
            <StoryCivic />
          </>
        )}
        {desk === "policy" && (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <StoryDecisions />
            <aside className="space-y-4">
              <section className="vic-panel p-4">
                <h2 className="mb-3 font-bold">{en ? "Institutional lines" : "机构联络"}</h2>
                {outbound.length ? (
                  outbound.map((c) => (
                    <button
                      type="button"
                      disabled={!!phone}
                      key={c.id}
                      onClick={() => {
                        st.placeCall(c.id);
                        setPhoneOpen(c.id);
                      }}
                      className="mb-2 flex min-h-14 w-full items-center gap-2 rounded-md border border-line bg-surface p-3 text-left transition-colors hover:border-brass hover:bg-teal-soft disabled:opacity-40"
                    >
                      <PhoneIcon className="size-4 shrink-0" />
                      <span>
                        <span className="block text-sm font-bold">{en ? c.fromEn : c.fromZh}</span>
                        <span className="block text-xs text-muted">{en ? c.roleEn : c.roleZh}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    {en
                      ? "No outbound calls available in this session."
                      : "本时段没有新的可拨出电话。"}
                  </p>
                )}
              </section>
              <section
                className="vic-panel p-4"
                data-testid="stakeholders"
              >
                <h2 className="mb-3 font-bold">{en ? "Confidence in the response" : "应对信心"}</h2>
                <Metric
                  label={en ? "Banks" : "金融机构"}
                  value={Math.round(st.cabinet.banks).toString()}
                />
                <Metric
                  label={en ? "Businesses" : "企业"}
                  value={Math.round(st.cabinet.business).toString()}
                />
                <Metric
                  label={en ? "Public" : "公众"}
                  value={Math.round(st.cabinet.publicTrust).toString()}
                />
                <p className="mt-3 text-xs text-muted">
                  {en
                    ? "The council shows political support; these figures measure confidence in the crisis response."
                    : "议事厅体现政治支持；此处体现各方对危机应对的信心。"}
                </p>
              </section>
            </aside>
          </div>
        )}
        {desk === "wire" && (
          <section className="vic-panel mx-auto max-w-4xl p-5">
            <p className="vic-kicker">
              {en ? "THE RECORD YOU ARE WRITING" : "你正在写下的记录"}
            </p>
            <h2 className="vic-masthead my-2 text-2xl font-bold">{en ? "Crisis chronicle" : "危机纪事"}</h2>
            <div className="vic-divider" aria-hidden="true" />
            <p className="mb-5 text-sm text-muted">
              {en
                ? "Historical shocks and original simulated consequences are labeled in each dispatch."
                : "历史冲击与原创模拟后果分别标注；市场猜测不代表事实。"}
            </p>
            <ul className="space-y-0">
              {run.log.slice(0, 40).map((l, i) => (
                <li
                  key={`${l.day}-${i}`}
                  className="flex gap-3 border-b border-line/50 px-1 py-3 shadow-[inset_0_-1px_0_#ffffff40]"
                >
                  <span className="vic-letterpress shrink-0 pt-0.5 text-sm font-semibold tabular-nums">
                    {l.day.toString().padStart(2, "0")}
                  </span>
                  <p
                    className={`text-sm leading-relaxed ${l.tone === "bad" ? "text-down" : l.tone === "good" ? "text-teal-deep" : "text-ink"}`}
                  >
                    {en ? l.en : l.zh}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
          <span>
            {en
              ? "Original fictional society simulation · historical context in the briefing"
              : "原创架空社会模拟 · 历史背景见前情提要"}
          </span>
          <button type="button" className="min-h-11 underline" onClick={st.exit}>
            {en ? "Abandon this crisis" : "放弃这一关"}
          </button>
        </footer>
      </div>
      {phone && phoneOpen === phone.script.id && (
        <PhoneCall onMinimize={() => setPhoneOpen(null)} />
      )}
    </main>
  );
}
function Metric({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="min-w-0 border-t-[3px] border-double border-brass/70 bg-gradient-to-b from-paper/60 to-transparent px-4 py-3">
      <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${bad ? "text-down" : "text-ink"}`}
      >
        <span className="vic-letterpress" style={{ color: "inherit" }}>
          {value}
        </span>
      </p>
    </div>
  );
}
function OverviewCard({
  n,
  title,
  body,
  onClick,
  en,
}: {
  n: string;
  title: string;
  body: string;
  onClick: () => void;
  en: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="vic-panel group flex min-h-44 flex-col p-4 text-left transition-colors hover:bg-teal-soft"
    >
      <span className="font-mono text-xs text-muted">{n}</span>
      <h3 className="mt-2 font-bold">{title}</h3>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">{body}</p>
      <span className="mt-4 flex items-center gap-1 text-xs font-bold text-teal-deep">
        {en ? "Open desk" : "前往处理"}
        <ArrowRight className="size-3" />
      </span>
    </button>
  );
}
/** "Day 4 of 12" at the reference telling, "Day 4 of 12 · Midday" once the day is cut up. */
function stepLabel(
  run: StoryRun,
  s: Scenario,
  en: boolean,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  const sessions = sessionsOf(s, run.length);
  const of = Math.ceil(run.days / sessions);
  // A finished run sits one step past the end. Clamp, or the header behind the
  // debrief reads "day 9 of 8".
  const day = Math.min(calendarDayOf(run), of);
  if (sessions <= 1) return t("sr.day", { n: day, of });
  const label = SESSION_LABELS[Math.min(sessionOf(run), SESSION_LABELS.length - 1)]!;
  return t("sr.sessionOf", { d: day, of, s: en ? label.en : label.zh });
}

/**
 * What the gauge actually shows.
 *
 * A peg has a rate and a band, so show both. A sovereign spread is a yield, so
 * show a percentage. Everything else has no price at all — 1907 was never
 * about a number — so show how far the panic is from taking the line out.
 */
function gaugeText(run: StoryRun, s: Scenario, en: boolean): string {
  if (s.kind === "peg") return `${run.spot.toFixed(3)} / ${s.pegRate.toFixed(2)}`;
  if (s.kind === "sovereign") return `${run.spot.toFixed(2)}%`;
  const at = Math.round(Math.min(1, run.pressure) * 100);
  return en ? `${at}% of the way` : `已到 ${at}%`;
}
