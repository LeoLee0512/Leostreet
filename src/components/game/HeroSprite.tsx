import type { Gender } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export type SpriteAction = "idle" | "walk" | "run";

/**
 * Victoria-era engraved bust: a brass-framed cabinet portrait.
 * Original vector engraving, no cartoon sprites.
 */
export function HeroSprite({
  gender,
  flip = false,
  className,
}: {
  gender: Gender;
  animated?: boolean;
  flip?: boolean;
  action?: SpriteAction;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 150"
      role="img"
      aria-label={gender === "female" ? "代表档案 · 女" : "代表档案 · 男"}
      className={cn(
        "pointer-events-none select-none text-ink",
        flip && "-scale-x-100",
        className,
      )}
    >
      {/* Double-ruled cabinet frame */}
      <rect
        x="5"
        y="5"
        width="110"
        height="140"
        rx="2"
        fill="var(--color-surface)"
        stroke="var(--color-line)"
        strokeWidth="1.4"
      />
      <rect
        x="11"
        y="11"
        width="98"
        height="128"
        rx="1.5"
        fill="var(--color-paper-deep)"
        stroke="var(--color-brass-deep)"
        strokeWidth="1"
        opacity=".85"
      />
      {/* Registration ticks */}
      <path
        d="M18 21h24M18 27h16M78 123h22M78 129h16"
        stroke="var(--color-line)"
        strokeWidth="1.6"
      />
      {/* Engraved bust: ink lines over the parchment ground */}
      <g fill="currentColor" opacity=".82">
        {gender === "female" ? (
          <>
            {/* hair, bun, collar */}
            <path d="M60 34c-16 0-24 10-24 24 0 8 2 14 6 19l-2 7c14 7 26 7 40 0l-2-7c4-5 6-11 6-19 0-14-8-24-24-24Z" />
            <path d="M60 38c-11 0-17 8-17 19 0 7 2 12 5 16-1-9 1-16 3-21l9-2 9 2c2 5 3 12 3 21 3-4 5-9 5-16 0-11-6-19-17-19Z" fill="var(--color-paper-deep)" />
            <path d="M42 78c-6 6-9 14-9 24v12h54v-12c0-10-3-18-9-24-6 5-12 8-18 8s-12-3-18-8Z" />
            <path d="M54 96l6 8 6-8-6-4-6 4Z" fill="var(--color-paper-deep)" />
          </>
        ) : (
          <>
            {/* hair, moustache, collar */}
            <path d="M60 34c-16 0-24 10-24 24 0 8 2 14 6 19l-2 7c14 7 26 7 40 0l-2-7c4-5 6-11 6-19 0-14-8-24-24-24Z" />
            <path d="M60 38c-11 0-17 8-17 19 0 7 2 12 5 16-1-9 1-16 3-21l9-2 9 2c2 5 3 12 3 21 3-4 5-9 5-16 0-11-6-19-17-19Z" fill="var(--color-paper-deep)" />
            <path d="M42 78c-6 6-9 14-9 24v12h54v-12c0-10-3-18-9-24-6 5-12 8-18 8s-12-3-18-8Z" />
            <path d="M53 96l7 10 7-10-7-5-7 5Z" fill="var(--color-paper-deep)" />
          </>
        )}
      </g>
      {/* Bottom caption line, brass */}
      <path d="M18 134h30" stroke="var(--color-brass-deep)" strokeWidth="2" opacity=".8" />
    </svg>
  );
}
