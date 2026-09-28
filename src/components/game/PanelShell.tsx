import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/lib/game/store";
import { useT } from "@/lib/i18n";

export function PanelShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const t = useT();
  const close = () => useGame.getState().setPanel(null);
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-end justify-center p-2 sm:items-center sm:p-6">
      <button type="button" aria-label={t("close")} className="pointer-events-auto absolute inset-0 bg-ink/25" onClick={close} />
      <section className="vic-panel pointer-events-auto relative flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col overflow-hidden sm:max-w-xl">
        <header className="flex items-start justify-between gap-3 border-b-[3px] border-double border-brass/70 px-5 pb-3 pt-5">
          <div>
            <h2 className="vic-letterpress font-display text-2xl font-semibold tracking-tight">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="icon" aria-label={t("closePanel")} onClick={close}>
            <X className="size-5" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">{children}</div>
      </section>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="vic-kicker">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-11 w-full rounded-[3px] border border-line bg-paper px-3 font-mono text-sm font-semibold shadow-[inset_0_1px_0_#ffffff59] outline-none focus-visible:border-brass focus-visible:shadow-[inset_0_0_0_1px_var(--color-brass)]"
      />
    </label>
  );
}

export function Err({ text }: { text: string | null }) {
  const t = useT();
  if (!text) return null;
  return <p className="text-sm font-semibold text-down">{t(text)}</p>;
}

export function Tabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { id: string; label: string }[];
}) {
  return (
    <div className="mb-4 flex gap-0 border-b-[3px] border-double border-brass/70">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onChange(it.id)}
          className={`h-11 flex-1 border-b-2 font-display text-[13px] font-bold tracking-[0.12em] ${
            value === it.id
              ? "-mb-[3px] border-brass-deep text-brass-deep"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
