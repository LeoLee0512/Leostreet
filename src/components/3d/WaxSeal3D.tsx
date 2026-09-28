import { lazy } from "react";
import { Scene3D } from "./Scene3D";

const LazyWaxSealMesh = lazy(() => import("./WaxSealMesh"));

export interface WaxSeal3DProps {
  size?: number;
  className?: string;
  glyph?: string;
}

export function WaxSeal3D({
  size = 48,
  className,
  glyph = "✦",
}: WaxSeal3DProps) {
  const fallback = (
    <span
      className="vic-wax"
      style={{ width: "100%", height: "100%", fontSize: size * 0.38 }}
    >
      {glyph}
    </span>
  );

  return (
    <Scene3D size={size} className={className} fallback={fallback}>
      <LazyWaxSealMesh glyph={glyph} />
    </Scene3D>
  );
}
