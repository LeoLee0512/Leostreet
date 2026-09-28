import { useState } from "react";
import { Coin3D } from "@/components/3d";
import { Button } from "@/components/ui/button";
import { BUILD_COST, COMPANY_META, PERMIT_FEE, PLOT_SEED, PROJECT_SEEDS, SECTOR_KEY, SHOP_ITEMS } from "@/lib/game/catalog";
import type { PayOrder } from "@/lib/game/pay";
import { StorefrontShelf } from "./Storefront";
import {
  analystOn,
  compoundRate,
  countryCcy,
  creditOf,
  dayOf,
  isCreditBanned,
  isDelinquent,
  liquidFunds,
  loanCapacity,
  loanRateOf,
  maxLeverage,
  netWorth,
  prestige,
  raiseCapacity,
  raiseCooldownLeft,
  simpleRate,
  streetPoolOf,
  toLeo,
  visibleNews,
  worldGdpOf,
} from "@/lib/game/economy";
import { asCountry, COUNTRY, policyRateOf, tariffOf } from "@/lib/game/countries";
import { compactCcy, compactUsd, leo, pct, ratePct, usd } from "@/lib/game/format";
import { sfxBad, sfxGood } from "@/lib/game/audio";
import { useGame } from "@/lib/game/store";
import type { ProjectKind } from "@/lib/game/types";
import { useI18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Err, Field, PanelShell, Tabs } from "./PanelShell";
import { HeroSprite } from "./HeroSprite";
import { KLineChart } from "./KLineChart";
import { PayCashier } from "./WorldPanels";

export function BankPanel() {
  const t = useT();
  const s = useGame();
  const [tab, setTab] = useState("simple");
  const [amt, setAmt] = useState(5000);
  const [err, setErr] = useState<string | null>(null);
  const act = (fn: () => string | null) => {
    const e = fn();
    setErr(e);
    if (e) sfxBad();
    else sfxGood();
  };
  const sr = simpleRate(s.fedRate);
  const cr = compoundRate(s.fedRate);
  const n = Math.max(1, amt);
  const years = 5;
  const days = 365 * years;
  const projS = n * (1 + sr * years);
  const projC = n * (1 + cr / 365) ** days;
  const apr = loanRateOf(s);
  const daily = s.bankLoan * (apr / 365);
  const cap = loanCapacity(s);
  const credit = creditOf(s);
  const status = isCreditBanned(s)
    ? t("bank.ban", { n: s.creditBanUntilDay })
    : s.inDefault || isDelinquent(s)
      ? t("bank.def")
      : (s.loanMissedDays ?? 0) > 0
        ? t("bank.late", { n: s.loanMissedDays })
        : t("bank.ok");
  return (
    <PanelShell title={t("bank.title")} subtitle={t("bank.sub")}>
      <div className="mb-4 flex items-center gap-3">
        <Coin3D size={52} glyph="£" spinning className="shrink-0" />
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 text-sm">
          <Stat k={t("bank.sr")} v={ratePct(sr)} />
          <Stat k={t("bank.cr")} v={ratePct(cr)} />
          <Stat k={t("bank.lr")} v={ratePct(apr)} />
          <Stat k={t("bank.accrued")} v={usd(s.simpleAccrued, 2)} />
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "simple", label: t("hud.simple") },
          { id: "compound", label: t("hud.compound") },
          { id: "loan", label: t("bank.loan") },
        ]}
      />
      <Field label={t("bank.amount")} value={amt} onChange={setAmt} min={1} step={500} />
      <Err text={err} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {tab === "loan" ? (
          <>
            <Button onClick={() => act(() => s.takeLoan(amt))}>{t("bank.borrow")}</Button>
            <Button variant="secondary" onClick={() => act(() => s.repayLoan(amt))}>
              {t("bank.repay")}
            </Button>
            <Button
              className="col-span-2"
              variant="secondary"
              disabled={s.bankLoan <= 0}
              onClick={() => act(() => s.repayLoan(Number.POSITIVE_INFINITY))}
            >
              {t("bank.repayAll")} · {usd(Math.min(s.bankLoan, liquidFunds(s)), 0)}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => act(() => s.deposit(tab === "simple" ? "simple" : "compound", amt))}>
              {t("bank.in")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => act(() => s.withdraw(tab === "simple" ? "simple" : "compound", amt))}
            >
              {t("bank.out")}
            </Button>
          </>
        )}
      </div>
      {tab === "loan" ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Stat k={t("bank.owed")} v={usd(s.bankLoan, 0)} />
          <Stat k={t("bank.cap")} v={usd(cap, 0)} />
          <Stat k={t("bank.daily")} v={usd(daily, 2)} />
          <Stat k={t("bank.credit")} v={`${credit}`} />
          <div className="col-span-2">
            <Stat k={t("bank.status")} v={status} />
          </div>
          <p className="col-span-2 mt-1 text-xs leading-relaxed text-muted">{t("bank.hint")}</p>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-[3px] border border-line/80 bg-paper px-3 py-2 text-xs">
            <p className="font-bold text-muted">{t("bank.proj")}</p>
            <p className="mt-1 font-mono">
              {t("bank.projS", { n: usd(projS, 0) })} · {t("bank.projC", { n: usd(projC, 0) })}
            </p>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">{t("bank.why")}</p>
        </>
      )}
    </PanelShell>
  );
}

