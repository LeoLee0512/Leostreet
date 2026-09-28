import { useState } from "react";
import { Coin3D } from "@/components/3d";
import { Button } from "@/components/ui/button";
import {
  anaPerLeo,
  dayOf,
  dvdPerLeo,
  fxCapLeo,
  fxUsedToday,
  quoteRate,
  triangleGap,
} from "@/lib/game/economy";
import { compactCcy, compactUsd, pct } from "@/lib/game/format";
import { sfxBad, sfxGood } from "@/lib/game/audio";
import type { PayOrder } from "@/lib/game/pay";
import { useGame } from "@/lib/game/store";
import type { Ccy } from "@/lib/game/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Err, Field, PanelShell } from "./PanelShell";
import { Trophy } from "lucide-react";
import { StorefrontShelf } from "./Storefront";
import { KLineChart } from "./KLineChart";
import { LangToggle } from "./LangToggle";

export function SettingsPanel() {
  const t = useT();
  const s = useGame();
  const [name, setName] = useState(s.name);
  const [msg, setMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<PayOrder | null>(null);

  return (
    <PanelShell title={t("set.title")} subtitle={t("set.sub")}>
      {/* 荣誉室 lives here rather than in the lobby: it is a record, not a
          scoreboard, and it belongs next to the account it describes. */}
      <button
        type="button"
        onClick={() => {
          sfxGood();
          s.setPanel("honor");
        }}
        className="mb-5 flex w-full items-center gap-3 rounded-[3px] border border-ink-soft bg-ink px-4 py-3 text-left text-paper shadow-[inset_0_0_0_2px_var(--color-ink),inset_0_0_0_3px_var(--color-brass),0_2px_6px_#3a2c1833] transition-transform active:scale-[0.99]"
      >
        <Trophy className="size-5 shrink-0 text-[#e2b64a]" aria-hidden />
        <span className="min-w-0">
          <span className="block font-display text-lg font-semibold leading-tight">
            {t("hon.title")}
          </span>
          <span className="block text-[11px] leading-snug text-paper/70">{t("hon.sub")}</span>
        </span>
      </button>

      <p className="vic-kicker">{t("set.lang")}</p>
      <LangToggle full className="mt-2" />

      <label className="mt-5 block vic-kicker" htmlFor="set-name">
        {t("set.name")}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="set-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          className="h-11 min-w-0 flex-1 rounded-[3px] border border-line bg-paper px-3 text-sm font-semibold shadow-[inset_0_1px_0_#ffffff59] outline-none focus-visible:border-brass focus-visible:shadow-[inset_0_0_0_1px_var(--color-brass)]"
        />
        <Button
          onClick={() => {
            s.rename(name);
            setMsg("set.renamed");
            sfxGood();
          }}
        >
          {t("set.save")}
        </Button>
      </div>

      <StorefrontShelf onOrder={setOrder} />

      {order ? (
        <PayCashier
          order={order}
          onClose={() => setOrder(null)}
          onPaid={() => setMsg("set.paid")}
        />
      ) : null}

      {msg ? <p className="mt-3 text-sm font-semibold text-up">{t(msg)}</p> : null}
      <p className="mt-4 text-xs text-muted">{t("set.spent", { n: s.rmbSpent.toFixed(1) })}</p>
    </PanelShell>
  );
}

/**
 * A PLACEHOLDER cashier. It shows a generated pattern, not a scannable code,
 * and the confirm button grants the entitlement locally with nothing verified.
 *
 * It deliberately carries no payment brand's name, logo or colour: dressing a
 * mock checkout as a real provider is a trademark problem and, worse, tells the
 * player their money is handled by someone who has not been involved. When a
 * real merchant is attached, use that provider's official SDK and brand assets
 * under its own guidelines — and verify server-side (see `pay.ts`).
 */
export function PayCashier({
  order,
  onClose,
  onPaid,
}: {
  order: PayOrder;
  onClose: () => void;
  onPaid: () => void;
}) {
  const t = useT();
  return (
    <div className="mt-4 rounded-[3px] border-[3px] border-double border-brass-deep bg-surface p-3 shadow-[inset_0_0_18px_#3a2c1810]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="vic-kicker">{t("set.cashier")}</p>
          <p className="font-display text-2xl font-semibold">¥0</p>
          <p className="text-xs text-muted">{t("set.order", { n: order.id })}</p>
        </div>
        <button type="button" className="text-xs font-bold text-muted" onClick={onClose}>
          {t("set.cancel")}
        </button>
      </div>
      <p className="mt-2 text-center text-xs font-bold text-down">{t("set.demoPay")}</p>
      <p className="mt-1 text-center text-[11px] text-muted">{t("set.notify")}</p>
      {order.status === "paid" ? (
        <p className="mt-3 text-center text-sm font-semibold text-up">{t("set.paid")}</p>
      ) : (
        <Button
          className="mt-3 w-full"
          onClick={() => {
            const e = useGame.getState().confirmPay(order.id);
            if (e) sfxBad();
            else {
              sfxGood();
              onPaid();
              onClose();
            }
          }}
        >
          {t("set.payNow")}
        </Button>
      )}
    </div>
  );
}

export function FxPanel() {
  const t = useT();
  const s = useGame();
  const [from, setFrom] = useState<Ccy>("leo");
  const [to, setTo] = useState<Ccy>("dvd");
  const [amt, setAmt] = useState(1000);
  const [err, setErr] = useState<string | null>(null);
  const rate = quoteRate(s, from, to);
  const gap = triangleGap(s);
  const used = fxUsedToday(s);
  const cap = fxCapLeo(s);
  const ccys: { id: Ccy; label: string }[] = [
    { id: "leo", label: t("fx.leo") },
    { id: "dvd", label: t("fx.dvd") },
    { id: "ana", label: t("fx.ana") },
  ];
  return (
    <PanelShell title={t("fx.title")} subtitle={t("fx.sub")}>
      <div className="flex items-center gap-3">
        <Coin3D size={48} glyph="£" spinning className="shrink-0" />
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 text-sm">
          <Stat k={t("fx.dvdRate")} v={`1Ł=${dvdPerLeo(s).toFixed(2)}Đ`} />
          <Stat k={t("fx.anaRate")} v={`1Ł=${anaPerLeo(s).toFixed(2)}₳`} />
          <Stat k={t("fx.cross")} v={`1₳=${(s.fxDvdPerAna ?? 0.75).toFixed(3)}Đ`} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <Stat k={t("fx.walletL")} v={compactUsd(s.cash)} />
        <Stat k={t("fx.walletD")} v={compactCcy(s.cashDvd ?? 0, "dvd")} />
        <Stat k={t("fx.walletA")} v={compactCcy(s.cashAna ?? 0, "ana")} />
      </div>
      <KLineChart data={s.fxHistDvd ?? []} className="mt-3 h-20 w-full" />
      <p className="mt-1 text-[11px] text-muted">
        {t("fx.cap", { u: compactUsd(used), c: compactUsd(cap) })}
      </p>
      <p
        className={cn(
          "mt-1 text-[11px] font-bold",
          Math.abs(gap) > 0.004 ? "text-down" : "text-muted",
        )}
      >
        {t("fx.gap", { n: pct(gap, 2) })}
      </p>
      <p className="mt-3 vic-kicker">{t("fx.convert")}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <CcyPick label={t("fx.from")} value={from} onChange={setFrom} items={ccys} />
        <CcyPick label={t("fx.to")} value={to} onChange={setTo} items={ccys} />
      </div>
      <Field label={t("bank.amount")} value={amt} onChange={setAmt} min={1} step={100} />
      <p className="mt-1 text-xs text-muted">
        {t("fx.quote", { n: compactCcy(Math.max(0, amt) * rate, to) })}
      </p>
      <Err text={err} />
      <Button
        className="mt-3"
        onClick={() => {
          const e = s.convertFx(from, to, amt);
          setErr(e);
          if (e) sfxBad();
          else sfxGood();
        }}
      >
        {t("fx.go")}
      </Button>
      <p className="mt-4 text-xs leading-relaxed text-muted">{t("fx.law")}</p>
    </PanelShell>
  );
}

export function LawPanel() {
  const t = useT();
  const s = useGame();
  const articles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  return (
    <PanelShell title={t("law.title")} subtitle={t("law.sub")}>
      <p className="text-sm leading-relaxed text-muted">{t("law.body")}</p>
      <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed">
        {articles.map((n) => (
          <li key={n}>{t(`law.a${n}`)}</li>
        ))}
      </ol>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat k={t("law.strikes")} v={`${s.lawStrikes ?? 0} / 3`} />
        <Stat k={t("law.fines")} v={compactUsd(s.lawFinesPaid ?? 0)} />
        <Stat k={t("law.prod")} v={`${((s.productivity ?? 1) * 100).toFixed(1)}`} />
        <Stat k={t("law.bubble")} v={pct(s.bubbleHeat ?? 0, 0)} />
        <Stat k={t("hud.gdp")} v={compactUsd(s.worldGdp)} />
      </div>
      <p className="mt-3 text-xs text-muted">
        {(() => {
          const left = (s.fxBanUntilDay ?? 0) - dayOf(s.tick);
          return left > 0 ? t("law.banLeft", { n: left }) : t("law.banHint");
        })()}
      </p>
    </PanelShell>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[3px] border border-line/80 bg-paper px-3 py-2 shadow-[inset_0_1px_0_#ffffff59]">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brass-deep">{k}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">{v}</p>
    </div>
  );
}

function CcyPick({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: Ccy;
  onChange: (v: Ccy) => void;
  items: { id: Ccy; label: string }[];
}) {
  return (
    <label className="block">
      <span className="vic-kicker">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Ccy)}
        className="mt-1 h-11 w-full rounded-[3px] border border-line bg-paper px-3 text-sm font-semibold"
      >
        {items.map((it) => (
          <option key={it.id} value={it.id}>
            {it.label}
          </option>
        ))}
      </select>
    </label>
  );
}
