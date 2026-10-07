import { COUNTRY_ORDER, PROFILES } from "@/lib/sandbox/countries";
import { dateOf, nameOf } from "@/lib/sandbox/sim";
import type { SandboxGame } from "@/lib/sandbox/types";
import { cn } from "@/lib/utils";
import { pct, tx } from "./format";
import { Meter, Section, Spark } from "./ui";

const WINDOW = 104;

/** The economy at a glance: headline numbers with two-year sparklines, politics, the world, the wires. */
export function Dashboard({ game, en }: { game: SandboxGame; en: boolean }) {
  const m = game.countries[game.player];
  const p = PROFILES[game.player];
  const h = game.history.slice(-WINDOW);
  const rows: { label: string; value: string; series: number[]; target?: number; bad: boolean }[] = [
    { label: en ? "Inflation" : "通胀", value: pct(m.pi), series: h.map((s) => s.pi), target: p.piStar, bad: Math.abs(m.pi - p.piStar) > 1.5 },
    { label: en ? "Unemployment" : "失业率", value: pct(m.u), series: h.map((s) => s.u), target: p.uStar, bad: m.u - p.uStar > 1.5 },
    { label: en ? "Growth" : "增长", value: pct(m.growth), series: h.map((s) => s.growth), bad: m.growth < 0 },
    { label: en ? "Policy rate" : "政策利率", value: pct(m.rate, 2), series: h.map((s) => s.rate), bad: false },
    { label: tx(p.currency, en), value: m.fx.toFixed(1), series: h.map((s) => s.fx), target: 100, bad: m.fxYoY < -10 },
  ];
  return (
    <div>
      <Section title={en ? "Economy" : "经济"}>
        <ul className="grid gap-1">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[5.5rem_1fr_4rem] items-center gap-2">
              <span className="text-xs text-ink-soft">{r.label}</span>
              <Spark values={r.series} target={r.target} color={r.bad ? "var(--color-down)" : "var(--color-ink)"} />
              <span className={cn("text-right font-mono text-sm font-bold tabular-nums", r.bad && "text-down")}>{r.value}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-muted">
          {en ? "Expected inflation" : "通胀预期"} {pct(m.piE)} · {en ? "debt" : "国债"} {pct(m.debt, 0)} GDP
        </p>
      </Section>

      <Section title={en ? "Standing" : "处境"}>
        <Meter label={en ? "Market trust" : "市场信誉"} value={m.trust} tone={m.trust > 65 ? "good" : m.trust > 40 ? "warn" : "bad"} />
        <Meter label={en ? "Public approval" : "民意支持"} value={game.approval} tone={game.approval > 50 ? "good" : game.approval > 25 ? "warn" : "bad"} />
        <Meter label={en ? "Government pressure" : "政府施压"} value={game.pressure} tone={game.pressure < 50 ? "good" : game.pressure < 80 ? "warn" : "bad"} />
      </Section>

      <Section title={en ? "The world" : "各国央行"}>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-muted">
              <th className="text-left font-normal" />
              <th className="text-right font-normal">{en ? "rate" : "利率"}</th>
              <th className="text-right font-normal">{en ? "infl." : "通胀"}</th>
            </tr>
          </thead>
          <tbody>
            {COUNTRY_ORDER.filter((id) => id !== game.player).map((id) => (
              <tr key={id}>
                <td className="py-0.5">{tx(nameOf(id), en).replace(/^the /, "")}</td>
                <td className="text-right font-mono tabular-nums">{pct(game.countries[id].rate, 2)}</td>
                <td className="text-right font-mono tabular-nums">{pct(game.countries[id].pi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={en ? "Wires" : "电讯"}>
        <ul className="grid gap-1.5">
          {game.news.slice(0, 6).map((n, i) => {
            const d = dateOf(n.week);
            return (
              <li key={`${n.week}-${i}`} className="border-l-2 pl-2 text-xs leading-snug" style={{ borderColor: n.tone === "good" ? "var(--color-up)" : n.tone === "bad" ? "var(--color-down)" : "var(--color-line)" }}>
                <span className="font-mono text-[10px] text-muted">{en ? `Y${d.year} W${d.week}` : `${d.year}年${d.week}周`}</span> {tx(n.text, en)}
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