export function NewsPanel() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const s = useGame();
  const items = visibleNews(s);
  const exclusive = s.shop.quantServer && s.shop.serverAt === "exchange";
  const notes = analystOn(s);
  const home = asCountry(s.homeCountry ?? s.street);
  const [tab, setTab] = useState<"local" | "intl">("local");
  const local = items.filter((n) => asCountry(n.country ?? home) === home);
  const intl = items.filter((n) => asCountry(n.country ?? home) !== home);
  const shown = tab === "local" ? local : intl;
  return (
    <PanelShell title={t("news.title")} subtitle={exclusive ? t("news.subOn") : t("news.subOff")}>
      {exclusive ? (
        <p className="mb-3 rounded-[3px] border border-teal/40 bg-teal-soft px-3 py-2 text-xs font-bold text-teal-deep">{t("news.pipe")}</p>
      ) : null}
      <Tabs
        value={tab}
        onChange={(v) => setTab(v as "local" | "intl")}
        items={[
          { id: "local", label: t("news.local") },
          { id: "intl", label: t("news.intl") },
        ]}
      />
      <div className="mt-3 space-y-3">
        {shown.length === 0 ? <p className="text-sm text-muted">{t("news.empty")}</p> : null}
        {shown.map((n) => (
          <article key={n.id} className="rounded-[3px] border border-line/80 bg-paper p-3">
            <p className="border-b border-line/60 pb-1 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-brass-deep">
              D{dayOf(n.tick)} · {t(`world.${asCountry(n.country ?? home)}Short`)}{" "}
              {tab === "intl" ? `· ${t("news.intlTag")}` : `· ${t("news.localTag")}`}{" "}
              {n.exclusive ? `· ${t("news.ex")}` : ""}{" "}
              {n.visibleTick < n.impactTick ? `· ${t("news.pending")}` : ""}
              {n.rumor && notes ? ` · ${t("news.rumor")}` : ""}
            </p>
            <h3 className="mt-1 text-sm font-bold">{lang === "en" ? n.headlineEn : n.headlineZh}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{lang === "en" ? n.bodyEn : n.bodyZh}</p>
          </article>
        ))}
      </div>
    </PanelShell>
  );
}

export function ShopPanel() {
  const t = useT();
  const s = useGame();
  const [err, setErr] = useState<string | null>(null);
  const [order, setOrder] = useState<PayOrder | null>(null);
  const owned = (id: string) => {
    if (id === "quant-server") return s.shop.quantServer;
    if (id === "hft") return s.shop.hft;
    if (id === "satellite") return s.shop.satellite;
    if (id === "renovation") return s.shop.renovation;
    if (id === "license") return s.career === "broker" || s.shop.license;
    if (id === "install-exchange") return s.shop.serverAt === "exchange";
    if (id === "install-office") return s.shop.serverAt === "office";
    return false;
  };
  return (
    <PanelShell title={t("shop.title")} subtitle={t("shop.sub")}>
      <Err text={err} />
      <div className="space-y-2">
        {SHOP_ITEMS.map((it) => (
          <div key={it.id} className="flex items-start justify-between gap-3 rounded-[3px] border border-line/80 bg-paper p-3">
            <div>
              <p className="text-sm font-bold">{t(it.nameKey)}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t(it.blurbKey)}</p>
              <p className="mt-1 font-mono text-xs font-semibold">{it.price > 0 ? usd(it.price, 0) : t("shop.act")}</p>
            </div>
            <Button
              size="sm"
              variant={owned(it.id) ? "secondary" : "primary"}
              disabled={owned(it.id)}
              onClick={() => {
                const e = s.buyShop(it.id);
                setErr(e);
                if (e) sfxBad();
                else sfxGood();
              }}
            >
              {owned(it.id) ? t("shop.have") : t("shop.buy")}
            </Button>
          </div>
        ))}
      </div>
      <StorefrontShelf onOrder={setOrder} />
      {order ? (
        <PayCashier
          order={order}
          onClose={() => setOrder(null)}
          onPaid={() => {
            setOrder(null);
            sfxGood();
          }}
        />
      ) : null}
    </PanelShell>
  );
}

