import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SECTOR_KEY } from "@/lib/game/catalog";
import { analystOn, countryCcy, dayOf, maxLeverage } from "@/lib/game/economy";
import { asCountry, COUNTRY, isBoardOpen } from "@/lib/game/countries";
import { compactCcy, compactUsd, pct, ratePct } from "@/lib/game/format";
import { blackScholes, greeks, realizedVol } from "@/lib/game/math";
import { sfxBad, sfxGood } from "@/lib/game/audio";
import { useGame } from "@/lib/game/store";
import type { CountryId, Stock } from "@/lib/game/types";
import { useI18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Err, Field, PanelShell, Tabs } from "./PanelShell";
import { KLineChart } from "./KLineChart";
import { FutureDesk } from "./FutureDesk";

function stockName(st: Stock, lang: string) {
  return lang === "en" ? st.nameEn || st.name : st.nameZh || st.name;
}

export function ExchangePanel() {
  const t = useT();
  const tab = useGame((s) => s.exchangeTab);
  const setTab = useGame((s) => s.setExchangeTab);
  return (
    <PanelShell title={t("ex.title")} subtitle={t("ex.sub")}>
      <Tabs
        value={tab}
        onChange={(v) => setTab(v as "stocks" | "options" | "futures")}
        items={[
          { id: "stocks", label: t("ex.stocks") },
          { id: "options", label: t("ex.options") },
          { id: "futures", label: t("ex.futures") },
        ]}
      />
      {tab === "stocks" ? <StockDesk /> : tab === "options" ? <OptionDesk /> : <FutureDesk />}
    </PanelShell>
  );
}

