import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small shared components for the sandbox panels. */

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mt-4 first:mt-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h3 className="vic-kicker">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Meter({ label, value, tone, hint }: { label: string; value: number; tone: "good" | "warn" | "bad"; hint?: string }) {
  const color = tone === "good" ? "bg-up" : tone === "warn" ? "bg-brass" : "bg-down";
  return (
    <div className="mt-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className="font-mono font-bold tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-paper-deep" title={hint}>
        <div className={cn("h-full rounded-full transition-[width] duration-300", color)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

/** A tiny line chart of the last N samples, with an optional target line. */
export function Spark({ values, target, color = "var(--color-ink)" }: { values: number[]; target?: number; color?: string }) {
  if (values.length < 2) return <svg viewBox="0 0 100 28" className="h-7 w-full" aria-hidden />;
  const lo = Math.min(...values, target ?? Infinity);
  const hi = Math.max(...values, target ?? -Infinity);
  const span = hi - lo || 1;
  const y = (v: number) => 26 - ((v - lo) / span) * 24;
  const d = values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * 100).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
      {target !== undefined ? (
        <line x1="0" x2="100" y1={y(target)} y2={y(target)} stroke="var(--color-brass)" strokeDasharray="2 2" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      ) : null}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Locked({ text }: { text: string }) {
  return <p className="mt-1 rounded-[3px] border border-dashed border-line px-2 py-1.5 text-[11px] text-muted">🔒 {text}</p>;
}