export function RealtyPanel() {
  const t = useT();
  const s = useGame();
  const [err, setErr] = useState<string | null>(null);
  return (
    <PanelShell title={t("real.title")} subtitle={t("real.sub")}>
      <Err text={err} />
      <div className="space-y-3">
        {s.properties.map((p) => {
          const held = s.ownedProps.find((h) => h.id === p.id);
          const chg = p.price / p.basePrice - 1;
          return (
            <div key={p.id} className="rounded-[3px] border border-line/80 bg-paper p-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-sm font-bold">{p.id.startsWith("built-") ? p.name : t(`pr.${p.id}`)}</p>
                  <p className="text-xs text-muted">
                    {p.id.startsWith("built-") ? p.district : t(`pd.${p.id}`)} · {t("real.rent", { n: usd(p.rentPerDay, 0) })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold">{compactUsd(p.price)}</p>
                  <p className={cn("text-[11px] font-bold", chg >= 0 ? "tick-up" : "tick-down")}>{pct(chg)}</p>
                </div>
              </div>
              <KLineChart data={p.history} className="h-16 w-full" />
              {held ? (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-muted">{t("real.mtg", { n: compactUsd(held.mortgage) })}</p>
                  <Button size="sm" variant="secondary" onClick={() => setErr(s.sellProperty(p.id))}>
                    {t("real.sell")}
                  </Button>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const e = s.buyProperty(p.id, 0.8);
                      setErr(e);
                      if (e) sfxBad();
                      else sfxGood();
                    }}
                  >
                    {t("real.levBuy")}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const e = s.buyProperty(p.id, 0);
                      setErr(e);
                      if (e) sfxBad();
                      else sfxGood();
                    }}
                  >
                    {t("real.cashBuy")}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-5 vic-kicker">{t("real.plots")}</p>
      <div className="mt-2 space-y-2">
        {PLOT_SEED.map((seed) => {
          const plot = s.plots.find((x) => x.id === seed.id)!;
          const stageLabel = !plot.owned
            ? `${leo(seed.price, 0)} · ${t("real.deed", { n: "3%" })}`
            : plot.stage >= 5
              ? t("real.stage5")
              : plot.stage > 0
                ? `${t("real.stage" + plot.stage)} · ${t("real.permit", { c: leo(BUILD_COST, 0), p: leo(PERMIT_FEE, 0) })}`
                : t("real.stage0");
          return (
            <div key={seed.id} className="flex items-center justify-between gap-3 rounded-[3px] border border-line/80 bg-paper px-3 py-2">
              <div>
                <p className="text-sm font-bold">{t(`plot.${seed.id}`)}</p>
                <p className="text-xs text-muted">{stageLabel}</p>
              </div>
              {!plot.owned ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const e = s.buyPlot(seed.id);
                    setErr(e);
                    if (e) sfxBad();
                    else sfxGood();
                  }}
                >
                  {t("real.buyPlot")}
                </Button>
              ) : plot.stage === 0 ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const e = s.startBuild(seed.id);
                    setErr(e);
                    if (e) sfxBad();
                    else sfxGood();
                  }}
                >
                  {t("real.build")}
                </Button>
              ) : (
                <span className={cn("text-xs font-bold", plot.stage >= 5 ? "text-up" : "text-teal-deep")}>{stageLabel}</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">{t("real.taxNote")}</p>
    </PanelShell>
  );
}

export function OfficePanel() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const s = useGame();
  const nw = netWorth(s);
  const licensed = s.career === "broker" || s.shop.license;
  return (
    <PanelShell title={t("off.title", { name: s.name })} subtitle={s.shop.renovation ? t("off.subOn") : t("off.subOff")}>
      <div className="mb-4 flex items-center gap-3">
        <HeroSprite gender={s.gender === "female" ? "female" : "male"} className="h-24 w-20" />
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold">{s.name}</p>
          <p className="text-xs font-bold text-muted">{t("off.id", { id: s.playerId })}</p>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Stat k={t("off.nav")} v={compactUsd(nw)} />
        <Stat k={t("off.pres")} v={prestige(s).toFixed(0)} />
        <Stat k={t("off.lev")} v={`${maxLeverage(s)}x`} />
        <Stat k={t("off.role")} v={s.career === "governor" ? t("title.gov") : licensed ? t("title.broker") : t("title.retail")} />
        <Stat k={t("off.credit")} v={`${creditOf(s)}`} />
        <Stat k={t("hud.loan")} v={compactUsd(s.bankLoan)} />
      </div>
      <p className="mt-4 vic-kicker">{t("off.quant")}</p>
      {!s.shop.quantServer ? (
        <p className="mt-2 text-sm text-muted">{t("off.need")}</p>
      ) : (
        <div className="mt-2 space-y-2">
          <Toggle label={t("off.mom")} on={s.quant.momentum} onClick={() => s.setQuant({ momentum: !s.quant.momentum })} />
          <Toggle label={t("off.mr")} on={s.quant.meanRev} onClick={() => s.setQuant({ meanRev: !s.quant.meanRev })} />
          <Toggle
            label={t("off.nh")}
            on={s.quant.newsHunter}
            onClick={() => s.setQuant({ newsHunter: !s.quant.newsHunter })}
          />
          <Toggle label={t("off.grid")} on={s.quant.grid} onClick={() => s.setQuant({ grid: !s.quant.grid })} />
          <label className="block pt-2 text-xs font-bold text-muted">
            {t("off.alloc", { n: s.quant.allocPct })}
            <input
              type="range"
              min={5}
              max={60}
              value={s.quant.allocPct}
              onChange={(e) => s.setQuant({ allocPct: Number(e.target.value) })}
              className="mt-2 w-full"
            />
          </label>
          {s.shop.hft ? <p className="text-xs font-bold text-up">{t("off.hft")}</p> : null}
        </div>
      )}
      <p className="mt-5 vic-kicker">{t("off.log")}</p>
      <ul className="mt-2 space-y-1">
        {s.log.slice(0, 12).map((l, i) => (
          <li key={i} className={cn("text-xs", l.tone === "bad" ? "text-down" : l.tone === "good" ? "text-up" : "text-muted")}>
            D{dayOf(l.tick)} {lang === "en" ? l.en : l.zh}
          </li>
        ))}
      </ul>
      <Button className="mt-5" variant="secondary" onClick={() => s.retire()}>
        {t("off.retire")}
      </Button>
    </PanelShell>
  );
}

export function BrokerPanel() {
  const t = useT();
  const s = useGame();
  const licensed = s.career === "broker" || s.shop.license;
  return (
    <PanelShell title={t("br.title")} subtitle={t("br.sub")}>
      {!licensed ? (
        <p className="text-sm text-muted">{t("br.need")}</p>
      ) : (
        <div className="space-y-3">
          <Stat k={t("br.aum")} v={compactUsd(s.fundAum)} />
          {s.clients.map((c) => (
            <div key={c.id} className="rounded-[3px] border border-line/80 bg-paper px-3 py-2">
              <p className="text-sm font-bold">{c.name}</p>
              <p className="text-xs text-muted">
                AUM {compactUsd(c.aum)} · {t("br.mood", { n: (c.mood * 100).toFixed(0) })}
              </p>
            </div>
          ))}
          {s.clients.length === 0 ? <p className="text-sm text-muted">{t("br.empty")}</p> : null}
        </div>
      )}
    </PanelShell>
  );
}

export function VcPanel() {
  const t = useT();
  const s = useGame();
  const [tab, setTab] = useState("raise");
  const [msg, setMsg] = useState<string | null>(null);
  const cap = raiseCapacity(s);
  const cd = raiseCooldownLeft(s);
  return (
    <PanelShell title={t("vc.title")} subtitle={t("vc.sub")}>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "raise", label: t("vc.tabRaise") },
          { id: "projects", label: t("vc.tabProjects") },
        ]}
      />
      {tab === "projects" ? (
        <ProjectsTab />
      ) : (
        <>
      <p className="text-sm leading-relaxed text-muted">{t("vc.body")}</p>
      <p className="mt-3 text-sm">{t("vc.now", { p: prestige(s).toFixed(0), n: compactUsd(netWorth(s)) })}</p>
      <p className="mt-1 text-sm text-muted">
        {t("vc.pool", { n: compactUsd(streetPoolOf(s)), c: s.raiseCount ?? 0 })}
      </p>
      {cd > 0 ? (
        <p className="mt-1 text-sm text-down">{t("vc.cd", { n: Math.ceil(cd) })}</p>
      ) : cap.maxAdd > 0 ? (
        <p className="mt-1 text-sm">{t("vc.room", { n: compactUsd(cap.maxAdd) })}</p>
      ) : null}
      {msg ? (
        <p className={cn("mt-2 text-sm font-semibold", msg.startsWith("err.") ? "text-down" : "text-up")}>{t(msg)}</p>
      ) : null}
      <Button
        className="mt-4"
        onClick={() => {
          const e = s.raiseFund();
          if (e) {
            setMsg(e);
            sfxBad();
          } else {
            setMsg("vc.ok");
            sfxGood();
          }
        }}
      >
        {t("vc.go")}
      </Button>
        </>
      )}
    </PanelShell>
  );
}

