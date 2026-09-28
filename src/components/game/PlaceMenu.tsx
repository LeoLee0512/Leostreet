import {
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Coins,
  GraduationCap,
  Globe2,
  Landmark,
  LineChart,
  Newspaper,
  Plane,
  Scale,
  Server,
  Store,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import type { ReactNode } from "react";
import { asCountry, isBoardOpen } from "@/lib/game/countries";
import { useGame } from "@/lib/game/store";
import type { PanelId } from "@/lib/game/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The single-player hub.
 *
 * This replaced the walkable town. Walking to a building to open a modal was a
 * fifteen-second tax on a click, and the map's real job — being the place you
 * read the market from — moved to the match desk, where the information comes
 * from your teammates instead of from scenery.
 *
 * Everything the town opened still opens here; nothing about the economy
 * changed. It is the same doors, without the walk.
 *
 * On desktop the doors are filed into two translucent paper wing panels —
 * trade on the left edge, money / intelligence / the desk / the world on the
 * right — so the 3D atlas stays visible between them, Vic3-style. Below lg
 * it falls back to the original single-column sheet.
 */
type Place = {
  id: Exclude<PanelId, null>;
  icon: ReactNode;
  labelKey: string;
  blurbKey: string;
  /** Marks the door as live — the colo pad lights up once the rack is in. */
  live?: (s: ReturnType<typeof useGame.getState>) => boolean;
};

type Group = { titleKey: string; places: Place[] };

const GROUPS: Group[] = [
  {
    titleKey: "place.trade",
    places: [
      { id: "exchange", icon: <Landmark className="size-5" />, labelKey: "bldg.exchange", blurbKey: "place.exchangeB" },
      { id: "warehouse", icon: <Warehouse className="size-5" />, labelKey: "zone.wh", blurbKey: "place.warehouseB" },
      { id: "fx", icon: <Coins className="size-5" />, labelKey: "bldg.fx", blurbKey: "place.fxB" },
      { id: "portfolio", icon: <Wallet className="size-5" />, labelKey: "pf.title", blurbKey: "place.portfolioB" },
    ],
  },
  {
    titleKey: "place.money",
    places: [
      { id: "bank", icon: <Banknote className="size-5" />, labelKey: "bldg.bank", blurbKey: "place.bankB" },
      { id: "vc", icon: <Building2 className="size-5" />, labelKey: "bldg.vc", blurbKey: "place.vcB" },
      { id: "broker", icon: <Users className="size-5" />, labelKey: "bldg.broker", blurbKey: "place.brokerB" },
      { id: "realty", icon: <Building2 className="size-5" />, labelKey: "bldg.realty", blurbKey: "place.realtyB" },
    ],
  },
  {
    titleKey: "place.know",
    places: [
      { id: "news", icon: <Newspaper className="size-5" />, labelKey: "bldg.news", blurbKey: "place.newsB" },
      { id: "campus", icon: <GraduationCap className="size-5" />, labelKey: "bldg.campus", blurbKey: "place.campusB" },
      { id: "law", icon: <Scale className="size-5" />, labelKey: "bldg.law", blurbKey: "place.lawB" },
      { id: "fed", icon: <LineChart className="size-5" />, labelKey: "bldg.fed", blurbKey: "place.fedB" },
    ],
  },
  {
    titleKey: "place.desk",
    places: [
      { id: "office", icon: <Briefcase className="size-5" />, labelKey: "bldg.office", blurbKey: "place.officeB" },
      {
        id: "server-pad",
        icon: <Server className="size-5" />,
        labelKey: "bldg.pad",
        blurbKey: "place.padB",
        live: (s) => s.shop.serverAt === "exchange",
      },
      { id: "shop", icon: <Store className="size-5" />, labelKey: "bldg.shop", blurbKey: "place.shopB" },
      { id: "home", icon: <BookOpen className="size-5" />, labelKey: "zone.home", blurbKey: "place.homeB" },
    ],
  },
  {
    titleKey: "place.world",
    places: [
      { id: "gate", icon: <Plane className="size-5" />, labelKey: "zone.gate", blurbKey: "place.gateB" },
      { id: "world", icon: <Globe2 className="size-5" />, labelKey: "on.title", blurbKey: "place.worldB" },
    ],
  },
];

const LEFT_GROUPS = GROUPS.slice(0, 1);
const RIGHT_GROUPS = GROUPS.slice(1);

type TFunc = ReturnType<typeof useT>;

function StatusBadges({ t }: { t: TFunc }) {
  const street = asCountry(useGame((s) => s.street));
  const tick = useGame((s) => s.tick);
  const halt = useGame((s) => s.haltUntilTick > s.tick);
  const open = isBoardOpen(tick, street);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="vic-panel inline-flex items-center gap-2 px-3 py-1.5 font-display text-xs font-bold tracking-[0.12em] text-teal-deep">
        <span aria-hidden className="inline-block size-2 rounded-full bg-brass shadow-[inset_0_1px_0_#ffffff73]" />
        {t(`world.${street}`)}
      </span>
      <span
        className={cn(
          "inline-flex items-center rounded-[3px] border px-3 py-1.5 text-xs font-extrabold tracking-[0.08em]",
          halt
            ? "border-down bg-down text-paper"
            : open
              ? "border-up bg-up text-paper"
              : "border-line bg-surface-2 text-muted",
        )}
      >
        {halt ? t("bldg.halt") : open ? t("hud.open") : t("hud.closed")}
      </span>
    </div>
  );
}

