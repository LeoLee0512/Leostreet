import { useState } from "react";
import { sfxClick } from "@/lib/game/audio";
import { PROFILES } from "@/lib/sandbox/countries";
import { FOCUS, FOCUS_BY_ID, focusAvailable } from "@/lib/sandbox/focus";
import { has } from "@/lib/sandbox/sim";
import { useSandbox } from "@/lib/sandbox/store";
import type { Action, SandboxGame } from "@/lib/sandbox/types";
import { cn } from "@/lib/utils";
import { btn, btnOn, pct, tx } from "./format";
import { Locked, Meter, Section } from "./ui";

type Tab = "money" | "stability" | "fx" | "focus";

/** The governor's desk: every lever, grouped the way a central bank is. */
export function PolicyDesk({ game, en, onOpenTree }: { game: SandboxGame; en: boolean; onOpenTree: () => void }) {
  const [tab, setTab] = useState<Tab>("money");
  const tabs: [Tab, string][] = [
    ["money", en ? "Monetary" : "货币"],
    ["stability", en ? "Stability" : "稳定"],
    ["fx", en ? "External" : "对外"],
    ["focus", en ? "Reforms" : "国策"],
  ];
  return (
    <div>
      <div role="tablist" className="grid grid-cols-4 gap-1 rounded-[3px] border border-line bg-paper-deep p-0.5">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => {
              sfxClick();
              setTab(id);
            }}
            className={cn("rounded-[2px] py-1.5 text-xs font-bold", tab === id ? "bg-surface text-ink shadow-[var(--shadow-border)]" : "text-muted hover:text-ink")}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {tab === "money" ? <Monetary game={game} en={en} /> : null}
        {tab === "stability" ? <Stability game={game} en={en} /> : null}
        {tab === "fx" ? <Currency game={game} en={en} /> : null}
        {tab === "focus" ? <Reforms game={game} en={en} onOpenTree={onOpenTree} /> : null}
      </div>
    </div>
  );
}

function useAct() {
  const run = useSandbox((s) => s.act);
  return (a: Action) => {
    sfxClick();
    run(a);
  };
}

