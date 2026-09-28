import { Eye, EyeOff, Gauge, Scissors, Wallet, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { sfxGood } from "@/lib/game/audio";
import { roleOf } from "@/lib/match/roles";
import { playerSeat, winsNeeded } from "@/lib/match/series";
import { useMatch } from "@/lib/match/store";
import { useI18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { TEAM_ACCENT } from "./teamStyle";
import { Crest3D } from "@/components/3d";
import { PlayerName } from "@/components/game/PlayerName";

/**
 * The huddle before the bell.
 *
 * A round that simply begins gives the player no beat in which to read their
 * own seat, and the seat is the entire game — the trader who does not know they
 * are blind will sit there waiting for a model price that is never coming.
 * This screen states, in one line each, what you can see and what you cannot.
 */
export function RoundIntro() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const store = useMatch();
  const { match, round } = store;
  if (!match || !round) return null;
  const me = playerSeat(match);
  if (!me) return null;
  const spec = roleOf(me.role);

  // A struck-through line has to read as a plain "you cannot do this". Passing
  // the lead-time through when it is zero produced "news reaches you 0 ticks
  // early", which is nonsense on the seats that do not have it.
  const powers: { on: boolean; icon: ReactNode; text: string }[] = [
    { on: spec.seesModel, icon: <Eye className="size-4" />, text: t("ri.model") },
    { on: spec.slippageMult < 1, icon: <Zap className="size-4" />, text: t("ri.cheap") },
    {
      on: spec.newsLeadTicks > 0,
      icon: <Gauge className="size-4" />,
      text: spec.newsLeadTicks > 0 ? t("ri.lead", { n: spec.newsLeadTicks }) : t("ri.leadOff"),
    },
    { on: spec.canForceCut, icon: <Scissors className="size-4" />, text: t("ri.cut") },
    { on: spec.seesTeamBook, icon: <Wallet className="size-4" />, text: t("ri.book") },
  ];
  const has = powers.filter((p) => p.on);
  const hasnt = powers.filter((p) => !p.on);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm">
      <div className="vic-panel vic-frame animate-pop max-h-[90dvh] w-full max-w-lg overflow-y-auto p-6 sm:p-8">
        <div className="flex justify-center">
          <Crest3D size={52} />
        </div>
        <p className="vic-kicker mt-2 text-center">
          {t("ri.kicker", { n: round.index + 1, w: winsNeeded(match.format) })}
        </p>
        <h2 className="vic-letterpress mt-1 text-center text-4xl font-semibold">
          {lang === "en" ? spec.nameEn : spec.nameZh}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-muted">
          {lang === "en" ? spec.blurbEn : spec.blurbZh}
        </p>

        <div className="mt-4 space-y-1.5">
          {has.map((p) => (
            <Row key={p.text} tone="on" icon={p.icon} text={p.text} />
          ))}
          {hasnt.map((p) => (
            <Row key={p.text} tone="off" icon={<EyeOff className="size-4" />} text={p.text} />
          ))}
        </div>

        <p className="vic-kicker mt-4">{t("ri.desk")}</p>
        <div className="mt-2 space-y-1.5">
          {match.seats
            .filter((s) => s.team === me.team)
            .map((s) => (
              <div
                key={s.id}
                className={cn(
                  "flex items-center justify-between rounded-sm px-3 py-1.5 text-sm",
                  s.human ? "bg-teal text-paper shadow-[inset_0_0_0_1px_#ffffff2e]" : "border border-line bg-surface",
                )}
              >
                <span className="font-bold">
                  {s.human ? <PlayerName name={s.name} /> : s.name}
                  {s.human ? ` · ${t("mr.you")}` : ""}
                </span>
                <span className={cn("text-xs font-extrabold", s.human ? "text-paper/80" : "text-muted")}>
                  {lang === "en" ? roleOf(s.role).nameEn : roleOf(s.role).nameZh}
                </span>
              </div>
            ))}
        </div>

        <p className="mt-3 text-center text-xs text-muted">
          {t("ri.rivals", {
            n: match.teams
              .filter((x) => x !== me.team)
              .map((x) => x.toUpperCase())
              .join(" · "),
          })}
        </p>

        <div className="vic-divider" aria-hidden />
        <Button
          className="w-full"
          size="lg"
          style={{ background: TEAM_ACCENT[me.team] }}
          onClick={() => {
            sfxGood();
            store.beginRound();
          }}
        >
          {t("ri.go")}
        </Button>
      </div>
    </div>
  );
}

function Row({ tone, icon, text }: { tone: "on" | "off"; icon: ReactNode; text: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-sm px-3 py-2 text-[13px] font-semibold",
        tone === "on"
          ? "border border-teal/40 bg-teal-soft text-teal-deep"
          : "border border-line bg-surface text-muted line-through decoration-2",
      )}
    >
      <span className={tone === "on" ? "text-teal" : "opacity-60"}>{icon}</span>
      {text}
    </div>
  );
}
