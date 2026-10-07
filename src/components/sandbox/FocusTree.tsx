import { useEffect } from "react";
import { X } from "lucide-react";
import { sfxClick } from "@/lib/game/audio";
import { BRANCHES, FOCUS, FOCUS_BY_ID, focusAvailable } from "@/lib/sandbox/focus";
import { useSandbox } from "@/lib/sandbox/store";
import type { FocusNode, SandboxGame } from "@/lib/sandbox/types";
import { cn } from "@/lib/utils";
import { tx } from "./format";

const W = 138;
const H = 92;
const GX = 18;
const GY = 46;
const TOP = 34;
const COLS = 8;
const ROWS = Math.max(...FOCUS.map((f) => f.at[1])) + 1;
const WIDTH = COLS * W + (COLS - 1) * GX;
const HEIGHT = TOP + ROWS * H + (ROWS - 1) * GY;

const x = (f: FocusNode) => f.at[0] * (W + GX);
const y = (f: FocusNode) => TOP + f.at[1] * (H + GY);

/** Hearts-of-Iron style national focus tree, opened over the map. */
export function FocusTree({ game, en, onClose }: { game: SandboxGame; en: boolean; onClose: () => void }) {
  const act = useSandbox((s) => s.act);
  const active = game.focusActive;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-2 pb-9 sm:p-6 sm:pb-9" role="dialog" aria-modal aria-labelledby="focus-title">
      <div className="vic-panel flex max-h-full w-full max-w-[78rem] flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="vic-kicker">{en ? "NATIONAL FOCUS" : "国策"}</p>
            <h2 id="focus-title" className="font-display text-xl font-semibold">
              {en ? "Reform tree" : "国策树"}
            </h2>
          </div>
          <p className="ml-auto text-sm">
            {en ? "Political capital" : "公信力"} <b className="font-mono text-lg">{Math.floor(game.points)}</b>
            {active ? (
              <span className="ml-3 text-xs text-muted">
                {en ? "In progress:" : "推进中："}
                {tx(FOCUS_BY_ID[active.id].name, en)} · {en ? `${active.left}w` : `${active.left} 周`}
              </span>
            ) : (
              <span className="ml-3 text-xs text-muted">{en ? "Pick one reform at a time." : "一次推进一项国策。"}</span>
            )}
          </p>
          <button type="button" onClick={onClose} aria-label={en ? "Close" : "关闭"} className="grid size-9 place-items-center rounded-[3px] border border-line bg-surface hover:border-brass-deep">
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="overflow-auto p-4">
          <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
            {BRANCHES.map((b) => {
              const left = b.cols[0] * (W + GX) - 6;
              const width = (b.cols[1] - b.cols[0] + 1) * (W + GX) - GX + 12;
              return (
                <div key={b.name.zh} className="absolute top-0 rounded-[3px] border border-dashed border-line/70 bg-paper-deep/30" style={{ left, width, height: HEIGHT }}>
                  <p className="vic-kicker pt-2 text-center">{tx(b.name, en)}</p>
                </div>
              );
            })}

            <svg className="pointer-events-none absolute inset-0" width={WIDTH} height={HEIGHT} aria-hidden>
              {FOCUS.flatMap((f) =>
                f.requires.map((r) => {
                  const p = FOCUS_BY_ID[r];
                  const x1 = x(p) + W / 2;
                  const y1 = y(p) + H;
                  const x2 = x(f) + W / 2;
                  const y2 = y(f);
                  const mid = y1 + GY / 2;
                  const lit = game.focusDone.includes(r);
                  return (
                    <path
                      key={`${r}-${f.id}`}
                      d={`M${x1} ${y1} V${mid} H${x2} V${y2}`}
                      fill="none"
                      stroke={lit ? "var(--color-up)" : "var(--color-line)"}
                      strokeWidth={lit ? 2.5 : 1.5}
                      strokeDasharray={lit ? undefined : "4 3"}
                    />
                  );
                }),
              )}
            </svg>

            {FOCUS.map((f) => {
              const done = game.focusDone.includes(f.id);
              const running = active?.id === f.id;
              const open = focusAvailable(game.focusDone, f.id);
              const affordable = game.points >= f.cost;
              const canStart = open && !active && !done;
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={!canStart}
                  onClick={() => {
                    sfxClick();
                    act({ type: "focus", id: f.id });
                  }}
                  className={cn(
                    "absolute flex flex-col rounded-[4px] border px-2 py-1.5 text-left transition-[transform,box-shadow] disabled:cursor-default",
                    done && "border-up bg-[#e3ecd9]",
                    running && "border-brass-deep bg-[#f3e2b4] shadow-[0_0_0_2px_var(--color-brass)]",
                    !done && !running && open && "border-ink-soft bg-surface hover:-translate-y-0.5 hover:shadow-[0_4px_10px_-4px_#3a2c1866]",
                    !done && !running && !open && "border-dashed border-line bg-paper/70 opacity-55",
                  )}
                  style={{ left: x(f), top: y(f), width: W, height: H }}
                  title={tx(f.effect, en)}
                >
                  <span className="text-[13px] font-bold leading-tight">{tx(f.name, en)}</span>
                  <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-ink-soft">{tx(f.effect, en)}</span>
                  <span className="mt-auto flex items-center justify-between font-mono text-[10px]">
                    {done ? (
                      <span className="font-bold text-up">✓ {en ? "Done" : "已完成"}</span>
                    ) : running ? (
                      <span className="w-full">
                        <span className="block h-1 overflow-hidden rounded-full bg-paper-deep">
                          <span className="block h-full bg-brass" style={{ width: `${((f.weeks - active!.left) / f.weeks) * 100}%` }} />
                        </span>
                      </span>
                    ) : (
                      <>
                        <span className={cn(open && !affordable && "text-down")}>
                          {f.cost} {en ? "cap." : "公信力"}
                        </span>
                        <span className="text-muted">
                          {f.weeks}
                          {en ? "w" : "周"}
                        </span>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
