import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { clockLabel, compactCcy, compactUsd, ratePct } from "@/lib/game/format";
import { dayOf, hourOf } from "@/lib/game/economy";
import { asCountry, clockWithTz, isBoardOpen } from "@/lib/game/countries";
import { hudSnapshot, useGame } from "@/lib/game/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Coin3D } from "@/components/3d";
import { LangToggle } from "./LangToggle";

const CHIPS_KEY = "leo-street-hud-chips";

export function HudBar() {
  const t = useT();
  // One derived snapshot per tick instead of a whole-store subscription. The
  // bar used to re-render on every state change in the game, including the
  // ones that move sprites.
  const hud = useGame(useShallow(hudSnapshot));
  const tick = useGame((st) => st.tick);
  const depressionFrom = useGame((st) => st.depressionFromTick);
  const rescuePoints = useGame((st) => st.rescuePoints);
  const day = dayOf(tick);
  const hour = hourOf(tick);
  const street = asCountry(hud.street);
  const open = isBoardOpen(tick, street);
  const nw = hud.net;
  const setPanel = useGame((st) => st.setPanel);
  const speed = useGame((st) => st.speed);
  const setSpeed = useGame((st) => st.setSpeed);
  const wd = (day - 1) % 7;
  const [chipsOpen, setChipsOpen] = useState(
    () => typeof window === "undefined" || localStorage.getItem(CHIPS_KEY) !== "0",
  );
  const toggleChips = () =>
    setChipsOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(CHIPS_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 p-2 sm:p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="vic-panel pointer-events-auto flex items-center gap-2 px-3 py-2">
          <div>
            <p className="vic-letterpress font-display text-lg font-bold leading-none tracking-[0.05em]">
              {t("game.hudTitle")}
            </p>
            <p className="mt-1 border-t border-line/70 pt-1 text-[11px] font-bold tracking-[0.06em] text-muted">
              {t(`wd.${wd}`)} · {t("hud.day", { n: day })} · {t("hud.std")} {clockLabel(hour)}
              <span className={cn("ml-2", open ? "text-up" : "text-muted")}>
                {open ? t("hud.open") : t("hud.closed")}
              </span>
              {speed === 0 ? <span className="ml-2 font-extrabold text-down">{t("hud.pause")}</span> : null}
            </p>
          </div>
          <LangToggle />
          <button
            type="button"
            aria-label={t("hud.world")}
            title={t("hud.world")}
            onClick={() => setPanel("world")}
            className="flex size-11 items-center justify-center rounded-[3px] border border-line bg-paper text-base text-ink shadow-[inset_0_1px_0_#ffffff59] hover:border-brass"
          >
            🌐
          </button>
          <button
            type="button"
            aria-label={t("hud.speed")}
            title={t("hud.speed")}
            onClick={() => setSpeed(speed === 0 ? 1 : speed === 1 ? 3 : speed === 3 ? 8 : 0)}
            className="flex h-11 min-w-11 items-center justify-center rounded-[3px] border border-line bg-paper px-2 font-mono text-xs font-extrabold text-ink shadow-[inset_0_1px_0_#ffffff59] hover:border-brass"
          >
            {speed === 0 ? "⏸" : `${speed}×`}
          </button>
          <button
            type="button"
            aria-label={t("set.title")}
            onClick={() => setPanel("settings")}
            className="flex size-11 items-center justify-center rounded-[3px] border border-line bg-paper text-ink shadow-[inset_0_1px_0_#ffffff59] hover:border-brass"
          >
            <Settings className="size-4" />
          </button>
        </div>
        <WorldClocks />
        <div className="pointer-events-auto flex items-start gap-2">
          <button
            type="button"
            onClick={() => setPanel("portfolio")}
            className="vic-panel flex items-center gap-2.5 px-3 py-2 text-right"
          >
            <Coin3D size={34} className="shrink-0" spinning />
            <span>
              <span className="vic-kicker block !text-[9px]">{t("hud.net")}</span>
              <span className="block font-mono text-sm font-bold tabular-nums">{compactUsd(nw)}</span>
            </span>
          </button>
        </div>
      </div>

      <div className="pointer-events-none ml-auto flex max-w-full items-center gap-1.5 pb-1">
        <button
          type="button"
          aria-label={t("hud.chipsToggle")}
          title={t("hud.chipsToggle")}
          onClick={toggleChips}
          className="pointer-events-auto hud-chip min-h-11 shrink-0 items-center justify-center !gap-0 !px-2.5"
        >
          {chipsOpen ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
        </button>
        {chipsOpen ? (
          <div className="flex max-w-full gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Chip k={t("hud.cash")} v={compactUsd(hud.cash)} />
            <Chip k={t("hud.dvd")} v={compactCcy(hud.cashDvd, "dvd")} />
            <Chip k={t("hud.ana")} v={compactCcy(hud.cashAna, "ana")} />
            <Chip k={t("hud.debt")} v={compactUsd(hud.debt)} warn={hud.debt > 0} />
            <Chip k={t("hud.credit")} v={`${hud.credit}`} warn={hud.inDefault || hud.credit < 580} />
            <Chip k={t("hud.gdp")} v={compactUsd(hud.gdp)} />
            <Chip k={t("hud.rate")} v={ratePct(hud.rate)} />
            <Chip k={t("hud.simple")} v={compactUsd(hud.simple)} sub={ratePct(hud.simpleRate)} />
            <Chip k={t("hud.compound")} v={compactUsd(hud.compound)} sub={ratePct(hud.compoundRate)} />
            <Chip k={t("hud.deposits")} v={compactUsd(hud.deposits)} />
            <Chip k={t("hud.prod")} v={hud.prod.toFixed(2)} />
            <Chip k={t("hud.bubble")} v={`${(hud.bubble * 100).toFixed(0)}%`} warn={hud.bubble > 0.65} />
            {depressionFrom != null ? (
              <Chip
                k={t("hud.depression")}
                v={`D${Math.floor((tick - depressionFrom) / 24)} · ${rescuePoints ?? 0}/10`}
                warn
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function Chip({ k, v, sub, warn }: { k: string; v: string; sub?: string; warn?: boolean }) {
  return (
    <div className="hud-chip shrink-0">
      <span className="k">{k}</span>
      <span className={cn("v", warn && "text-down")}>{v}</span>
      {sub ? <span className="text-[10px] font-bold text-muted">{sub}</span> : null}
    </div>
  );
}

function WorldClocks() {
  const t = useT();
  const tick = useGame((s) => s.tick);
  const street = asCountry(useGame((s) => s.street));
  const items = [
    { id: "leo" as const, label: t("hud.boardL") },
    { id: "ramona" as const, label: t("hud.boardR") },
    { id: "david" as const, label: t("hud.boardD") },
  ];
  return (
    <div className="pointer-events-none hidden rounded-[4px] border border-wood-deep bg-gradient-to-b from-wood to-wood-deep p-0.5 text-paper shadow-[inset_0_1px_0_#ffffff2e,inset_0_-2px_3px_#00000036,var(--shadow-border)] sm:flex">
      {items.map((it) => (
        <div
          key={it.id}
          className={cn(
            "flex h-8 items-center rounded-[3px] px-2 text-[11px] font-extrabold tracking-[0.05em]",
            street === it.id
              ? "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-brass)]"
              : "text-paper/80",
          )}
        >
          {it.label} {clockWithTz(tick, it.id)}
          <span className={cn("ml-1", isBoardOpen(tick, it.id) ? "text-up" : "opacity-60")}>
            {isBoardOpen(tick, it.id) ? "●" : "○"}
          </span>
        </div>
      ))}
    </div>
  );
}
