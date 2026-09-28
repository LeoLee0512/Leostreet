import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";

export type Candle = { o: number; h: number; l: number; c: number };

export function historyToCandles(history: number[], maxBars = 32): Candle[] {
  if (history.length < 2) return [];
  const group = Math.max(2, Math.ceil(history.length / maxBars));
  const bars: Candle[] = [];
  for (let i = 0; i < history.length; i += group) {
    const slice = history.slice(i, i + group);
    if (!slice.length) continue;
    const o = slice[0]!;
    const c = slice[slice.length - 1]!;
    let h = Math.max(...slice);
    let l = Math.min(...slice);
    if (h - l < Math.abs(c) * 0.002) {
      const pad = Math.max(Math.abs(c) * 0.004, 0.01);
      h += pad;
      l = Math.max(0.01, l - pad);
    }
    bars.push({ o, c, h, l });
  }
  return bars.slice(-maxBars);
}

function movingAvg(closes: number[], n: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i + 1 < n) return null;
    let s = 0;
    for (let k = i + 1 - n; k <= i; k++) s += closes[k]!;
    return s / n;
  });
}

export function KLineChart({
  data,
  candles,
  className = "h-32 w-full",
}: {
  data?: number[];
  candles?: Candle[];
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const bars = useMemo(
    () => (candles && candles.length ? candles.slice(-32) : historyToCandles(data ?? [], 32)),
    [candles, data],
  );
  const w = 360;
  const h = 118;
  const volH = 22;
  const chartH = h - volH - 4;
  if (bars.length < 2) return <div className={className} />;
  const closes = bars.map((b) => b.c);
  const lo = Math.min(...bars.map((b) => b.l));
  const hi = Math.max(...bars.map((b) => b.h));
  const span = hi - lo || 1;
  const y = (v: number) => 6 + ((hi - v) / span) * (chartH - 10);
  const gap = w / bars.length;
  const bodyW = Math.max(5, gap * 0.62);
  const ma5 = movingAvg(closes, 5);
  const ma10 = movingAvg(closes, 10);
  const pathOf = (series: (number | null)[]) => {
    let d = "";
    series.forEach((v, i) => {
      if (v == null) return;
      const x = gap * i + gap / 2;
      d += d ? ` L${x.toFixed(1)},${y(v).toFixed(1)}` : `M${x.toFixed(1)},${y(v).toFixed(1)}`;
    });
    return d;
  };
  const vols = bars.map((b) => Math.abs(b.c - b.o) + (b.h - b.l) * 0.35);
  const vmax = Math.max(...vols, 1e-6);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("overflow-visible", className)} aria-hidden>
      <defs>
        <filter id={`kpop-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.1" stdDeviation="0.35" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>
      <rect x="0" y="0" width={w} height={h} rx="3" fill="#1f2919" />
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1="0"
          x2={w}
          y1={6 + p * (chartH - 10)}
          y2={6 + p * (chartH - 10)}
          stroke="#54603f"
          strokeWidth="0.7"
          strokeDasharray="3 5"
        />
      ))}
      <path d={pathOf(ma10)} fill="none" stroke="#a89f80" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
      <path d={pathOf(ma5)} fill="none" stroke="#c9a961" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
      {bars.map((b, i) => {
        const up = b.c >= b.o;
        const x = gap * i + gap / 2;
        const y1 = y(b.h);
        const y2 = y(b.l);
        const top = y(Math.max(b.o, b.c));
        const bot = y(Math.min(b.o, b.c));
        const bh = Math.max(3.4, bot - top);
        const fill = up ? "#d97e62" : "#7d9a62";
        const stroke = up ? "#9c5240" : "#46583a";
        const vh = Math.max(2, (vols[i]! / vmax) * (volH - 4));
        return (
          <g key={i} filter={`url(#kpop-${uid})`}>
            <line x1={x} x2={x} y1={y1} y2={y2} stroke={stroke} strokeWidth="2.3" strokeLinecap="round" />
            <rect
              x={x - bodyW / 2}
              y={top}
              width={bodyW}
              height={bh}
              rx="2.6"
              ry="2.6"
              fill={fill}
              stroke={stroke}
              strokeWidth="1.2"
            />
            <rect
              x={x - bodyW / 2 + 1.2}
              y={top + 1.1}
              width={Math.max(1, bodyW * 0.3)}
              height={Math.max(1.2, bh - 2.2)}
              rx="1"
              fill="rgba(232,224,200,0.16)"
            />
            <rect
              x={x - bodyW / 2}
              y={h - vh}
              width={bodyW}
              height={vh}
              rx="1.6"
              fill={fill}
              opacity="0.55"
            />
          </g>
        );
      })}
    </svg>
  );
}
