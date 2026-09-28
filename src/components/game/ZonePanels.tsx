import { useState } from "react";
import { Button } from "@/components/ui/button";
import { runFinanceCalc } from "@/lib/game/finance";
import { COUNTRY, asCountry, crossingFee, hasAccount, tariffOf } from "@/lib/game/countries";
import { clockLabel, compactUsd, pct } from "@/lib/game/format";
import { runFormulas } from "@/lib/game/formulas";
import { sfxBad, sfxGood } from "@/lib/game/audio";
import { dayOf } from "@/lib/game/economy";
import { useGame } from "@/lib/game/store";
import type { CountryId, ZoneId } from "@/lib/game/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Err, PanelShell, Tabs } from "./PanelShell";
import { FutureDesk } from "./FutureDesk";

const FORMULAS: {
  id: string;
  nameKey: string;
  hintKey: string;
  fields: { key: string; labelKey: string; step?: number }[];
  pct?: boolean;
}[] = [
  {
    id: "simple",
    nameKey: "calc.simple",
    hintKey: "calc.simpleH",
    fields: [
      { key: "pv", labelKey: "calc.pv" },
      { key: "rate", labelKey: "calc.rate", step: 0.001 },
      { key: "years", labelKey: "calc.years", step: 0.5 },
    ],
  },
  {
    id: "compound",
    nameKey: "calc.compound",
    hintKey: "calc.compoundH",
    fields: [
      { key: "pv", labelKey: "calc.pv" },
      { key: "rate", labelKey: "calc.rate", step: 0.001 },
      { key: "years", labelKey: "calc.years", step: 0.5 },
      { key: "m", labelKey: "calc.m" },
    ],
  },
  {
    id: "rule72",
    nameKey: "calc.rule72",
    hintKey: "calc.rule72H",
    fields: [{ key: "rate", labelKey: "calc.rate", step: 0.001 }],
  },
  {
    id: "cagr",
    nameKey: "calc.cagr",
    hintKey: "calc.cagrH",
    fields: [
      { key: "pv", labelKey: "calc.pv" },
      { key: "fv", labelKey: "calc.fv" },
      { key: "years", labelKey: "calc.years", step: 0.5 },
    ],
    pct: true,
  },
  {
    id: "mortgage",
    nameKey: "calc.mortgage",
    hintKey: "calc.mortgageH",
    fields: [
      { key: "pv", labelKey: "calc.principal" },
      { key: "rate", labelKey: "calc.rate", step: 0.001 },
      { key: "months", labelKey: "calc.months" },
    ],
  },
  {
    id: "duration",
    nameKey: "calc.duration",
    hintKey: "calc.durationH",
    fields: [
      { key: "rate", labelKey: "calc.ytm", step: 0.001 },
      { key: "coupon", labelKey: "calc.coupon", step: 0.001 },
      { key: "years", labelKey: "calc.years" },
      { key: "face", labelKey: "calc.face" },
    ],
  },
  {
    id: "capm",
    nameKey: "calc.capm",
    hintKey: "calc.capmH",
    fields: [
      { key: "rf", labelKey: "calc.rf", step: 0.001 },
      { key: "rm", labelKey: "calc.rm", step: 0.001 },
      { key: "beta", labelKey: "calc.beta", step: 0.05 },
    ],
    pct: true,
  },
  {
    id: "sharpe",
    nameKey: "calc.sharpe",
    hintKey: "calc.sharpeH",
    fields: [
      { key: "rp", labelKey: "calc.rp", step: 0.001 },
      { key: "rf", labelKey: "calc.rf", step: 0.001 },
      { key: "vol", labelKey: "calc.vol", step: 0.001 },
    ],
  },
  {
    id: "bs",
    nameKey: "calc.bs",
    hintKey: "calc.bsH",
    fields: [
      { key: "spot", labelKey: "calc.spot" },
      { key: "strike", labelKey: "calc.strike" },
      { key: "years", labelKey: "calc.years", step: 0.05 },
      { key: "rate", labelKey: "calc.rate", step: 0.001 },
      { key: "vol", labelKey: "calc.vol", step: 0.01 },
    ],
  },
  {
    id: "npv",
    nameKey: "calc.npv",
    hintKey: "calc.npvH",
    fields: [
      { key: "rate", labelKey: "calc.rate", step: 0.001 },
      { key: "cashflows", labelKey: "calc.cfs" },
    ],
  },
  {
    id: "fx",
    nameKey: "calc.fx",
    hintKey: "calc.fxH",
    fields: [
      { key: "a", labelKey: "calc.fxA", step: 0.01 },
      { key: "b", labelKey: "calc.fxB", step: 0.01 },
    ],
  },
];

