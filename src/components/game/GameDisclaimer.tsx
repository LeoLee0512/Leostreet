import { GAME_DISCLAIMER } from "@/lib/disclaimer";
import { useI18n } from "@/lib/i18n";

/**
 * Always-visible disclaimer strip, mounted at the web root and the desktop root so that every screen shows it.
 * It cannot be dismissed and it never takes clicks (pointer-events: none), so it cannot block a control underneath.
 */
export function GameDisclaimer() {
  const lang = useI18n((s) => s.lang);
  return (
    <div
      role="note"
      data-game-disclaimer=""
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[2147483000] flex justify-center px-2 pb-1"
    >
      <p className="max-w-full rounded-[3px] bg-[#2b2118]/85 px-3 py-0.5 text-center text-[11px] font-semibold leading-snug text-[#f3e9d2] shadow-sm">
        {GAME_DISCLAIMER[lang]}
      </p>
    </div>
  );
}
