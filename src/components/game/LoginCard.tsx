import { useMemo, useState } from "react";
import { QrCode, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfxClick, sfxGood } from "@/lib/game/audio";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LOGIN_KEY = "leo-street-login-v1";

/** How the player identified themselves. "scan" is a placeholder for a real
 * provider sign-in; no brand is implied or displayed. */
export type LoginChannel = "scan" | "guest";

export type LoginState = { channel: LoginChannel; name: string };

export function readLogin(): LoginState | null {
  try {
    const raw = localStorage.getItem(LOGIN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<LoginState>;
    if (p.channel !== "scan" && p.channel !== "guest") return null;
    if (typeof p.name !== "string" || !p.name) return null;
    return { channel: p.channel, name: p.name };
  } catch {
    return null;
  }
}

function writeLogin(state: LoginState) {
  try {
    localStorage.setItem(LOGIN_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function randomSuffix() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function channelName(
  t: (k: string, v?: Record<string, string>) => string,
  channel: LoginChannel,
): string {
  if (channel === "guest") return t("login.guestName", { n: randomSuffix() });
  return t("login.scanName", { n: randomSuffix() });
}

/** A deterministic fake QR grid, mirroring the cashier's placeholder. */
function LoginQr({ seed, color }: { seed: string; color: string }) {
  const cells = 21;
  const bits = useMemo(() => {
    const out = Array<boolean>(cells * cells).fill(false);
    const set = (x: number, y: number, v = true) => {
      if (x < 0 || y < 0 || x >= cells || y >= cells) return;
      out[y * cells + x] = v;
    };
    const finder = (ox: number, oy: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const edge = x === 0 || y === 0 || x === 6 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          set(ox + x, oy + y, edge || core);
        }
      }
    };
    finder(0, 0);
    finder(cells - 7, 0);
    finder(0, cells - 7);
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    const reserved = (x: number, y: number) =>
      (x < 8 && y < 8) || (x >= cells - 8 && y < 8) || (x < 8 && y >= cells - 8);
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        if (reserved(x, y)) continue;
        h = Math.imul(h, 1103515245) + 12345;
        set(x, y, (h >>> 28) % 3 !== 0);
      }
    }
    return out;
  }, [seed]);
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${cells}, 1fr)`, width: 148, height: 148 }}
    >
      {bits.map((on, i) => (
        <span key={i} style={{ background: on ? color : "transparent" }} />
      ))}
    </div>
  );
}

export function LoginCard({ onName }: { onName: (name: string) => void }) {
  const t = useT();
  const [login, setLogin] = useState<LoginState | null>(() => readLogin());
  const [qr, setQr] = useState<LoginChannel | null>(null);

  const finish = (channel: LoginChannel) => {
    const name = channelName(t, channel);
    const state = { channel, name };
    writeLogin(state);
    setLogin(state);
    setQr(null);
    onName(name);
  };

  const asLabel = (channel: LoginChannel) =>
    channel === "guest" ? t("login.asGuest") : t("login.asScan");

  return (
    <div className="mt-4">
      {login ? (
        <div className="flex items-center justify-between gap-2 rounded-[14px] bg-paper px-3 py-2 shadow-[3px_4px_0_#3d2414]">
          <p className="min-w-0 truncate text-xs font-bold">
            {asLabel(login.channel)} · <span className="text-muted">{login.name}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              sfxClick();
              try {
                localStorage.removeItem(LOGIN_KEY);
              } catch {
                /* ignore */
              }
              setLogin(null);
            }}
            className="shrink-0 text-[11px] font-bold text-teal underline"
          >
            {t("login.switch")}
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs font-bold tracking-wide text-muted">{t("login.title")}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ChannelButton
              color="#83c5b8"
              label={t("login.scan")}
              onClick={() => {
                sfxClick();
                setQr("scan");
              }}
            />
            <ChannelButton
              color="#c9b88c"
              label={t("login.guest")}
              icon={<UserRound className="size-4" aria-hidden />}
              onClick={() => {
                sfxGood();
                finish("guest");
              }}
            />
          </div>
        </>
      )}

      {qr ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4">
          <div className="panel-shell w-full max-w-xs p-5 text-center">
            <p className="text-sm font-extrabold">{t("login.scan")}</p>
            <p className="mt-1 text-xs text-muted">{t("login.scanHint")}</p>
            <div className="mt-3 flex justify-center rounded-[14px] bg-white p-3 shadow-[inset_0_0_0_2px_rgba(61,36,20,0.12)]">
              <LoginQr seed={`${qr}-${Date.now()}`} color="#2f6b62" />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed font-bold text-down">
              {t("login.demo")}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => {
                  sfxClick();
                  setQr(null);
                }}
              >
                {t("login.cancel")}
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  sfxGood();
                  finish(qr);
                }}
              >
                {t("login.ok")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChannelButton({
  color,
  label,
  icon,
  onClick,
}: {
  color: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-[14px] px-2 py-2.5 text-center shadow-[3px_4px_0_#3d2414]",
        "transition-transform duration-150 active:scale-[0.98]",
      )}
      style={{ background: `${color}1a`, color }}
    >
      {icon ?? <QrCode className="size-4" aria-hidden />}
      <span className="text-[11px] font-extrabold">{label}</span>
    </button>
  );
}
