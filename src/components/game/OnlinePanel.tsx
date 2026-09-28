import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { netWorth, prestige } from "@/lib/game/economy";
import { compactLeo, leo, pct } from "@/lib/game/format";
import { getBoard, submitScore, type BoardRow } from "@/lib/game/leaderboard";
import { sfxBad, sfxGood } from "@/lib/game/audio";
import { useGame } from "@/lib/game/store";
import type { RivalRole } from "@/lib/game/types";
import { useI18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Err, PanelShell, Tabs } from "./PanelShell";

const ROLES: RivalRole[] = ["analyst", "trader", "manager"];
const HIRE_WAGE: Record<RivalRole, number> = { analyst: 600, trader: 1000, manager: 1600 };

function capRole(r: string) {
  return r.charAt(0).toUpperCase() + r.slice(1);
}

type Act = (fn: () => string | null) => void;

export function OnlinePanel() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const s = useGame();
  const [tab, setTab] = useState("rank");
  const [err, setErr] = useState<string | null>(null);
  const act: Act = (fn) => {
    const e = fn();
    setErr(e);
    if (e) sfxBad();
    else sfxGood();
  };
  const rivalName = (id: string) => {
    const r = s.rivals.find((x) => x.id === id);
    return r ? (lang === "en" ? r.nameEn : r.nameZh) : id;
  };
  return (
    <PanelShell title={t("on.title")} subtitle={t("on.sub")}>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "rank", label: t("on.rank") },
          { id: "rivals", label: t("on.rivals") },
          { id: "offers", label: `${t("on.offers")} (${(s.offers ?? []).length})` },
          { id: "team", label: t("on.team") },
        ]}
      />
      <Err text={err} />
      {tab === "rank" ? <RankBoard /> : null}
      {tab === "rivals" ? <RivalsTab act={act} /> : null}
      {tab === "offers" ? <OffersTab act={act} rivalName={rivalName} /> : null}
      {tab === "team" ? <TeamTab rivalName={rivalName} /> : null}
    </PanelShell>
  );
}

function RankBoard() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const s = useGame();
  const nw = netWorth(s);
  const rows = [
    { id: "__you", name: s.name, nav: nw, you: true },
    ...(s.rivals ?? []).map((r) => ({ id: r.id, name: lang === "en" ? r.nameEn : r.nameZh, nav: r.nav, you: false })),
  ].sort((a, b) => b.nav - a.nav);
  const myRank = rows.findIndex((r) => r.you) + 1;
  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm font-bold">
        {t("on.rankN", { n: myRank })} · {t("on.nav")} {compactLeo(nw)}
      </p>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={cn(
              "flex items-center justify-between rounded-[14px] px-3 py-2 text-sm",
              r.you ? "bg-teal text-paper" : "bg-paper",
            )}
          >
            <span className="font-bold">
              {i + 1}. {r.name}
            </span>
            <span className="font-mono tabular-nums">{compactLeo(r.nav)}</span>
          </div>
        ))}
      </div>
      <GlobalBoard />
    </div>
  );
}