function Monetary({ game, en }: { game: SandboxGame; en: boolean }) {
  const go = useAct();
  const m = game.countries[game.player];
  const p = PROFILES[game.player];
  const neutral = p.rStar + p.piStar;
  const g = game.guidance;
  return (
    <>
      <Section title={en ? "Policy rate" : "政策利率"} aside={<span className="text-[11px] text-muted">{en ? "neutral" : "中性"} ≈ {pct(neutral, 1)}</span>}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-3xl font-bold tabular-nums">{pct(m.rate, 2)}</span>
          <span className="text-right text-[11px] leading-tight text-muted">
            {en ? "real" : "实际利率"} {pct(m.rate - m.piE, 1)}
            <br />
            {m.stance > 0.3 ? (en ? "tight" : "偏紧") : m.stance < -0.3 ? (en ? "loose" : "偏松") : en ? "neutral" : "中性"}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {[-0.5, -0.25, 0.25, 0.5].map((d) => (
            <button key={d} type="button" className={btn} onClick={() => go({ type: "rate", delta: d })}>
              {d > 0 ? "+" : "−"}
              {Math.abs(d).toFixed(2)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={en ? "Reserve requirement" : "存款准备金率"}>
        <div className="flex items-center gap-2">
          <button type="button" className={btn} onClick={() => go({ type: "rrr", delta: -0.5 })}>
            −0.5
          </button>
          <span className="flex-1 text-center font-mono text-lg font-bold tabular-nums">{pct(m.rrr, 1)}</span>
          <button type="button" className={btn} onClick={() => go({ type: "rrr", delta: 0.5 })}>
            +0.5
          </button>
        </div>
      </Section>

      <Section title={en ? "Bond purchases" : "购债（量化宽松）"} aside={<span className="font-mono text-[11px] text-muted">{pct(m.qe, 1)} GDP</span>}>
        <div className="grid grid-cols-4 gap-1">
          {[
            [-2, en ? "Sell" : "缩表"],
            [0, en ? "Stop" : "停止"],
            [2, en ? "Mild" : "温和"],
            [5, en ? "Large" : "大规模"],
          ].map(([pace, label]) => (
            <button
              key={pace}
              type="button"
              className={cn(btn, "text-xs", m.qePace === pace && btnOn)}
              disabled={(pace as number) > 0 && !has(game, "qeTools")}
              onClick={() => go({ type: "qe", pace: pace as number })}
            >
              {label}
            </button>
          ))}
        </div>
        {!has(game, "qeTools") ? <Locked text={en ? "Needs the 'QE toolkit' reform" : "需要国策「量化宽松工具」"} /> : null}
      </Section>

      <Section title={en ? "Forward guidance" : "前瞻指引"}>
        {g ? (
          <p className="rounded-[3px] border border-brass-deep bg-[#f3e2b4] px-2 py-1.5 text-xs">
            {g.kind === "dovish" ? (en ? "Pledged: no hikes" : "已承诺：不加息") : en ? "Pledged: no cuts until target" : "已承诺：达标前不降息"} ·{" "}
            {en ? `${g.until - game.week} weeks left` : `剩 ${g.until - game.week} 周`}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            <button type="button" className={cn(btn, "text-xs")} disabled={!has(game, "guidance")} onClick={() => go({ type: "guidance", kind: "dovish" })}>
              {en ? "Dovish pledge" : "鸽派承诺"}
            </button>
            <button type="button" className={cn(btn, "text-xs")} disabled={!has(game, "guidance")} onClick={() => go({ type: "guidance", kind: "hawkish" })}>
              {en ? "Hawkish pledge" : "鹰派承诺"}
            </button>
          </div>
        )}
        {!has(game, "guidance") ? <Locked text={en ? "Needs the 'Forward guidance' reform" : "需要国策「前瞻指引」"} /> : <p className="mt-1 text-[11px] text-muted">{en ? "25 capital · 26 weeks · breaking it costs trust" : "25 公信力 · 26 周 · 违约重罚信誉"}</p>}
      </Section>
    </>
  );
}

function Stability({ game, en }: { game: SandboxGame; en: boolean }) {
  const go = useAct();
  const m = game.countries[game.player];
  const bank = m.bank * 100;
  const froth = m.bubble * 100;
  return (
    <>
      <Section title={en ? "Banking system" : "银行体系"}>
        <Meter label={en ? "Bank health" : "银行健康度"} value={bank} tone={bank > 70 ? "good" : bank > 50 ? "warn" : "bad"} />
        <Meter label={en ? "Asset froth" : "资产泡沫"} value={froth} tone={froth < 40 ? "good" : froth < 60 ? "warn" : "bad"} />
        <p className="mt-2 text-xs text-ink-soft">
          {en ? "Credit growth" : "信贷增速"} <b className="font-mono">{pct(m.credit)}</b> · {en ? "equities" : "股指"} <b className="font-mono">{Math.round(m.equity)}</b>
        </p>
      </Section>
      <Section title={en ? "Credit cap" : "信贷上限（宏观审慎）"}>
        <button type="button" className={cn(btn, "w-full", game.macroCap && btnOn)} disabled={!has(game, "macroprudential")} onClick={() => go({ type: "macroCap", on: !game.macroCap })}>
          {game.macroCap ? (en ? "On: credit growth −3 pts" : "已启用：信贷增速 −3") : en ? "Switch on" : "启用"}
        </button>
        {!has(game, "macroprudential") ? <Locked text={en ? "Needs the 'Macroprudential policy' reform" : "需要国策「宏观审慎」"} /> : null}
      </Section>
      <Section title={en ? "Lender of last resort" : "最后贷款人"}>
        <p className="text-xs leading-relaxed text-ink-soft">
          {en
            ? "When depositors queue, you will be asked to choose: lend freely, bail out, or let banks fail."
            : "一旦出现挤兑，你会被要求当场抉择：敞开放贷、政府救助，还是让银行倒闭。"}
          {has(game, "depositInsurance") ? (en ? " Deposit insurance halves the odds of a run." : " 存款保险已让挤兑概率减半。") : ""}
        </p>
      </Section>
    </>
  );
}

function Currency({ game, en }: { game: SandboxGame; en: boolean }) {
  const go = useAct();
  const m = game.countries[game.player];
  const p = PROFILES[game.player];
  return (
    <>
      <Section title={tx(p.currency, en)}>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {[
            [en ? "Index" : "汇率指数", m.fx.toFixed(1)],
            [en ? "Year on year" : "年变化", `${m.fxYoY >= 0 ? "+" : ""}${m.fxYoY.toFixed(1)}%`],
            [en ? "Reserves" : "外汇储备", pct(m.reserves, 1)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[3px] border border-line bg-surface py-1.5">
              <div className="text-[10px] text-muted">{k}</div>
              <div className="font-mono text-sm font-bold tabular-nums">{v}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title={en ? "Intervene" : "外汇干预"}>
        <div className="grid grid-cols-2 gap-1">
          <button type="button" className={cn(btn, "text-xs")} onClick={() => go({ type: "intervene", side: "buy" })}>
            {en ? "Buy own currency" : "买入本币（托汇率）"}
          </button>
          <button type="button" className={cn(btn, "text-xs")} onClick={() => go({ type: "intervene", side: "sell" })}>
            {en ? "Sell own currency" : "卖出本币（压汇率）"}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-muted">{en ? "Each move: 1% of GDP in reserves, about 1.6 index points" : "每次动用 1% GDP 储备，汇率约 ±1.6"}</p>
      </Section>
      <Section title={en ? "Capital controls" : "资本管制"}>
        <button type="button" className={cn(btn, "w-full", game.capitalControls && btnOn)} onClick={() => go({ type: "capitalControls", on: !game.capitalControls })}>
          {game.capitalControls ? (en ? "In force — lift" : "生效中 — 解除") : en ? "Impose (30 capital)" : "实施（30 公信力）"}
        </button>
        <p className="mt-1 text-[11px] text-muted">{en ? "Halves risk premium and currency swings; costs growth and trust." : "风险溢价与汇率波动减半；代价是增长与信誉。"}</p>
      </Section>
      <Section title={en ? "Other central banks" : "国际合作"}>
        <button type="button" className={cn(btn, "w-full text-xs")} disabled={!has(game, "swapLines")} onClick={() => go({ type: "requestSwap" })}>
          {en ? "Draw on swap lines (20 capital, +5% GDP reserves)" : "动用互换额度（20 公信力，储备 +5% GDP）"}
        </button>
        {!has(game, "swapLines") ? <Locked text={en ? "Needs the 'Swap lines' reform" : "需要国策「国际互换额度」"} /> : null}
        <div className="mt-2 grid grid-cols-2 gap-1">
          <button type="button" className={cn(btn, "text-xs")} disabled={!has(game, "intlCoop")} onClick={() => go({ type: "coordinate", dir: "cut" })}>
            {en ? "Propose joint cut" : "提议联合降息"}
          </button>
          <button type="button" className={cn(btn, "text-xs")} disabled={!has(game, "intlCoop")} onClick={() => go({ type: "coordinate", dir: "hike" })}>
            {en ? "Propose joint hike" : "提议联合加息"}
          </button>
        </div>
        {!has(game, "intlCoop") ? (
          <Locked text={en ? "Needs the 'Central-bank cooperation' reform" : "需要国策「国际央行合作」"} />
        ) : (
          <p className="mt-1 text-[11px] text-muted">{en ? "40 capital. Each bank joins only if its own economy agrees." : "40 公信力。各国只在本国经济需要时才会加入。"}</p>
        )}
      </Section>
    </>
  );
}

function Reforms({ game, en, onOpenTree }: { game: SandboxGame; en: boolean; onOpenTree: () => void }) {
  const go = useAct();
  const active = game.focusActive;
  const ready = FOCUS.filter((f) => focusAvailable(game.focusDone, f.id));
  return (
    <>
      <p className="text-xs text-ink-soft">
        {en ? "Political capital" : "公信力"} <b className="font-mono text-base text-ink">{Math.floor(game.points)}</b> ·{" "}
        {en ? `${game.focusDone.length}/${FOCUS.length} done` : `已完成 ${game.focusDone.length}/${FOCUS.length}`}
      </p>
      {active ? (
        <div className="mt-2 rounded-[3px] border border-brass-deep bg-[#f3e2b4] px-2.5 py-2">
          <p className="text-sm font-bold">{tx(FOCUS_BY_ID[active.id].name, en)}</p>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-paper-deep">
            <span className="block h-full bg-brass" style={{ width: `${((FOCUS_BY_ID[active.id].weeks - active.left) / FOCUS_BY_ID[active.id].weeks) * 100}%` }} />
          </span>
          <p className="mt-1 text-[11px] text-muted">{en ? `${active.left} weeks left` : `还剩 ${active.left} 周`}</p>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => {
          sfxClick();
          onOpenTree();
        }}
        className="mt-3 w-full rounded-[3px] border border-brass-deep bg-gradient-to-b from-[#ecd08a] to-[#b98f34] px-3 py-2.5 font-display font-semibold tracking-[0.15em] shadow-[inset_0_1px_0_#fff6] active:scale-[0.99]"
      >
        {en ? "Open the reform tree" : "打开国策树"}
      </button>
      {!active && ready.length ? (
        <Section title={en ? "Ready to start" : "现在可推进"}>
          <ul className="grid gap-1">
            {ready.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => go({ type: "focus", id: f.id })} className={cn(btn, "w-full justify-between text-xs")}>
                  <span>{tx(f.name, en)}</span>
                  <span className={cn("font-mono", game.points < f.cost && "text-down")}>
                    {f.cost} · {f.weeks}
                    {en ? "w" : "周"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
