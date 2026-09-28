import { useEffect, useState } from "react";
import { Phone, PhoneIncoming, PhoneOff, PhoneOutgoing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfxBad, sfxClick, sfxGood } from "@/lib/game/audio";
import { useStory } from "@/lib/story/store";
import { useI18n, useT } from "@/lib/i18n";
import { canPause, SILENCE_WARNING_ZH, SILENCE_WARNING_EN } from "@/lib/story/realtime";
import { WaxSeal3D } from "@/components/3d";
import { cn } from "@/lib/utils";

/**
 * The telephone.
 *
 * Every one of these crises was fought on the phone, and the thing that makes
 * a call a call rather than a dialog box is that it does not resolve the
 * instant you click it. So there is a real delay here — between 0.62 and 1.4
 * seconds, drawn off the run's own seeded stream so a replay rings for exactly
 * as long as it rang the first time.
 *
 * The delay is short on purpose. Long enough to feel your own pulse, never
 * long enough to be waiting.
 */
export function PhoneCall({ onMinimize }: { onMinimize?: () => void }) {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const phone = useStory((s) => s.phone);
  const store = useStory();
  const en = lang === "en";
  // Drives the "…" while the line is connecting. Purely cosmetic, and stopped
  // the moment the call goes live so it cannot keep a timer alive.
  const [dots, setDots] = useState(1);

  const status = phone?.status;
  const delay = phone?.delay ?? 0;
  const callId = phone?.script.id;

  useEffect(() => {
    if (status !== "connecting") return;
    const id = window.setTimeout(() => {
      sfxGood();
      useStory.getState().connected();
    }, delay);
    return () => window.clearTimeout(id);
  }, [status, delay, callId]);

  useEffect(() => {
    if (status !== "connecting") return;
    const id = window.setInterval(() => setDots((d) => (d % 3) + 1), 220);
    return () => window.clearInterval(id);
  }, [status]);

  if (!phone) return null;
  const { script, picked } = phone;
  const inbound = script.direction === "in";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 p-3 sm:items-center">
      <div className="panel-shell animate-pop flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden bg-surface p-0">
        {/* Who is on the other end, and which way the call is going. */}
        <header
          className={cn(
            "flex shrink-0 items-center gap-3 border-b-2 border-brass px-4 py-3 text-paper",
            inbound ? "bg-wood-deep" : "bg-teal-deep",
          )}
        >
          {canPause(store.length) && (
            <button
              type="button"
              onClick={store.togglePause}
              className="min-h-11 rounded-lg bg-paper px-3 text-sm font-bold text-ink"
            >
              {en ? "Pause" : "暂停"}
            </button>
          )}
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full bg-paper/15",
              status === "ringing" && "animate-pulse",
            )}
          >
            {inbound ? <PhoneIncoming className="size-5" /> : <PhoneOutgoing className="size-5" />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold tracking-[0.22em] text-paper/60">
              {inbound ? t("ph.incoming") : t("ph.outgoing")}
            </p>
            <p className="truncate font-display text-lg font-semibold leading-tight">
              {en ? script.fromEn : script.fromZh}
            </p>
            <p className="truncate text-[11px] text-paper/70">
              {en ? script.roleEn : script.roleZh}
            </p>
          </div>
          {onMinimize && (
            <button
              type="button"
              className="ml-auto min-h-11 shrink-0 rounded-lg bg-paper/15 px-2 text-xs font-bold"
              onClick={onMinimize}
            >
              {en ? "Later" : "稍后处理"}
            </button>
          )}
        </header>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-dashed border-line px-4 pt-3 pb-2">
          <p className="text-sm font-bold text-down">
            {en ? "Market time continues during calls. Deadline in " : "通话期间市场继续运行，剩余 "}
            {Math.ceil(store.secondsLeft)}
            {en ? " seconds" : " 秒"}
          </p>
          <span aria-hidden="true" className="shrink-0 rotate-6">
            <WaxSeal3D size={44} glyph="✦" />
          </span>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
          style={{
            backgroundImage:
              "radial-gradient(120% 90% at 50% 0%, transparent 55%, #3a2c1812 100%), radial-gradient(90% 70% at 0% 100%, #6e53160f, transparent 60%), repeating-linear-gradient(0deg, var(--color-line) 0 1px, transparent 1px 28px)",
            backgroundSize: "100% 100%, 100% 100%, 100% 28px",
          }}
        >
          {status === "ringing" ? (
            <p className="text-center text-sm font-bold text-muted">{t("ph.declineWarn")}</p>
          ) : null}

          {status === "connecting" ? (
            <p className="py-6 text-center font-mono text-sm font-bold tracking-[0.3em] text-muted">
              {t("ph.connecting")}
              {".".repeat(dots)}
            </p>
          ) : null}

          {status === "live" || status === "reply" ? (
            <ul className="space-y-2">
              {script.lines.map((l, i) => (
                <li
                  key={i}
                  className={cn(
                    "animate-slide-in rounded-sm border-l-2 border-line bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-ink-soft",
                    i === 0 && "vic-dropcap",
                  )}
                >
                  {en ? l.en : l.zh}
                </li>
              ))}
              {picked ? (
                <>
                  <li className="animate-slide-in ml-8 rounded-sm border-r-2 border-brass bg-paper px-3 py-2 text-right text-[13px] leading-relaxed text-ink">
                    {en ? picked.en : picked.zh}
                  </li>
                  <li
                    className={cn(
                      "animate-slide-in rounded-sm border-l-2 px-3 py-2 text-[13px] leading-relaxed",
                      picked.tone === "good"
                        ? "border-up bg-up/15 text-up"
                        : picked.tone === "bad"
                          ? "border-down bg-down/15 text-down"
                          : "border-line bg-surface-2 text-ink-soft",
                    )}
                  >
                    {en ? picked.replyEn : picked.replyZh}
                  </li>
                </>
              ) : null}
            </ul>
          ) : null}
        </div>

        <footer className="max-h-[48dvh] shrink-0 overflow-y-auto border-t-2 border-brass-deep/40 px-4 py-3">
          {status !== "reply" && (
            <button
              type="button"
              onClick={() => store.decline()}
              className="mb-3 min-h-11 w-full rounded-sm border border-down bg-paper p-3 text-left text-down"
            >
              <span className="block text-sm font-extrabold">
                {en ? "Remain silent" : "保持沉默"}
              </span>
              <span className="mt-1 block text-xs font-bold">
                {en ? SILENCE_WARNING_EN : SILENCE_WARNING_ZH}
              </span>
            </button>
          )}
          {status === "ringing" ? (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button
                size="lg"
                onClick={() => {
                  sfxClick();
                  store.pickUp();
                }}
              >
                <Phone className="size-4" aria-hidden />
                {t("ph.answer")}
              </Button>
            </div>
          ) : null}

          {status === "connecting" ? (
            <p className="text-center text-[11px] font-bold text-muted">{t("ph.connecting")}</p>
          ) : null}

          {status === "live" ? (
            <div className="grid gap-2">
              {script.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    if (o.tone === "bad") sfxBad();
                    else sfxGood();
                    store.say(o.id);
                  }}
                  className="rounded-sm border border-line bg-surface-2 px-3 py-2.5 text-left text-[13px] font-semibold leading-snug transition-colors hover:border-brass hover:bg-teal-soft active:scale-[0.99]"
                >
                  {en ? o.en : o.zh}
                </button>
              ))}
            </div>
          ) : null}

          {status === "reply" ? (
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                sfxClick();
                store.hangUp();
              }}
            >
              <PhoneOff className="size-4" aria-hidden />
              {t("ph.hangUp")}
            </Button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