/** Global net-worth board — live once deployed with the network database; local fallback otherwise. */
function GlobalBoard() {
  const t = useT();
  const s = useGame();
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [off, setOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    try {
      await submitScore({
        data: { playerId: s.playerId, name: s.name, nav: Math.round(netWorth(useGame.getState())) },
      });
      const res = await getBoard({ data: {} });
      if (res.ok) setRows(res.rows);
      else setOff(true);
    } catch {
      setOff(true);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per open
  }, []);
  return (
    <div className="rounded-[16px] bg-paper p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-wide text-muted">{t("on.global")}</p>
        {!off ? (
          <button type="button" disabled={busy} className="text-xs font-bold text-teal-deep" onClick={() => void load()}>
            {t("on.refresh")}
          </button>
        ) : null}
      </div>
      {off ? (
        <p className="mt-2 text-xs leading-relaxed text-muted">{t("on.globalOff")}</p>
      ) : rows === null ? (
        <p className="mt-2 text-xs text-muted">…</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {rows.map((r, i) => (
            <div
              key={r.playerId}
              className={cn(
                "flex items-center justify-between rounded-[12px] px-2.5 py-1.5 text-xs",
                r.playerId === s.playerId ? "bg-teal text-paper" : "bg-surface-2",
              )}
            >
              <span className="font-bold">
                {i + 1}. {r.name}
              </span>
              <span className="font-mono tabular-nums">{compactLeo(r.nav)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RivalsTab({ act }: { act: Act }) {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const s = useGame();
  const canHire = prestige(s) >= 12;
  return (
    <div className="mt-3 space-y-2">
      {s.rivals.map((r) => {
        const my = (s.rivalStakes ?? []).filter((x) => x.rivalId === r.id);
        const stake = my.reduce((a, x) => a + x.shares, 0) * r.nav;
        const invested = my.reduce((a, x) => a + x.invested, 0);
        return (
          <div key={r.id} className="rounded-[16px] bg-paper p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-extrabold">{lang === "en" ? r.nameEn : r.nameZh}</p>
              <p className="font-mono text-xs font-bold tabular-nums">{compactLeo(r.nav)}</p>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {t("on.alpha")} {pct(r.alpha * 365, 0)} · {t(`title.${r.career}`)}
            </p>
            {stake > 0 ? (
              <p className="mt-1 text-xs font-semibold text-muted">
                {t("on.stake", { n: compactLeo(stake) })} ({stake >= invested ? "+" : "−"}
                {compactLeo(Math.abs(stake - invested)).replace("-", "")})
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => act(() => s.investRival(r.id, 10_000))}>
                {t("on.invest")} Ł10K
              </Button>
              <Button size="sm" variant="secondary" onClick={() => act(() => s.investRival(r.id, 50_000))}>
                Ł50K
              </Button>
              {stake > 0 ? (
                <Button size="sm" variant="ghost" onClick={() => act(() => s.redeemRival(r.id))}>
                  {t("on.redeem")}
                </Button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t-2 border-dashed border-line pt-2">
              <span className="text-[11px] font-bold text-muted">{t("on.hire")}:</span>
              {ROLES.map((role) => (
                <Button
                  key={role}
                  size="sm"
                  variant="ghost"
                  disabled={Boolean(s.hired) || !canHire}
                  title={t("on.wage", { n: HIRE_WAGE[role] })}
                  onClick={() => act(() => s.hireRival(r.id, role))}
                >
                  {t(`on.role${capRole(role)}`)}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OffersTab({ act, rivalName }: { act: Act; rivalName: (id: string) => string }) {
  const t = useT();
  const s = useGame();
  const offers = (s.offers ?? []).filter((o) => o.expiryTick > s.tick);
  return (
    <div className="mt-3 space-y-2">
      {offers.length === 0 ? <p className="text-sm text-muted">{t("on.noOffers")}</p> : null}
      {offers.map((o) => (
        <div key={o.id} className="rounded-[16px] bg-paper p-3">
          <p className="text-sm font-bold">
            {o.kind === "invest"
              ? t("on.offerInvest", { r: rivalName(o.rivalId), n: leo(o.amount, 0) })
              : t("on.offerJob", { r: rivalName(o.rivalId), role: t(`on.role${capRole(o.role ?? "analyst")}`), n: o.amount })}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => act(() => s.acceptOffer(o.id))}>
              {t("on.accept")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                s.declineOffer(o.id);
                sfxGood();
              }}
            >
              {t("on.decline")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamTab({ rivalName }: { rivalName: (id: string) => string }) {
  const t = useT();
  const s = useGame();
  const nw = netWorth(s);
  const empty = !s.hired && !s.employedBy && (s.investors ?? []).length === 0;
  return (
    <div className="mt-3 space-y-3">
      {empty ? <p className="text-sm text-muted">{t("on.noTeam")}</p> : null}
      {s.hired ? (
        <div className="rounded-[16px] bg-paper p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold">
              {rivalName(s.hired.rivalId)} · {t(`on.role${capRole(s.hired.role)}`)}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                s.fireHired();
                sfxGood();
              }}
            >
              {t("on.fire")}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted">{t("on.wage", { n: HIRE_WAGE[s.hired.role] })}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t(`on.effect${capRole(s.hired.role)}`)}</p>
        </div>
      ) : null}
      {s.employedBy ? (
        <div className="rounded-[16px] bg-paper p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold">
              {t("on.employed", { r: rivalName(s.employedBy.rivalId) })} · {t(`on.role${capRole(s.employedBy.role)}`)}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                s.resignJob();
                sfxGood();
              }}
            >
              {t("on.resign")}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted">{t("on.salary", { n: s.employedBy.salary ?? 800 })}</p>
        </div>
      ) : null}
      {(s.investors ?? []).length ? (
        <div className="rounded-[16px] bg-paper p-3">
          <p className="text-xs font-bold tracking-wide text-muted">{t("on.investors")}</p>
          {(s.investors ?? []).map((inv) => {
            const stake = inv.invested * (nw / Math.max(1, inv.hwm));
            return (
              <div key={inv.rivalId} className="mt-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="font-bold">{rivalName(inv.rivalId)}</span>
                <span className="font-mono text-xs tabular-nums">
                  {compactLeo(stake)} · {t("on.hwm", { n: compactLeo(inv.hwm) })}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
