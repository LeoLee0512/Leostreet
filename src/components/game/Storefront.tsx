import { useState } from "react";
import { Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfxBad, sfxGood } from "@/lib/game/audio";
import { createPayOrder, type PayOrder } from "@/lib/game/pay";
import { readProgress } from "@/lib/game/progress";
import {
  DEFAULT_ACCENT,
  availableAccents,
  ownedTitles,
  setAccent,
  setActiveTitle,
} from "@/lib/game/identity";
import { STORE_ITEMS } from "@/lib/game/storefront";
import { useI18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The shelf, shared by the shop panel and settings.
 *
 * Everything on it is a title, a colour or an extra mode. The old shelf sold
 * starting cash and the broker seat, which meant the fastest way to "win" was
 * to not play; nothing here can do that.
 */
export function StorefrontShelf({ onOrder }: { onOrder: (order: PayOrder) => void }) {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const [rev, bump] = useState(0);
  const prog = typeof window === "undefined" ? null : readProgress();
  const owned = prog?.owned ?? [];
  const titles = typeof window === "undefined" ? [] : ownedTitles();
  const accents = typeof window === "undefined" ? [] : availableAccents();
  void rev;

  return (
    <>
      {/* What you bought, where you switch it on. Owning a title and having no
          way to wear it is the same as not owning it. */}
      {titles.length || accents.length > 1 ? (
        <>
          <p className="mt-5 vic-kicker">{t("cos.mine")}</p>
          {titles.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <PickChip
                on={!prog?.activeTitle}
                label={t("cos.noTitle")}
                onClick={() => {
                  setActiveTitle("");
                  bump((n) => n + 1);
                }}
              />
              {titles.map((tt) => (
                <PickChip
                  key={tt.id}
                  on={prog?.activeTitle === tt.id}
                  label={lang === "en" ? tt.en : tt.zh}
                  onClick={() => {
                    setActiveTitle(tt.id);
                    bump((n) => n + 1);
                  }}
                />
              ))}
            </div>
          ) : null}
          {accents.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {accents.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={hex}
                  onClick={() => {
                    setAccent(hex);
                    bump((n) => n + 1);
                  }}
                  className={cn(
                    "size-8 rounded-full border-[3px] transition-transform active:scale-90",
                    (prog?.accent || DEFAULT_ACCENT) === hex ? "border-ink" : "border-line",
                  )}
                  style={{ background: hex }}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <p className="mt-5 vic-kicker">{t("shop.rmb")}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{t("shop.rmbNote")}</p>
      <div className="mt-2 space-y-2">
        {STORE_ITEMS.map((item) => {
          const have = owned.includes(item.id);
          return (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-[3px] border border-line/80 bg-paper p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  {item.kind === "cosmetic" ? (
                    <Palette className="size-3.5 text-muted" aria-hidden />
                  ) : (
                    <Sparkles className="size-3.5 text-muted" aria-hidden />
                  )}
                  {lang === "en" ? item.nameEn : item.nameZh}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {lang === "en" ? item.blurbEn : item.blurbZh}
                </p>
                <p className="mt-1 font-mono text-xs font-semibold">
                  {lang === "en" ? "Trial ¥0" : "试用 ¥0"}
                </p>
              </div>
              <Button
                size="sm"
                variant={have ? "secondary" : "primary"}
                disabled={have}
                className={cn(have && "opacity-70")}
                onClick={() => {
                  const o = createPayOrder(item.id, "wechat");
                  if (!o) {
                    sfxBad();
                    return;
                  }
                  sfxGood();
                  onOrder(o);
                }}
              >
                {have ? t("shop.have") : t("shop.rmbBuy")}
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PickChip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-[3px] border px-3 text-[11px] font-extrabold transition-transform active:scale-95",
        on ? "border-brass-deep bg-brass text-paper shadow-[inset_0_1px_0_#ffffff59]" : "border-line bg-surface-2 text-muted",
      )}
    >
      {label}
    </button>
  );
}
