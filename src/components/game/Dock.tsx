import { Briefcase, Landmark, Newspaper, Settings, Store, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useGame } from "@/lib/game/store";
import type { PanelId } from "@/lib/game/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Dock() {
  const t = useT();
  const open = useGame((s) => s.openPanel);
  const setPanel = useGame((s) => s.setPanel);
  const items: { id: PanelId; label: string; icon: ReactNode }[] = [
    { id: "portfolio", label: t("dock.book"), icon: <Wallet className="size-4" /> },
    { id: "exchange", label: t("dock.trade"), icon: <Landmark className="size-4" /> },
    { id: "news", label: t("dock.news"), icon: <Newspaper className="size-4" /> },
    { id: "shop", label: t("dock.shop"), icon: <Store className="size-4" /> },
    { id: "office", label: t("dock.office"), icon: <Briefcase className="size-4" /> },
    { id: "settings", label: t("set.title"), icon: <Settings className="size-4" /> },
  ];
  return (
    <nav className="pointer-events-auto absolute inset-x-2 bottom-2 z-30 flex justify-center sm:hidden">
      <div className="relative flex w-full max-w-md items-center justify-between rounded-[6px] border border-wood-deep bg-gradient-to-b from-wood to-wood-deep px-3 py-2 text-paper shadow-[inset_0_1px_0_#ffffff2e,inset_0_-3px_5px_#0000003d,var(--shadow-border)]">
        <span aria-hidden className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-gradient-to-br from-brass-bright to-brass-deep shadow-[inset_0_1px_0_#ffffff73,0_1px_1px_#00000059]" />
        <span aria-hidden className="absolute right-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-gradient-to-br from-brass-bright to-brass-deep shadow-[inset_0_1px_0_#ffffff73,0_1px_1px_#00000059]" />
        {items.map((it) => (
          <button
            key={String(it.id)}
            type="button"
            onClick={() => setPanel(open === it.id ? null : it.id)}
            className={cn(
              "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-[4px] px-2 text-[10px] font-bold tracking-[0.04em]",
              open === it.id
                ? "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-brass),inset_0_1px_0_#ffffff59]"
                : "text-paper/85 hover:bg-wood-deep/60",
            )}
          >
            {it.icon}
            {it.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
