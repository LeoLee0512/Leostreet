import { useGame } from "@/lib/game/store";
import { asCountry } from "@/lib/game/countries";
import type { CountryId } from "@/lib/game/types";
import { ExchangePanel } from "./ExchangePanel";
import {
  BankPanel,
  BrokerPanel,
  CompanyPanel,
  FedPanel,
  NewsPanel,
  OfficePanel,
  PortfolioPanel,
  RealtyPanel,
  ServerPadPanel,
  ShopPanel,
  VcPanel,
} from "./OtherPanels";
import { FxPanel, LawPanel, SettingsPanel } from "./WorldPanels";
import { HonorPanel } from "./HonorPanel";
import { CampusPanel, GatePanel, HomePanel, StationPanel, WarehousePanel } from "./ZonePanels";
import { OnlinePanel } from "./OnlinePanel";

export function PanelHost() {
  const id = useGame((s) => s.openPanel);
  const street = asCountry(useGame((s) => s.street));
  if (!id) return null;
  switch (id) {
    case "exchange":
      return <ExchangePanel />;
    case "bank":
      return <BankPanel />;
    case "news":
      return <NewsPanel />;
    case "shop":
      return <ShopPanel />;
    case "realty":
      return <RealtyPanel />;
    case "office":
      return <OfficePanel />;
    case "broker":
      return <BrokerPanel />;
    case "vc":
      return <VcPanel />;
    case "fed":
      return <FedPanel />;
    case "gold":
      return <CompanyPanel ticker={flagshipTicker("gold", street)} />;
    case "blue":
      return <CompanyPanel ticker={flagshipTicker("blue", street)} />;
    case "oak":
      return <CompanyPanel ticker={flagshipTicker("oak", street)} />;
    case "server-pad":
      return <ServerPadPanel />;
    case "portfolio":
      return <PortfolioPanel />;
    case "settings":
      return <SettingsPanel />;
    case "honor":
      return <HonorPanel />;
    case "fx":
      return <FxPanel />;
    case "law":
      return <LawPanel />;
    case "warehouse":
      return <WarehousePanel />;
    case "home":
      return <HomePanel />;
    case "gate":
      return <GatePanel />;
    case "campus":
      return <CampusPanel />;
    case "station":
      return <StationPanel />;
    case "world":
      return <OnlinePanel />;
    default:
      return null;
  }
}

function flagshipTicker(kind: "gold" | "blue" | "oak", street: CountryId): string {
  const map = {
    gold: { leo: "GOLD", david: "DAIX", ramona: "ANAI" },
    blue: { leo: "BLUE", david: "DBNK", ramona: "ABNK" },
    oak: { leo: "OAK", david: "DRES", ramona: "ARES" },
  } as const;
  return map[kind][street] ?? map[kind].leo;
}
