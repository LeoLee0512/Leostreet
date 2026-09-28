import { identityOf } from "@/lib/game/identity";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The player's name with whatever cosmetics they are wearing.
 *
 * One component so a purchased title shows up everywhere at once — the lobby,
 * the huddle, the desk, the result screen. Cosmetics that only render in the
 * shop they were bought from are not cosmetics, they are a receipt.
 */
export function PlayerName({
  name,
  className,
  titleClassName,
}: {
  name: string;
  className?: string;
  titleClassName?: string;
}) {
  const lang = useI18n((s) => s.lang);
  const id = typeof window === "undefined" ? null : identityOf(name);
  if (!id) return <span className={className}>{name}</span>;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {id.title ? (
        <span
          className={cn(
            "rounded-[2px] border border-ink/25 px-1.5 py-0.5 font-display text-[10px] font-extrabold uppercase leading-none tracking-[0.08em] text-paper shadow-[inset_0_1px_0_#ffffff38]",
            titleClassName,
          )}
          style={{ background: id.accent }}
        >
          {lang === "en" ? id.title.en : id.title.zh}
        </span>
      ) : null}
      <span>{id.name}</span>
    </span>
  );
}

/** The player's chosen accent, for rows and buttons that are "theirs". */
export function usePlayerAccent(): string {
  return typeof window === "undefined" ? "#2f6b62" : identityOf("").accent;
}
