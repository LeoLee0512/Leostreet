import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import posterUrl from "@/assets/world/world-poster.jpg?url";
import { countryOf, type WorldProvince } from "@/lib/world/world";
import type { WorldHover } from "./WorldMapScene";
import "./WorldMap.css";

const LazyScene = lazy(() => import("./WorldMapScene"));

class SceneBoundary extends Component<{ fallback: ReactNode; children?: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

/**
 * The Blender-modelled fictional world (G3). SSR and no-WebGL clients get the
 * top-down poster; the 3D board mounts on the client after a WebGL probe.
 * Decorative boards (menu backdrops) ignore the pointer entirely.
 */
export function WorldMap({
  en,
  decorative = false,
  selectedId = null,
  tints = null,
  onSelect,
  className = "",
}: {
  en: boolean;
  decorative?: boolean;
  selectedId?: number | null;
  tints?: Uint8Array | null;
  onSelect?: (province: WorldProvince | null) => void;
  className?: string;
}) {
  const [gl, setGl] = useState<"pending" | "on" | "failed">("pending");
  const [hover, setHover] = useState<WorldHover | null>(null);

  useEffect(() => {
    let ok = true;
    try {
      const probe = document.createElement("canvas");
      ok = !!(window.WebGLRenderingContext && (probe.getContext("webgl2") || probe.getContext("webgl")));
    } catch {
      ok = false;
    }
    setGl(ok ? "on" : "failed");
  }, []);

  const poster = <img src={posterUrl} alt="" className="world-map-poster" draggable={false} />;

  return (
    <div className={`world-map ${className}`} data-testid="world-map">
      {gl === "on" ? (
        <SceneBoundary fallback={poster}>
          <Suspense fallback={poster}>
            <LazyScene
              en={en}
              decorative={decorative}
              selectedId={selectedId}
              tints={tints}
              onHover={setHover}
              onSelect={(p) => onSelect?.(p)}
              onFailed={() => setGl("failed")}
            />
          </Suspense>
        </SceneBoundary>
      ) : (
        poster
      )}
      {hover && !decorative ? (
        <div className="world-tooltip" style={{ left: hover.clientX, top: hover.clientY }}>
          <div className="vic-panel px-3 py-2 text-sm">
            <div className="font-display font-semibold text-ink">
              {en ? hover.province.en : hover.province.zh}
              {hover.province.capital ? <span className="ml-1.5 text-brass">★</span> : null}
            </div>
            <div className="text-xs text-muted">
              {en ? countryOf(hover.province.country).en : countryOf(hover.province.country).zh}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
