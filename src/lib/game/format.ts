/** Leo coin symbol — universal currency of Leo Country. */
export const LEO = "Ł";

export function leo(n: number, digits = 0): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return (
    sign +
    LEO +
    abs.toLocaleString("en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    })
  );
}

export function compactLeo(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1e12) return `${sign}${LEO}${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}${LEO}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}${LEO}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${sign}${LEO}${(a / 1e3).toFixed(1)}K`;
  return `${sign}${LEO}${a.toFixed(a >= 100 ? 0 : 2)}`;
}

export function compactCcy(n: number, ccy: "leo" | "dvd" | "ana"): string {
  const mark = ccy === "dvd" ? "Đ" : ccy === "ana" ? "₳" : LEO;
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1e12) return `${sign}${mark}${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}${mark}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}${mark}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${sign}${mark}${(a / 1e3).toFixed(1)}K`;
  return `${sign}${mark}${a.toFixed(a >= 100 ? 0 : 2)}`;
}

/** @deprecated Use leo — kept so existing panels keep compiling. */
export const usd = leo;
/** @deprecated Use compactLeo. */
export const compactUsd = compactLeo;

export function pct(n: number, digits = 2): string {
  const v = n * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export function ratePct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function clockLabel(hour: number): string {
  return `${pad2(hour)}:00`;
}