function ProjectsTab() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const s = useGame();
  const [err, setErr] = useState<string | null>(null);
  const kinds: { id: ProjectKind; label: string }[] = [
    { id: "virtual", label: t("pj.virtual") },
    { id: "infra", label: t("pj.infra") },
    { id: "research", label: t("pj.research") },
  ];
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs leading-relaxed text-muted">{t("pj.note")}</p>
      <Err text={err} />
      {kinds.map((k) => (
        <div key={k.id}>
          <p className="mb-1 vic-kicker">{k.label}</p>
          <div className="space-y-2">
            {PROJECT_SEEDS.filter((p) => p.kind === k.id).map((p) => {
              const inst = s.projects.find((x) => x.specId === p.id && !x.failed);
              const failed = s.projects.some((x) => x.specId === p.id && x.failed);
              const done = inst?.done;
              const status = failed
                ? t("pj.failed")
                : done
                  ? t("pj.done")
                  : inst
                    ? t("pj.running", { n: Math.max(0, Math.ceil((inst.doneTick - s.tick) / 24)) })
                    : null;
              return (
                <div key={p.id} className="rounded-[3px] border border-line/80 bg-paper px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">{lang === "en" ? p.nameEn : p.nameZh}</p>
                    {inst || failed ? (
                      <span className={cn("text-xs font-bold", failed ? "text-down" : done ? "text-up" : "text-teal-deep")}>{status}</span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          const e = s.startProject(p.id);
                          setErr(e);
                          if (e) sfxBad();
                          else sfxGood();
                        }}
                      >
                        {t("pj.start")}
                      </Button>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {t("pj.meta", { c: compactUsd(p.cost), d: p.days, r: compactUsd(p.dailyRevenue), k: Math.round(p.risk * 100), p: p.prestige })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FedPanel() {
  const t = useT();
  const s = useGame();
  const gov = s.career === "governor";
  const [err, setErr] = useState<string | null>(null);
  return (
    <PanelShell title={gov ? t("fed.govTitle") : t("fed.title")} subtitle={gov ? t("fed.govSub") : t("fed.sub")}>
      <p className="font-display text-4xl font-semibold">{ratePct(s.fedRate)}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">{gov ? t("fed.govBody") : t("fed.body")}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat k={t("fed.gdp")} v={compactUsd(worldGdpOf(s))} />
        <Stat k={t("fed.pool")} v={compactUsd(streetPoolOf(s))} />
        <Stat k={t("fed.simple")} v={ratePct(simpleRate(s.fedRate))} />
        <Stat k={t("fed.comp")} v={ratePct(compoundRate(s.fedRate))} />
        <Stat k={t("fed.loan")} v={ratePct(loanRateOf(s))} />
        <Stat k={t("fed.margin")} v={ratePct(s.fedRate + 0.04)} />
      </div>
      {gov ? (
        <div className="mt-4 space-y-3">
          <p className="vic-kicker">{t("fed.tools")}</p>
          <Err text={err} />
          {(["leo", "ramona", "david"] as const).map((c) => {
            const rate = policyRateOf(s, c);
            const duty = tariffOf(s, c);
            return (
              <div key={c} className="rounded-[3px] border border-line/80 bg-paper p-3">
                <p className="text-sm font-extrabold">
                  {t(`world.${c}Short`)} · {t(`board.${COUNTRY[c].board}`)}
                </p>
                <PolicySlider
                  label={t("fed.policyRate")}
                  live={rate}
                  format={ratePct}
                  min={0.005}
                  max={0.12}
                  step={0.0025}
                  onCommit={(v) => setErr(s.setPolicy(c, { rate: v }))}
                />
                <PolicySlider
                  label={t("fed.tariff")}
                  live={duty}
                  format={(v) => pct(v, 1)}
                  min={0}
                  max={0.25}
                  step={0.005}
                  onCommit={(v) => setErr(s.setPolicy(c, { tariff: v }))}
                />
              </div>
            );
          })}
          <p className="text-xs leading-relaxed text-muted">{t("fed.warn")}</p>
        </div>
      ) : null}
    </PanelShell>
  );
}

/**
 * A policy dial that only fires once the governor lets go.
 *
 * `setPolicy` runs `applyPolicyShock` — it repricess every listing in the
 * country, moves productivity and nudges the currency. Wired straight to
 * `onChange`, a single drag fired dozens of those, so one decision hit the
 * market dozens of times. The draft is local; the commit happens on release.
 */
function PolicySlider({
  label,
  live,
  format,
  min,
  max,
  step,
  onCommit,
}: {
  label: string;
  live: number;
  format: (v: number) => string;
  min: number;
  max: number;
  step: number;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? live;
  const commit = () => {
    if (draft === null) return;
    const v = draft;
    setDraft(null);
    if (Math.abs(v - live) >= step / 2) onCommit(v);
  };
  return (
    <label className="mt-2 block text-xs font-bold text-muted">
      {label} {format(shown)}
      {draft !== null && Math.abs(draft - live) >= step / 2 ? (
        <span className="ml-1 text-teal-deep">→ {format(live)}</span>
      ) : null}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onPointerCancel={commit}
        onBlur={commit}
        onKeyUp={commit}
        className="mt-2 w-full"
      />
    </label>
  );
}

export function CompanyPanel({ ticker }: { ticker: string }) {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const st = useGame((s) => s.stocks[ticker]);
  const notes = useGame((s) => analystOn(s));
  const meta = COMPANY_META[ticker as keyof typeof COMPANY_META];
  const setPanel = useGame((s) => s.setPanel);
  if (!st) return null;
  const chg = st.price / st.prevClose - 1;
  const durMove = -st.duration * 0.0025 * 0.9;
  const title = meta ? t(meta.buildingKey) : lang === "en" ? st.nameEn || st.name : st.nameZh || st.name;
  const blurb = meta ? t(meta.blurbKey) : t("co.foreign");
  const sub = meta ? t(`st.${ticker}`) : `${st.ticker} · ${st.country}`;
  return (
    <PanelShell title={title} subtitle={sub}>
      <p className="text-sm leading-relaxed text-muted">{blurb}</p>
      <div className="mt-3 flex items-center gap-3">
        <Coin3D
          size={48}
          glyph={st.country === "david" ? "Đ" : asCountry(st.country) === "ramona" ? "₳" : "£"}
          className="shrink-0"
        />
        <p className="font-mono text-3xl font-semibold tabular-nums">
          {compactCcy(st.price, st.country === "david" ? "dvd" : asCountry(st.country) === "ramona" ? "ana" : "leo")}
        </p>
      </div>
      <p className={cn("text-sm font-bold", chg >= 0 ? "tick-up" : "tick-down")}>
        {pct(chg)} {t("co.today")}
      </p>
      <KLineChart data={st.history} className="mt-2 h-28 w-full" />
      <p className="text-xs text-muted">
        {t("co.meta", {
          sec: t(SECTOR_KEY[st.sector] ?? st.sector),
          v: (st.vol * 100).toFixed(0),
          pe: st.pe,
        })}
        {st.dividendYield > 0 ? t("co.div", { n: ratePct(st.dividendYield) }) : ""}
      </p>
      <p className="mt-2 text-xs font-semibold text-teal-deep">
        {t(`board.${COUNTRY[asCountry(st.country)].board}`)} · {t("ex.duration", { n: st.duration.toFixed(0) })}
      </p>
      {notes ? <p className="mt-1 text-xs text-muted">{t("ex.durHint", { move: pct(durMove, 1) })}</p> : null}
      <Button className="mt-4" onClick={() => setPanel("exchange")}>
        {t("co.go")}
      </Button>
    </PanelShell>
  );
}

export function ServerPadPanel() {
  const t = useT();
  const s = useGame();
  const [err, setErr] = useState<string | null>(null);
  const body =
    s.shop.serverAt === "exchange" ? t("pad.on") : s.shop.quantServer ? t("pad.owned") : t("pad.empty");
  return (
    <PanelShell title={t("pad.title")} subtitle={t("pad.sub")}>
      <p className="text-sm leading-relaxed text-muted">{body}</p>
      <Err text={err} />
      <div className="mt-4 flex gap-2">
        <Button
          disabled={!s.shop.quantServer || s.shop.serverAt === "exchange"}
          onClick={() => {
            const e = s.buyShop("install-exchange");
            setErr(e);
            if (e) sfxBad();
            else sfxGood();
          }}
        >
          {t("pad.install")}
        </Button>
        <Button variant="secondary" onClick={() => s.setPanel("shop")}>
          {t("pad.shop")}
        </Button>
      </div>
    </PanelShell>
  );
}

export function PortfolioPanel() {
  const t = useT();
  const s = useGame();
  return (
    <PanelShell title={t("pf.title")} subtitle={t("pf.sub", { n: compactUsd(netWorth(s)) })}>
      {s.positions.length === 0 && s.options.length === 0 && s.futPos.length === 0 && s.ownedProps.length === 0 ? (
        <p className="text-sm text-muted">{t("pf.empty")}</p>
      ) : null}
      <div className="space-y-2">
        {s.positions.map((p) => {
          const st = s.stocks[p.ticker];
          // A foreign name's P&L is in ITS coin — show it converted, or the Ł
          // figure is off by the whole exchange rate (75x for David names).
          const ccy = countryCcy(st?.country ?? "leo");
          const pnlLocal = ((st?.price ?? 0) - p.avgCost) * p.shares;
          const pnl = toLeo(pnlLocal, ccy, s);
          return (
            <div key={p.ticker} className="flex items-center justify-between rounded-[3px] border border-line/80 bg-paper px-3 py-2 text-sm">
              <span>{t("pf.sh", { t: p.ticker, n: p.shares })}</span>
              <span className={pnl >= 0 ? "tick-up" : "tick-down"}>
                {compactUsd(pnl)}
                {ccy === "leo" ? "" : <span className="ml-1 text-[11px] text-muted">({compactCcy(pnlLocal, ccy)})</span>}
              </span>
            </div>
          );
        })}
        {s.options.map((o) => (
          <div key={o.id} className="rounded-[3px] border border-line/80 bg-paper px-3 py-2 text-sm">
            {t("pf.opt", { t: o.ticker, k: o.kind, s: o.strike, q: o.qty })}
          </div>
        ))}
        {s.futPos.map((p) => (
          <div key={p.id} className="rounded-[3px] border border-line/80 bg-paper px-3 py-2 text-sm">
            {t("pf.fut", { s: p.symbol, side: p.qty > 0 ? t("ex.long") : t("ex.short"), q: Math.abs(p.qty) })}
          </div>
        ))}
        {s.ownedProps.map((h) => {
          const spec = s.properties.find((p) => p.id === h.id);
          return (
            <div key={h.id} className="rounded-[3px] border border-line/80 bg-paper px-3 py-2 text-sm">
              {t("pf.home", { n: propertyLabel(t, spec, h.id), m: compactUsd(h.mortgage) })}
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
}

/**
 * Seeded properties are named by i18n key; self-built ones carry their own
 * name and have no key, so `t("pr.built-creek")` used to print the raw key.
 */
function propertyLabel(
  t: (k: string) => string,
  spec: { id: string; name: string } | undefined,
  fallback: string,
): string {
  if (!spec) return fallback;
  return spec.id.startsWith("built-") ? spec.name : t(`pr.${spec.id}`);
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[3px] border border-line/80 bg-paper px-3 py-2 shadow-[inset_0_1px_0_#ffffff59]">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brass-deep">{k}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">{v}</p>
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-[3px] border px-3 text-sm font-bold",
        on ? "border-teal-deep bg-teal text-paper" : "border-line/80 bg-paper",
      )}
    >
      {label}
      <span>{on ? t("toggle.on") : t("toggle.off")}</span>
    </button>
  );
}