export function HomePanel() {
  const t = useT();
  const s = useGame();
  const [tab, setTab] = useState("journal");
  const [text, setText] = useState("");
  const [op, setOp] = useState("compound");
  const spec = FORMULAS.find((f) => f.id === op) ?? FORMULAS[1]!;
  const [vals, setVals] = useState<Record<string, string>>({
    pv: "10000",
    rate: "0.05",
    years: "5",
    m: "12",
    fv: "16000",
    months: "360",
    coupon: "0.04",
    face: "100",
    rf: "0.03",
    rm: "0.08",
    beta: "1.1",
    rp: "0.11",
    vol: "0.2",
    spot: "100",
    strike: "100",
    cashflows: "-1000,300,400,500",
    a: "100",
    b: "75",
  });
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const args: Record<string, number | string> = {};
    for (const f of spec.fields) {
      const raw = vals[f.key] ?? "";
      if (f.key === "cashflows" || f.key === "kind") args[f.key] = raw;
      else args[f.key] = Number(raw);
    }
    setBusy(true);
    try {
      const res = await runFinanceCalc({ data: { op: spec.id, args } });
      setOut(formatCalc(res, spec.pct));
      sfxGood();
    } catch {
      setOut(formatCalc(runFormulas({ op: spec.id, args }), spec.pct));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelShell title={t("home.title")} subtitle={t("home.sub")}>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "journal", label: t("home.journal") },
          { id: "calc", label: t("home.calc") },
        ]}
      />
      {tab === "journal" ? (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder={t("home.ph")}
            className="mt-2 w-full rounded-[3px] border border-line bg-paper p-3 text-sm leading-relaxed shadow-[inset_0_1px_0_#ffffff59] outline-none focus-visible:border-brass"
          />
          <Button
            onClick={() => {
              s.addJournal(text);
              setText("");
              sfxGood();
            }}
          >
            {t("home.save")}
          </Button>
          <ul className="space-y-2">
            {(s.journal ?? []).length === 0 ? <p className="text-sm text-muted">{t("home.empty")}</p> : null}
            {(s.journal ?? []).map((j) => (
              <li key={j.id} className="rounded-[3px] border border-line/80 bg-paper px-3 py-2">
                <p className="text-[11px] font-bold text-muted">
                  D{dayOf(j.tick)} · {clockLabel(j.tick % 24)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{j.text}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-muted">{t("home.calcSub")}</p>
          <div className="flex flex-wrap gap-1.5">
            {FORMULAS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setOp(f.id)}
                className={cn(
                  "h-9 rounded-[3px] border border-line/70 px-2 text-[11px] font-extrabold",
                  op === f.id ? "bg-teal text-paper" : "bg-paper",
                )}
              >
                {t(f.nameKey)}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted">{t(spec.hintKey)}</p>
          <div className="grid grid-cols-2 gap-2">
            {spec.fields.map((f) => (
              <label key={f.key} className={f.key === "cashflows" ? "col-span-2" : ""}>
                <span className="vic-kicker">{t(f.labelKey)}</span>
                <input
                  value={vals[f.key] ?? ""}
                  onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-[3px] border border-line bg-paper px-3 font-mono text-sm font-semibold shadow-[inset_0_1px_0_#ffffff59] outline-none focus-visible:border-brass"
                />
              </label>
            ))}
          </div>
          <Button disabled={busy} onClick={() => void run()}>
            {busy ? t("calc.busy") : t("calc.go")}
          </Button>
          {out ? <p className="rounded-[3px] border border-teal/40 bg-teal-soft px-3 py-2 font-mono text-sm font-semibold text-teal-deep">{out}</p> : null}
        </div>
      )}
    </PanelShell>
  );
}

function formatCalc(res: Record<string, number | string | boolean>, asPct?: boolean): string {
  if (!res || res.ok === false) return String(res?.error ?? "—");
  const v = Number(res.value);
  const main = asPct ? `${(v * 100).toFixed(3)}%` : Number.isFinite(v) ? v.toFixed(4) : String(res.value);
  const extra = Object.entries(res)
    .filter(([k]) => k !== "ok" && k !== "value" && k !== "error")
    .map(([k, val]) => `${k} ${typeof val === "number" ? val.toFixed(4) : val}`)
    .join(" · ");
  return extra ? `${main} · ${extra}` : main;
}

/**
 * The campus. `campusLecture` / `campusSeminar` have always existed in the
 * store — there was simply no panel that called them, so `edu` could never
 * leave 0 even though `prestige()` reads it. This is that panel.
 */
export function CampusPanel() {
  const t = useT();
  const s = useGame();
  const [err, setErr] = useState<string | null>(null);
  const day = dayOf(s.tick);
  const lectureDone = (s.eduDay ?? 0) >= day;
  const analystLeft = Math.max(0, (s.shop.analystUntilDay ?? 0) - day);
  const act = (fn: () => string | null) => {
    const e = fn();
    setErr(e);
    if (e) sfxBad();
    else sfxGood();
  };
  return (
    <PanelShell title={t("cam.title")} subtitle={t("cam.sub")}>
      <p className="text-sm leading-relaxed text-muted">{t("cam.body")}</p>
      <Err text={err} />
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <CampusStat k={t("cam.edu")} v={(s.edu ?? 0).toFixed(1)} />
        <CampusStat k={t("cam.eduCap")} v="20.0" />
      </div>

      <div className="mt-3 rounded-[3px] border border-line/80 bg-paper p-3">
        <p className="text-sm font-extrabold">{t("cam.lecture")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{t("cam.lectureB")}</p>
        <Button className="mt-2" size="sm" disabled={lectureDone} onClick={() => act(() => s.campusLecture())}>
          {lectureDone ? t("cam.lectureDone") : t("cam.lectureGo")}
        </Button>
      </div>

      <div className="mt-2 rounded-[3px] border border-line/80 bg-paper p-3">
        <p className="text-sm font-extrabold">{t("cam.seminar")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{t("cam.seminarB")}</p>
        {analystLeft > 0 ? (
          <p className="mt-1 text-xs font-bold text-teal-deep">{t("cam.analystLeft", { n: analystLeft })}</p>
        ) : null}
        <Button className="mt-2" size="sm" onClick={() => act(() => s.campusSeminar())}>
          {t("cam.seminarGo", { n: compactUsd(25_000) })}
        </Button>
      </div>
    </PanelShell>
  );
}

/**
 * The transit hall. `shuttleTo` costs an hour and moves the player between
 * districts without walking the whole map — another store action that had no
 * caller.
 */
export function StationPanel() {
  const t = useT();
  const s = useGame();
  const here = s.zone ?? "street";
  const stops: { id: ZoneId; labelKey: string }[] = [
    { id: "street", labelKey: "zone.back" },
    { id: "home", labelKey: "zone.home" },
    { id: "warehouse", labelKey: "zone.wh" },
    { id: "campus", labelKey: "bldg.campus" },
    { id: "gate", labelKey: "zone.gate" },
    { id: "airport", labelKey: "bldg.airport" },
  ];
  return (
    <PanelShell title={t("st.title")} subtitle={t("st.sub")}>
      <div className="grid grid-cols-2 gap-2">
        {stops.map((stop) => (
          <Button
            key={stop.id}
            variant={stop.id === here ? "secondary" : "primary"}
            disabled={stop.id === here}
            onClick={() => {
              s.shuttleTo(stop.id);
              sfxGood();
            }}
          >
            {stop.id === here ? t("st.here") : `${t("st.go")} · ${t(stop.labelKey)}`}
          </Button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">{t("st.note")}</p>
    </PanelShell>
  );
}

function CampusStat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[3px] border border-line/80 bg-paper px-3 py-2 shadow-[inset_0_1px_0_#ffffff59]">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brass-deep">{k}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">{v}</p>
    </div>
  );
}

export function WarehousePanel() {
  const t = useT();
  return (
    <PanelShell title={t("wh.title")} subtitle={t("wh.sub")}>
      <p className="text-sm leading-relaxed text-muted">{t("wh.body")}</p>
      <div className="mt-3">
        <FutureDesk initialSymbol="OIL" />
      </div>
    </PanelShell>
  );
}

export function GatePanel() {
  const t = useT();
  const s = useGame();
  const [err, setErr] = useState<string | null>(null);
  const here = asCountry(s.street);
  const countries: CountryId[] = ["leo", "ramona", "david"];
  const act = (fn: () => string | null) => {
    const e = fn();
    setErr(e);
    if (e) sfxBad();
    else sfxGood();
  };

  return (
    <PanelShell title={t("gate.title")} subtitle={t("gate.sub")}>
      <p className="text-sm leading-relaxed text-muted">{t("gate.body")}</p>
      <Err text={err} />
      <div className="mt-3 space-y-2">
        {countries.map((c) => {
          const spec = COUNTRY[c];
          const owned = hasAccount(s, c);
          const fee = crossingFee(here, c);
          const duty = tariffOf(s, c);
          return (
            <div key={c} className="rounded-[3px] border border-line/80 bg-paper p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-extrabold">{t(`world.${c}`)}</p>
                <p className="text-[11px] font-bold text-muted">
                  {t(`board.${spec.board}`)} · {t("gate.tz", { n: spec.tz >= 0 ? `+${spec.tz}` : spec.tz })}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted">
                {t("gate.hours", { a: spec.open[0], b: spec.open[1] })} · {t("gate.tariff", { n: pct(duty, 1) })}
              </p>
              <p className="mt-1 text-xs text-muted">
                {owned ? t("gate.acctOn") : t("gate.acctOff", { n: compactUsd(spec.accountFeeLeo) })}
              </p>
              <div className="mt-2 flex gap-2">
                {!owned ? (
                  <Button size="sm" onClick={() => act(() => s.openAccount(c))}>
                    {t("gate.open")}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant={c === here ? "secondary" : "primary"}
                  disabled={c === here || !owned}
                  onClick={() => act(() => s.travelTo(c))}
                >
                  {c === here ? t("gate.here") : t("gate.go", { n: compactUsd(fee) })}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">{t("gate.note")}</p>
    </PanelShell>
  );
}