function StockDesk() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const stocks = useGame((s) => s.stocks);
  const positions = useGame((s) => s.positions);
  const street = asCountry(useGame((s) => s.street));
  const tick = useGame((s) => s.tick);
  const levCap = useGame((s) => maxLeverage(s));
  const notes = useGame((s) => analystOn(s));
  const buy = useGame((s) => s.buyStock);
  const sell = useGame((s) => s.sellStock);
  const close = useGame((s) => s.closeStock);
  const orders = useGame((s) => s.orders);
  const placeOrder = useGame((s) => s.placeOrder);
  const cancelOrder = useGame((s) => s.cancelOrder);
  const [ticker, setTicker] = useState("GOLD");
  const [qty, setQty] = useState(10);
  const [lev, setLev] = useState(1);
  const [kind, setKind] = useState<"limit" | "stop">("limit");
  const [orderPx, setOrderPx] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sec, setSec] = useState("all");
  const [cty, setCty] = useState<CountryId | "all">(street);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setCty(street);
    setPage(0);
  }, [street]);

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return Object.values(stocks)
      .filter((x) => (cty === "all" ? true : asCountry(x.country) === cty))
      .filter((x) => (sec === "all" ? true : x.sector === sec))
      .filter((x) => {
        if (!qq) return true;
        return (
          x.ticker.toLowerCase().includes(qq) ||
          (x.nameZh || x.name).toLowerCase().includes(qq) ||
          (x.nameEn || "").toLowerCase().includes(qq)
        );
      })
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [stocks, q, sec, cty]);

  const pageSize = 12;
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = list.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const st = stocks[ticker] ?? list[0];
  const pos = st ? positions.find((p) => p.ticker === st.ticker) : undefined;
  const cap = Math.max(1, levCap);
  const usedLev = Math.min(lev, cap);

  if (!st) return <p className="text-sm text-muted">{t("ex.empty")}</p>;
  const chg = st.price / st.prevClose - 1;
  const durMove = -st.duration * 0.0025 * 0.9;
  const rv = realizedVol(st.history);
  const gap = st.fair ? st.price / st.fair - 1 : 0;
  const ccy = countryCcy(st.country ?? "leo");
  const sectors = ["all", "tech", "fin", "re", "energy", "health", "consumer", "industrials", "media", "materials"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["all", "leo", "ramona", "david"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCty(c);
              setPage(0);
            }}
            className={cn(
              "h-9 rounded-[3px] border border-line/70 px-2 text-[11px] font-extrabold",
              cty === c ? "bg-teal text-paper" : "bg-paper",
            )}
          >
            {c === "all" ? t("ex.allCty") : t(`world.${c}Short`)}
          </button>
        ))}
      </div>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(0);
        }}
        placeholder={t("ex.search")}
        className="h-10 w-full rounded-[3px] border border-line bg-paper px-3 text-sm font-semibold shadow-[inset_0_1px_0_#ffffff59] outline-none focus-visible:border-brass"
      />
      <div className="flex gap-1 overflow-x-auto pb-1">
        {sectors.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setSec(id);
              setPage(0);
            }}
            className={cn(
              "h-9 shrink-0 rounded-[3px] border border-line/70 px-2 text-[11px] font-extrabold",
              sec === id ? "bg-teal text-paper" : "bg-paper",
            )}
          >
            {id === "all" ? t("ex.allSec") : t(SECTOR_KEY[id] ?? id)}
          </button>
        ))}
      </div>
      <p className="text-[11px] font-bold text-muted">{t("ex.count", { n: list.length })}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {slice.map((x) => {
          const c = x.price / x.prevClose - 1;
          return (
            <button
              key={x.ticker}
              type="button"
              onClick={() => setTicker(x.ticker)}
              className={cn(
                "rounded-[3px] border border-line/80 bg-paper px-2 py-2 text-left",
                st.ticker === x.ticker && "border-brass shadow-[inset_0_0_0_1px_var(--color-brass)]",
              )}
            >
              <div className="text-[11px] font-extrabold">{x.ticker}</div>
              <div className="font-mono text-xs tabular-nums">{compactCcy(x.price, countryCcy(x.country))}</div>
              <div className={cn("text-[10px] font-bold", c >= 0 ? "tick-up" : "tick-down")}>{pct(c)}</div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs font-bold">
        <button type="button" disabled={safePage <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          {t("ex.prev")}
        </button>
        <span>
          {safePage + 1} / {pages}
        </span>
        <button type="button" disabled={safePage >= pages - 1} onClick={() => setPage((p) => p + 1)}>
          {t("ex.next")}
        </button>
      </div>

      <div className="rounded-[3px] border border-line/80 bg-paper p-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm font-bold">
              {stockName(st, lang)} · {t(SECTOR_KEY[st.sector] ?? st.sector)} · {t(`board.${COUNTRY[asCountry(st.country)].board}`)}
            </p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{compactCcy(st.price, ccy)}</p>
            {!isBoardOpen(tick, asCountry(st.country)) ? (
              <p className="text-[11px] font-bold text-down">{t("err.closed")}</p>
            ) : null}
          </div>
          <p className={cn("text-sm font-bold", chg >= 0 ? "tick-up" : "tick-down")}>{pct(chg)}</p>
        </div>
        <KLineChart data={st.history} className="mt-2 h-28 w-full" />
        <p className="mt-1 text-xs font-semibold text-teal-deep">{t("ex.duration", { n: st.duration.toFixed(0) })}</p>
        {notes ? (
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {t("ex.durHint", { move: pct(durMove, 1) })}
            {" · "}
            {t("ex.fair", { n: st.fair.toFixed(1), p: pct(gap, 1) })}
            {" · "}
            {t("ex.iv", { n: ratePct(st.vol) })}
            {" · "}
            {t("ex.rv", { n: rv ? ratePct(rv) : "—" })}
          </p>
        ) : null}
        {pos ? (
          <p className="mt-1 text-xs text-muted">
            {t("ex.pos", { n: pos.shares, c: pos.avgCost.toFixed(2) })}
            {pos.borrowed > 0 ? t("ex.borrow", { n: compactUsd(pos.borrowed) }) : ""}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("ex.shares")} value={qty} onChange={setQty} min={1} />
        <label className="block">
          <span className="vic-kicker">
            {t("ex.lev", { lev: usedLev.toFixed(1), cap })}
          </span>
          <input
            type="range"
            min={1}
            max={cap}
            step={0.5}
            value={usedLev}
            onChange={(e) => setLev(Number(e.target.value))}
            className="mt-3 w-full"
          />
        </label>
      </div>
      <p className="text-xs text-muted">
        {t("ex.cashUse", { n: compactCcy((st.price * Math.max(1, qty)) / usedLev, ccy) })}
        {usedLev > 1 ? t("ex.marginNote") : ""}
      </p>
      <Err text={err} />
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="up"
          onClick={() => {
            const e = buy(st.ticker, Math.max(1, Math.floor(qty)), usedLev);
            setErr(e);
            if (e) sfxBad();
            else sfxGood();
          }}
        >
          {t("ex.buy")}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            const e = sell(st.ticker, Math.max(1, Math.floor(qty)));
            setErr(e);
            if (e) sfxBad();
            else sfxGood();
          }}
        >
          {t("ex.sell")}
        </Button>
        <Button
          variant="secondary"
          disabled={!pos}
          onClick={() => {
            const e = close(st.ticker);
            setErr(e);
            if (e) sfxBad();
            else sfxGood();
          }}
        >
          {t("ex.close")}
        </Button>
      </div>

      <div className="rounded-[3px] border border-line/80 bg-paper p-3">
        <p className="vic-kicker">{t("ex.orderKind")}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["limit", "stop"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn("h-9 rounded-[3px] border border-line/70 text-xs font-extrabold", kind === k ? "bg-teal text-paper" : "bg-surface-2")}
            >
              {k === "limit" ? t("ex.limit") : t("ex.stop")}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 items-end gap-3">
          <Field label={t("ex.orderPx")} value={orderPx} onChange={setOrderPx} min={0} step={0.5} />
          <Button
            variant="secondary"
            onClick={() => {
              const px = orderPx > 0 ? orderPx : Math.round(st.price * (kind === "limit" ? 0.95 : 0.9) * 100) / 100;
              const e = placeOrder(st.ticker, kind, px, Math.max(1, Math.floor(qty)), usedLev);
              setErr(e);
              if (e) sfxBad();
              else sfxGood();
            }}
          >
            {t("ex.place")}
          </Button>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">{kind === "limit" ? t("ex.limitHint") : t("ex.stopHint")}</p>
      </div>

      <div>
        <p className="vic-kicker">{t("ex.orders")}</p>
        {orders.length === 0 ? <p className="mt-2 text-sm text-muted">{t("ex.orderEmpty")}</p> : null}
        <div className="mt-1 border-y-[3px] border-double border-brass/60">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between border-b border-line/60 px-1 py-2 text-sm last:border-b-0">
              <span>
                {o.ticker}{" "}
                {o.kind === "limit" ? (o.side === "buy" ? t("ex.limitBuy") : t("ex.limitSell")) : o.side === "buy" ? t("ex.stopBuy") : t("ex.stopSell")}{" "}
                @ <span className="font-mono tabular-nums">{o.price.toFixed(2)}</span> x{o.shares}
              </span>
              <Button size="sm" variant="ghost" onClick={() => cancelOrder(o.id)}>
                {t("ex.cancel")}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OptionDesk() {
  const t = useT();
  const stocks = useGame((s) => s.stocks);
  const options = useGame((s) => s.options);
  const fed = useGame((s) => s.fedRate);
  const tick = useGame((s) => s.tick);
  const notes = useGame((s) => analystOn(s));
  const street = useGame((s) => s.street);
  const buy = useGame((s) => s.buyOption);
  const close = useGame((s) => s.closeOption);
  const [ticker, setTicker] = useState("GOLD");
  const [kind, setKind] = useState<"call" | "put">("call");
  const [tenor, setTenor] = useState(30);
  const [moneyness, setMoneyness] = useState(0);
  const [qty, setQty] = useState(1);
  const [write, setWrite] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const streetList = Object.values(stocks).filter((x) => asCountry(x.country) === asCountry(street));
  const picked = stocks[ticker];
  const st = picked && asCountry(picked.country) === asCountry(street) ? picked : streetList[0];
  const ccy = countryCcy(st?.country ?? "leo");
  const strike = st ? Math.round(st.price * (1 + moneyness)) : 0;
  const expiryDay = dayOf(tick) + tenor;
  const prem = useMemo(() => {
    if (!st) return 0;
    return blackScholes(st.price, strike, tenor / 365, fed, st.vol, kind);
  }, [st, strike, tenor, fed, kind]);
  const g = useMemo(() => {
    if (!st) return { delta: 0, theta: 0 };
    return greeks(st.price, strike, tenor / 365, fed, st.vol, kind);
  }, [st, strike, tenor, fed, kind]);

  if (!st) return <p className="text-sm text-muted">{t("ex.empty")}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {Object.values(stocks)
          .filter((x) => asCountry(x.country) === asCountry(street))
          .slice(0, 24)
          .map((x) => (
          <button
            key={x.ticker}
            type="button"
            onClick={() => setTicker(x.ticker)}
            className={cn("rounded-[3px] border border-line/70 px-3 py-1.5 text-xs font-bold", st?.ticker === x.ticker ? "bg-teal text-paper" : "bg-paper")}
          >
            {x.ticker}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={kind === "call" ? "up" : "secondary"} onClick={() => setKind("call")}>
          {t("ex.call")}
        </Button>
        <Button variant={kind === "put" ? "danger" : "secondary"} onClick={() => setKind("put")}>
          {t("ex.put")}
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs font-bold">
        {[
          { d: 7, k: "ex.d7" },
          { d: 30, k: "ex.d30" },
          { d: 90, k: "ex.d90" },
        ].map((x) => (
          <button
            key={x.d}
            type="button"
            onClick={() => setTenor(x.d)}
            className={cn("h-9 rounded-[3px] border border-line/70", tenor === x.d ? "bg-teal text-paper" : "bg-paper")}
          >
            {t(x.k)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1 text-[11px] font-bold">
        {[-0.1, -0.05, 0, 0.05, 0.1].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMoneyness(m)}
            className={cn("h-9 rounded-[3px] border border-line/70", moneyness === m ? "bg-ink text-paper" : "bg-paper")}
          >
            {m === 0 ? t("ex.atm") : `${m > 0 ? "+" : ""}${m * 100}%`}
          </button>
        ))}
      </div>
      <p className="text-sm">
        {t("ex.prem", { k: strike, p: prem.toFixed(2), n: compactCcy(prem * 100, ccy) })}
      </p>
      {notes ? (
        <p className="text-xs text-muted">
          {t("ex.greeks", { d: g.delta.toFixed(2), th: g.theta.toFixed(2) })}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Field label={t("ex.lots")} value={qty} onChange={setQty} min={1} />
        <label className="mt-5 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} />
          {t("ex.write")}
        </label>
      </div>
      <Err text={err} />
      <Button
        onClick={() => {
          const q = Math.max(1, Math.floor(qty)) * (write ? -1 : 1);
          const e = buy(st.ticker, kind, strike, expiryDay, q);
          setErr(e);
          if (e) sfxBad();
          else sfxGood();
        }}
      >
        {write ? t("ex.writeOpt") : t("ex.buyOpt")}
      </Button>

      <div>
        <p className="vic-kicker">{t("ex.optBook")}</p>
        {options.length === 0 ? <p className="mt-2 text-sm text-muted">{t("ex.optEmpty")}</p> : null}
        {options.length > 0 ? (
          <table className="vic-table mt-1">
            <thead>
              <tr>
                <th>{t("ex.options")}</th>
                <th className="text-right">{t("ex.qty")}</th>
                <th className="text-right">{t("ex.flat")}</th>
              </tr>
            </thead>
            <tbody>
              {options.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span className="font-mono tabular-nums">
                      {o.ticker} {o.kind === "call" ? "C" : "P"}
                      {o.strike}
                    </span>{" "}
                    <span className="text-muted">{t("ex.exp", { n: o.expiryDay })}</span>
                  </td>
                  <td className={cn("text-right font-mono tabular-nums", o.qty > 0 ? "text-up" : "text-down")}>
                    {o.qty > 0 ? t("ex.long") : t("ex.short")} {Math.abs(o.qty)}
                  </td>
                  <td className="text-right">
                    <Button size="sm" variant="secondary" onClick={() => close(o.id)}>
                      {t("ex.flat")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

