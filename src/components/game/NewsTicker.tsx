import { Radio } from "lucide-react";
import { asCountry } from "@/lib/game/countries";
import { visibleNews } from "@/lib/game/economy";
import { useGame } from "@/lib/game/store";
import { useI18n, useT } from "@/lib/i18n";

export function NewsTicker() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const s = useGame();
  const items = visibleNews(s).slice(0, 8);
  const exclusive = s.shop.quantServer && s.shop.serverAt === "exchange";
  const home = asCountry(s.homeCountry ?? s.street);
  const line =
    items.length === 0
      ? t("news.tape")
      : items
          .map((n) => {
            const intl = asCountry(n.country ?? home) !== home;
            const head = lang === "en" ? n.headlineEn : n.headlineZh;
            return intl ? `${t("news.intlTag")} ${head}` : head;
          })
          .join("    ·    ");

  return (
    <div className="news-tape pointer-events-auto absolute inset-x-0 bottom-16 z-20 flex h-9 items-center overflow-hidden shadow-[0_-3px_0_-2px_var(--color-brass),0_3px_0_-2px_var(--color-brass)] sm:bottom-4">
      <button
        type="button"
        onClick={() => useGame.getState().setPanel("news")}
        className="relative z-10 flex h-full shrink-0 items-center gap-1.5 border-r border-brass-deep bg-teal-deep px-3 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-paper shadow-[inset_0_1px_0_#ffffff2e]"
      >
        <Radio className="size-3.5" />
        {exclusive ? t("news.ex") : t("dock.news")}
      </button>
      <div className="relative flex-1 overflow-hidden">
        <div className="tape-track flex w-max gap-16 whitespace-nowrap px-4 font-mono text-[12px] font-semibold tracking-[0.02em]">
          <span>{line}</span>
          <span>{line}</span>
        </div>
      </div>
    </div>
  );
}
