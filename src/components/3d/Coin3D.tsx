import { lazy, type CSSProperties } from "react";
import { Scene3D, usePrefersReducedMotion } from "./Scene3D";

const LazyCoinMesh = lazy(() => import("./CoinMesh"));

export interface Coin3DProps {
  size?: number;
  className?: string;
  glyph?: string;
  spinning?: boolean;
}

export function Coin3D({
  size = 48,
  className,
  glyph = "£",
  spinning = false,
}: Coin3DProps) {
  const reduced = usePrefersReducedMotion();
  const spin = spinning && !reduced;

  const fallback = (
    <div
      className="flex items-center justify-center rounded-full font-bold"
      style={
        {
          width: "100%",
          height: "100%",
          fontSize: size * 0.42,
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#6e5316",
          textShadow: "0 1px 0 #d9b458",
          background:
            "radial-gradient(circle at 36% 30%, #c9a24a 0%, #b08a2e 55%, #8f6d1f 100%)",
          boxShadow:
            "inset 0 0 0 2px #7c5f1a, inset 0 0 0 5px #d9b45866, inset 0 2px 4px #ffffff50, 0 2px 4px #3a2c1840",
        } as CSSProperties
      }
    >
      {glyph}
    </div>
  );

  return (
    <Scene3D
      size={size}
      className={className}
      fallback={fallback}
      frameloop={spin ? "always" : "demand"}
    >
      <LazyCoinMesh glyph={glyph} spinning={spin} />
    </Scene3D>
  );
}
