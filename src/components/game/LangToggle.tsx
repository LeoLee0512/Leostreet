import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LangToggle({ className, full }: { className?: string; full?: boolean }) {
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  if (!full) {
    return (
      <button
        type="button"
        onClick={() => setLang(lang === "zh" ? "en" : "zh")}
        className={cn(
          "flex size-8 items-center justify-center rounded-[3px] border border-line bg-paper font-display text-[10px] font-bold tracking-[0.08em] text-ink shadow-[inset_0_1px_0_#ffffff59] hover:border-brass",
          className,
        )}
        aria-label={lang === "zh" ? "English" : "中文"}
      >
        {lang === "zh" ? "EN" : "中"}
      </button>
    );
  }
  return (
    <div className={cn("flex rounded-[3px] border border-line bg-paper p-0.5 shadow-[inset_0_1px_0_#ffffff59]", className)}>
      <button
        type="button"
        onClick={() => setLang("zh")}
        className={cn(
          "h-8 min-w-10 whitespace-nowrap rounded-[2px] px-2 font-display text-xs font-bold tracking-[0.06em]",
          lang === "zh" ? "bg-brass text-surface shadow-[inset_0_1px_0_#ffffff4d]" : "text-muted hover:text-ink",
        )}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "h-8 min-w-10 whitespace-nowrap rounded-[2px] px-2 font-display text-xs font-bold tracking-[0.06em]",
          lang === "en" ? "bg-brass text-surface shadow-[inset_0_1px_0_#ffffff4d]" : "text-muted hover:text-ink",
        )}
      >
        EN
      </button>
    </div>
  );
}
