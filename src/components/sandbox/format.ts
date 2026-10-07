import type { Txt } from "@/lib/sandbox/types";

/** Formatting helpers and shared button classes for the sandbox panels. */

export const btn =
  "inline-flex min-h-9 items-center justify-center gap-1 rounded-[3px] border border-line bg-surface px-2.5 text-sm font-bold text-ink transition-colors hover:border-brass-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
export const btnOn = "border-brass-deep bg-[#ecd08a] shadow-[inset_0_1px_0_#fff6]";

export function tx(t: Txt, en: boolean) {
  return en ? t.en : t.zh;
}

export function pct(v: number, digits = 1) {
  return `${v.toFixed(digits)}%`;
}
