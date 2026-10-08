import { sfxClick } from "@/lib/game/audio";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/** 新手模式 switch: advisor and folded tools on, or the full desk. */
export function BeginnerToggle({ en }: { en: boolean }) {
  const beginner = useSettings((s) => s.beginner);
  const setBeginner = useSettings((s) => s.setBeginner);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={beginner}
      onClick={() => {
        sfxClick();
        setBeginner(!beginner);
      }}
      className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold", beginner ? "border-up bg-[#e3ecd9] text-up" : "border-line bg-surface text-muted")}
    >
      {en ? (beginner ? "Beginner: on" : "Beginner: off") : beginner ? "新手模式：开" : "新手模式：关"}
    </button>
  );
}
