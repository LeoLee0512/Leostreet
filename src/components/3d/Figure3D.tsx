import { lazy } from "react";
import { HeroSprite } from "@/components/game/HeroSprite";
import { Scene3D, usePrefersReducedMotion } from "./Scene3D";

const LazyFigureMesh = lazy(() => import("./FigureMesh"));

export interface Figure3DProps {
  variant: "man" | "woman";
  size?: number;
  className?: string;
}

/**
 * 维多利亚时代金融精英半身像（程序化 three.js 建模）。
 * SSR / WebGL 不可用时降级为 HeroSprite 版画 SVG。
 */
export function Figure3D({ variant, size = 96, className }: Figure3DProps) {
  const reduced = usePrefersReducedMotion();

  const fallback = (
    <div className="flex h-full w-full items-center justify-center">
      <HeroSprite
        gender={variant === "woman" ? "female" : "male"}
        className="h-full w-full"
      />
    </div>
  );

  return (
    <Scene3D
      size={size}
      className={className}
      fallback={fallback}
      frameloop={reduced ? "demand" : "always"}
    >
      <LazyFigureMesh variant={variant} idle={!reduced} />
    </Scene3D>
  );
}