/** The original grid card, kept for the mobile single-column sheet. */
function GridCard({ place, t }: { place: Place; t: TFunc }) {
  const setPanel = useGame((s) => s.setPanel);
  const serverAt = useGame((s) => s.shop.serverAt);
  const isLive = place.id === "server-pad" ? serverAt === "exchange" : false;
  return (
    <button
      type="button"
      onClick={() => setPanel(place.id)}
      className={cn(
        "vic-panel flex min-h-[7.5rem] flex-col items-start gap-1 p-3 text-left",
        "transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]",
        isLive && "ring-2 ring-up",
      )}
    >
      <span className="text-brass-deep">{place.icon}</span>
      <span className="vic-letterpress font-display text-sm font-bold leading-tight">
        {t(place.labelKey)}
      </span>
      <span className="text-[11px] leading-snug text-muted">{t(place.blurbKey)}</span>
    </button>
  );
}

/** Compact horizontal ledger row used inside the desktop wing panels. */
function WingRow({ place, t }: { place: Place; t: TFunc }) {
  const setPanel = useGame((s) => s.setPanel);
  const serverAt = useGame((s) => s.shop.serverAt);
  const isLive = place.id === "server-pad" ? serverAt === "exchange" : false;
  return (
    <button
      type="button"
      onClick={() => setPanel(place.id)}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-[3px] border border-line/80 bg-surface/90 px-3 py-2 text-left",
        "shadow-[inset_0_1px_0_#ffffff59] transition-colors duration-150",
        "hover:border-brass hover:bg-surface active:bg-surface-2",
        "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-brass",
        isLive && "border-up ring-1 ring-up",
      )}
    >
      <span className="shrink-0 text-brass-deep [&_svg]:size-[18px]">{place.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="vic-letterpress block font-display text-[13px] font-bold leading-tight">
          {t(place.labelKey)}
        </span>
        <span className="mt-0.5 block truncate text-[10.5px] leading-snug text-muted">
          {t(place.blurbKey)}
        </span>
      </span>
      {isLive ? (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-up" />
      ) : (
        <span aria-hidden className="shrink-0 text-[10px] text-brass-deep/70">
          ❦
        </span>
      )}
    </button>
  );
}

function WingGroup({ group, t }: { group: Group; t: TFunc }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden className="h-px flex-1 bg-line/70" />
        <h2 className="vic-kicker !text-[10px]">{t(group.titleKey)}</h2>
        <span aria-hidden className="h-px flex-1 bg-line/70" />
      </div>
      <div className="flex flex-col gap-1.5">
        {group.places.map((place) => (
          <WingRow key={place.id} place={place} t={t} />
        ))}
      </div>
    </section>
  );
}

const WING_CLASS = cn(
  "pointer-events-auto flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto rounded-[4px] p-3 xl:w-[330px]",
  "border border-line bg-surface/85 shadow-[inset_0_0_0_1px_#ffffff40,0_10px_30px_#3a2c1830] backdrop-blur-sm",
  "[scrollbar-width:thin] [scrollbar-color:var(--color-line)_transparent]",
);

export function PlaceMenu() {
  const t = useT();

  return (
    <>
      {/* Mobile / narrow: the original single-column sheet. */}
      <div className="min-h-dvh overflow-y-auto pb-28 pt-[10rem] sm:pb-20 lg:hidden">
        <div className="mx-auto w-full max-w-3xl px-3 sm:px-5">
          <div className="mb-5">
            <StatusBadges t={t} />
          </div>
          {GROUPS.map((group) => (
            <section key={group.titleKey} className="mb-6">
              <div className="vic-divider mb-3">
                <h2 className="vic-kicker">{t(group.titleKey)}</h2>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {group.places.map((place) => (
                  <GridCard key={place.id} place={place} t={t} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Desktop: Vic3-style translucent paper wings, map visible between. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-[7.5rem] bottom-28 z-10 hidden justify-between gap-4 px-3 lg:flex xl:px-5"
      >
        <aside aria-label={t("place.trade")} className={WING_CLASS}>
          <div aria-hidden className="h-1 rounded-full bg-gradient-to-r from-brass-deep via-brass-bright to-brass-deep opacity-80" />
          <StatusBadges t={t} />
          {LEFT_GROUPS.map((group) => (
            <WingGroup key={group.titleKey} group={group} t={t} />
          ))}
        </aside>
        <aside aria-label={t("place.money")} className={WING_CLASS}>
          <div aria-hidden className="h-1 rounded-full bg-gradient-to-r from-brass-deep via-brass-bright to-brass-deep opacity-80" />
          {RIGHT_GROUPS.map((group) => (
            <WingGroup key={group.titleKey} group={group} t={t} />
          ))}
          <p aria-hidden className="mt-auto pt-1 text-center text-[11px] tracking-[0.35em] text-brass-deep/60">
            ✦ ◆ ✦
          </p>
        </aside>
      </div>
    </>
  );
}
