import { useId } from "react";
import ladyUrl from "@/assets/portraits/hester-king-hoppner-1805.jpg?url";
import lordUrl from "@/assets/portraits/robertson-raeburn-1805.jpg?url";

/**
 * Period oil portraits (public domain, The Metropolitan Museum of Art Open
 * Access, CC0) cropped to the bust inside an oval gilt frame. The sitters are
 * never named in game; the painters are credited on the card.
 */
export const PORTRAITS = {
  man: {
    src: lordUrl,
    // source 500×625: face centre ≈ (207, 150)
    crop: { x: -28, y: 7, w: 310, h: 388 },
    painter: "Henry Raeburn",
    year: "1805",
  },
  woman: {
    src: ladyUrl,
    // source 521×625: face centre ≈ (265, 220)
    crop: { x: -22, y: -1, w: 240, h: 288 },
    painter: "John Hoppner",
    year: "1805",
  },
} as const;

export function BankerPortrait({
  variant,
  className,
}: {
  variant: "man" | "woman";
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${name}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;
  const p = PORTRAITS[variant];

  return (
    <svg viewBox="0 0 200 260" className={className} role="img" aria-hidden>
      <defs>
        <clipPath id={id("oval")}>
          <ellipse cx="100" cy="130" rx="84" ry="110" />
        </clipPath>
        {/* Aged varnish: the canvas darkens toward the frame. */}
        <radialGradient id={id("varnish")} cx="50%" cy="42%" r="62%">
          <stop offset="0.55" stopColor="#2a1a0a" stopOpacity="0" />
          <stop offset="1" stopColor="#2a1a0a" stopOpacity="0.45" />
        </radialGradient>
        <linearGradient id={id("gilt")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2a0" />
          <stop offset="0.3" stopColor="#c99a3c" />
          <stop offset="0.55" stopColor="#f3d88a" />
          <stop offset="0.8" stopColor="#9c7224" />
          <stop offset="1" stopColor="#e7c46c" />
        </linearGradient>
      </defs>

      <g clipPath={url("oval")}>
        <rect width="200" height="260" fill="#2a1d12" />
        <image
          href={p.src}
          x={p.crop.x}
          y={p.crop.y}
          width={p.crop.w}
          height={p.crop.h}
          preserveAspectRatio="xMidYMid slice"
        />
        <rect width="200" height="260" fill={url("varnish")} />
      </g>

      {/* Oval gilt frame with a bead rule and a crest ribbon at the crown. */}
      <ellipse cx="100" cy="130" rx="85.5" ry="111.5" fill="none" stroke="#3b2a14" strokeWidth="2" opacity="0.6" />
      <ellipse cx="100" cy="130" rx="91.5" ry="117.5" fill="none" stroke={url("gilt")} strokeWidth="9" />
      <ellipse
        cx="100"
        cy="130"
        rx="91.5"
        ry="117.5"
        fill="none"
        stroke="#fff3c8"
        strokeWidth="1.6"
        strokeDasharray="0.1 5.2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <ellipse cx="100" cy="130" rx="96.5" ry="122.5" fill="none" stroke="#6e5316" strokeWidth="1" />
      <g transform="translate(100 9)">
        <path d="M-16 0 Q-8 -7 0 0 Q8 -7 16 0 Q8 6 0 2 Q-8 6 -16 0Z" fill={url("gilt")} stroke="#6e5316" strokeWidth="0.8" />
        <circle r="3.6" fill={variant === "woman" ? "#9a2f48" : "#33415f"} stroke="#f6e2a0" strokeWidth="1" />
      </g>
    </svg>
  );
}
