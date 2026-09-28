import { useState } from "react";
import { Button } from "@/components/ui/button";
import { leo } from "@/lib/game/format";
import { sfxBad, sfxGood } from "@/lib/game/audio";
import { useGame } from "@/lib/game/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Err, Field } from "./PanelShell";
import { KLineChart } from "./KLineChart";

/** Shared futures desk — used by the exchange panel and the warehouse zone. */
export function FutureDesk({ initialSymbol = "ST1" }: { initialSymbol?: string }) {
  const t = useT();
  const futures = useGame((s) => s.futures);
  const pos = useGame((s) => s.futPos);
  const buy = useGame((s) => s.buyFuture);
  const close = useGame((s) => s.closeFuture);
  const [sym, setSym] = useState(initialSymbol);
  const [qty, setQty] = useState(1);
  const [short, setShort] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const f = futures[sym] ?? Object.values(futures)[0];
  if (!f) return null;
  const margin = f.price * f.multiplier * Math.max(1, qty) * 0.1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {Object.values(futures).map((x) => (
          <button
            key={x.symbol}
            type="button"
            onClick={() => setSym(x.symbol)}
            className={cn("rounded-[14px] bg-paper p-3 text-left", (f.symbol === x.symbol || sym === x.symbol) && "ring-2 ring-teal")}
          >
            <p className="text-xs font-bold text-muted">{x.symbol}</p>
            <p className="text-sm font-bold">{t(`fu.${x.symbol}`)}</p>
            <p className="font-mono text-sm tabular-nums">{x.price.toFixed(2)}</p>
            <KLineChart data={x.history} className="h-16 w-full" />
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{t("ex.mult", { n: f.multiplier })}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("ex.qty")} value={qty} onChange={setQty} min={1} />
        <label className="mt-6 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={short} onChange={(e) => setShort(e.target.checked)} />
          {t("ex.shortBox")}
        </label>
      </div>
      <p className="text-sm">{t("ex.im", { n: leo(margin, 0) })}</p>
      <Err text={err} />
      <Button
        onClick={() => {
          const e = buy(f.symbol, Math.max(1, Math.floor(qty)) * (short ? -1 : 1));
          setErr(e);
          if (e) sfxBad();
          else sfxGood();
        }}
      >
        {t("ex.open")}
      </Button>
      <div className="space-y-2">
        {pos.length === 0 ? <p className="text-sm text-muted">{t("ex.noFut")}</p> : null}
        {pos.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-[14px] bg-paper px-3 py-2 text-sm">
            <span>
              {p.symbol} {p.qty > 0 ? t("ex.long") : t("ex.short")} {Math.abs(p.qty)} @ {p.entry.toFixed(2)}
            </span>
            <Button size="sm" variant="secondary" onClick={() => close(p.id)}>
              {t("ex.closeFut")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
