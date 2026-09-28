import { lazy } from "react";
import { Scene3D } from "./Scene3D";

const LazyCrestMesh = lazy(() => import("./CrestMesh"));

export interface Crest3DProps {
  size?: number;
  className?: string;
}

function ShieldFallback() {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" role="presentation">
      <defs>
        <radialGradient id="c3d-brass" cx="38%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#c9a24a" />
          <stop offset="55%" stopColor="#b08a2e" />
          <stop offset="100%" stopColor="#8f6d1f" />
        </radialGradient>
      </defs>
      <path
        d="M9 6 H39 V22 C39 32 31 39 24 43 C17 39 9 32 9 22 Z"
        fill="url(#c3d-brass)"
        stroke="#6e5316"
        strokeWidth="2"
      />
      <circle
        cx="24"
        cy="21"
        r="8"
        fill="none"
        stroke="#4a3810"
        strokeWidth="2"
      />
      <circle cx="21" cy="19" r="1.4" fill="#4a3810" />
      <circle cx="27" cy="19" r="1.4" fill="#4a3810" />
      <path
        d="M21.5 24 L26.5 24 L24 27 Z M24 27 Q24 30 21 29 M24 27 Q24 30 27 29"
        fill="#4a3810"
        stroke="#4a3810"
        strokeWidth="1"
      />
    </svg>
  );
}

export function Crest3D({ size = 48, className }: Crest3DProps) {
  return (
    <Scene3D size={size} className={className} fallback={<ShieldFallback />}>
      <LazyCrestMesh />
    </Scene3D>
  );
}
