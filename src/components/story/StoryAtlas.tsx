import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Factory,
  Heart,
  Layers,
  Maximize2,
  Minus,
  Package,
  Plus,
  Ship,
} from "lucide-react";
import type { Economy, SectorId } from "@/lib/story/economy";
import { SECTORS } from "@/lib/story/economy";
import { ATLAS_LABELS, ATLAS_REGIONS, type AtlasLayer } from "@/lib/story/atlas";
import { StoryAtlasPaper } from "./StoryAtlasPaper";
import {
  ATLAS_CITIES,
  ATLAS_HEIGHTS,
  ATLAS_TILT,
  atlasFit,
  atlasProject,
} from "./StoryAtlasGeo";
import "./StoryAtlas.css";

const LazyAtlasScene = lazy(() => import("./StoryAtlasScene"));

const icons = { materials: Package, industry: Factory, transport: Ship };
const layers = [
  { id: "economy" as const, zh: "开工", en: "Production", icon: Factory },
  { id: "livelihoods" as const, zh: "生活", en: "Living", icon: Heart },
  { id: "supply" as const, zh: "供应", en: "Supply", icon: Package },
];
const bounded = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

class AtlasRenderBoundary extends Component<
  { fallback: ReactNode; children?: ReactNode },
  { err: boolean }
> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

/** Original strategic cartography. Neighbors are scenery, not simulated AI countries. */
export function StoryAtlas({
  economy,
  pressure,
  en,
  onManage,
  decorative = false,
  zoomable = false,
}: {
  economy: Economy;
  pressure: number;
  en: boolean;
  onManage?: (id: SectorId) => void;
  decorative?: boolean;
  /** Decorative backdrops can still allow zoom/pinch/zoom-controls (practice ground). */
  zoomable?: boolean;
}) {
  const [selected, select] = useState<SectorId>("industry");
  const [layer, setLayer] = useState<AtlasLayer>("economy");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [gl, setGl] = useState<"pending" | "on" | "failed">("pending");

  // The 3D sandbox mounts only on the client, after a WebGL probe; the
  // engraved 2D chart is the SSR render and the permanent fallback.
  useEffect(() => {
    let ok = true;
    try {
      const probe = document.createElement("canvas");
      ok = !!(
        window.WebGLRenderingContext &&
        (probe.getContext("webgl2") || probe.getContext("webgl"))
      );
    } catch {
      ok = false;
    }
    setGl(ok ? "on" : "failed");
  }, []);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const box = el.getBoundingClientRect();
      setSize({ w: box.width, h: box.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const showScene = gl === "on";
  const interactive = showScene && !decorative;
  // Zoom/pinch are allowed on decorative backdrops that opt in via `zoomable`;
  // single-pointer drag panning stays interactive-only so it never traps scroll.
  const gestureOn = showScene && (interactive || zoomable);

  // Drag to pan, pinch to zoom: tracked on the viewport so gestures work
  // anywhere over the sandbox, markers included.
  const gesture = useRef<{
    pointers: Map<number, { x: number; y: number }>;
    pinch: number;
    zoom: number;
  }>({ pointers: new Map(), pinch: 0, zoom: 1 });
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!gestureOn) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const g = gesture.current;
      g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (g.pointers.size === 2) {
        const [a, b] = [...g.pointers.values()] as [
          { x: number; y: number },
          { x: number; y: number },
        ];
        g.pinch = Math.hypot(a.x - b.x, a.y - b.y);
        g.zoom = zoom;
      }
    },
    [gestureOn, zoom],
  );
  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const g = gesture.current;
      if (!gestureOn || !g.pointers.has(event.pointerId)) return;
      const el = viewport.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      const fit = atlasFit(box.width, box.height, zoom);
      const prev = g.pointers.get(event.pointerId)!;
      g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (g.pointers.size === 1 && interactive) {
        const dx = event.clientX - prev.x,
          dy = event.clientY - prev.y;
        setPan((p) => ({
          x: bounded(p.x + dx / fit, -300, 300),
          y: bounded(p.y + dy / (fit * Math.sin(ATLAS_TILT)), -200, 200),
        }));
      } else if (g.pointers.size === 2) {
        const [a, b] = [...g.pointers.values()] as [
          { x: number; y: number },
          { x: number; y: number },
        ];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (g.pinch > 0) setZoom(bounded((g.zoom * dist) / g.pinch, 1, 2));
      }
    },
    [gestureOn, interactive, zoom],
  );
  const onPointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    gesture.current.pointers.delete(event.pointerId);
    gesture.current.pinch = 0;
  }, []);

  useEffect(() => {
    const el = viewport.current;
    if (!el || !gestureOn) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((z) => bounded(z + (event.deltaY < 0 ? 0.12 : -0.12), 1, 2));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gestureOn]);

  const shift = useCallback(
    (x: number, y: number) =>
      setPan((p) => ({ x: bounded(p.x + x, -300, 300), y: bounded(p.y + y, -200, 200) })),
    [],
  );
  const region = ATLAS_REGIONS.find((p) => p.id === selected)!;
  const SectorIcon = icons[selected],
    sector = SECTORS.find((s) => s.id === selected)!;
  const supply =
    selected === "materials"
      ? economy.materials
      : selected === "industry"
        ? economy.goods
        : economy.freight;
  const supplyName =
    selected === "materials"
      ? en
        ? "Input stocks"
        : "原料库存"
      : selected === "industry"
        ? en
          ? "Goods in storage"
          : "商品库存"
        : en
          ? "Freight / settlement"
          : "每次结算运力";

  const paper = (
    <StoryAtlasPaper
      economy={economy}
      en={en}
      selected={selected}
      layer={layer}
      zoom={zoom}
      pan={pan}
      decorative={decorative}
      onSelectRegion={select}
    />
  );
  const labelSize = Math.min(
    22,
    Math.max(11, atlasFit(size.w || 1, size.h || 1, zoom) * 15),
  );
  const overlay = (x: number, y: number, h = 0) =>
    atlasProject(size, zoom, pan, x, y, h);

  return (
    <section
      className={`strategic-atlas ${decorative ? "strategic-atlas-decorative" : ""}`}
      data-testid="story-atlas"
      aria-label={en ? "Fictional economic atlas" : "虚构经济地图"}
    >
      {!decorative && (
        <div className="atlas-toolbar">
          <div className="atlas-layer-title">
            <Layers className="size-4" />
            <span>{en ? "MAP LAYER" : "地图图层"}</span>
          </div>
          <div className="atlas-layer-buttons" aria-label={en ? "Map layers" : "地图图层"}>
            {layers.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={layer === item.id}
                onClick={() => setLayer(item.id)}
              >
                <item.icon className="size-4" />
                {en ? item.en : item.zh}
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        ref={viewport}
        className={`atlas-viewport ${showScene ? "atlas-viewport-3d" : ""} ${
          interactive ? "atlas-viewport-live" : ""
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {showScene ? (
          <AtlasRenderBoundary fallback={paper}>
            <Suspense fallback={paper}>
              <LazyAtlasScene
                economy={economy}
                selected={selected}
                layer={layer}
                zoom={zoom}
                pan={pan}
                decorative={decorative}
                onSelectRegion={decorative ? undefined : select}
                onFailed={() => setGl("failed")}
              />
            </Suspense>
          </AtlasRenderBoundary>
        ) : (
          paper
        )}
        {showScene && size.w > 0 && (
          <div aria-hidden={decorative} className="atlas-overlay">
            {ATLAS_REGIONS.map((r) => {
              const at = overlay(...r.center, ATLAS_HEIGHTS[r.id] + 2);
              return (
                <span
                  key={r.id}
                  className="atlas-label atlas-label-region"
                  style={{
                    left: at.left,
                    top: at.top,
                    fontSize: labelSize,
                  }}
                >
                  {en ? r.en : r.zh}
                </span>
              );
            })}
            {ATLAS_LABELS.map((item) => {
              const at = overlay(...item.at);
              const cls =
                item.kind === "country"
                  ? "atlas-label atlas-label-country"
                  : item.kind === "sea"
                    ? "atlas-label atlas-label-sea"
                    : item.kind === "route"
                      ? "atlas-label atlas-label-route"
                      : "atlas-label atlas-label-neighbor";
              const scale =
                item.kind === "country"
                  ? 1.15
                  : item.kind === "sea"
                    ? 0.95
                    : item.kind === "route"
                      ? 0.62
                      : item.kind === "power"
                        ? 0.8
                        : 0.68;
              return (
                <span
                  key={`${item.kind}-${item.en}`}
                  className={cls}
                  style={{ left: at.left, top: at.top, fontSize: labelSize * scale }}
                >
                  {en ? item.en : item.zh}
                </span>
              );
            })}
            <svg
              className="atlas-compass"
              viewBox="0 0 80 96"
              aria-hidden
              style={{ right: 14, top: 14 }}
            >
              <g
                fill="none"
                stroke="var(--atlas-muted)"
                strokeWidth="1.4"
              >
                <circle cx="40" cy="48" r="30" />
                <circle cx="40" cy="48" r="21" />
                <path d="M40 18 L46 48 L40 78 L34 48 Z" fill="var(--atlas-muted)" />
                <path
                  d="M22 30 L43 45 L58 66 L37 51 Z"
                  fill="var(--atlas-land)"
                />
                <path
                  d="M58 30 L43 51 L22 66 L37 45 Z"
                  fill="var(--atlas-land)"
                />
              </g>
              <text
                x="40"
                y="12"
                textAnchor="middle"
                fontSize="12"
                fontWeight={600}
                fill="var(--atlas-muted)"
                fontFamily='"Noto Serif SC", Georgia, serif'
              >
                N
              </text>
            </svg>
            {!decorative &&
              ATLAS_CITIES.map((city) => {
                const at = overlay(...city.point, ATLAS_HEIGHTS[city.region] + 2);
                return (
                  <button
                    key={city.region}
                    type="button"
                    className="atlas-pin"
                    style={{ left: at.left, top: at.top }}
                    aria-label={
                      en
                        ? `${ATLAS_REGIONS.find((r) => r.id === city.region)!.en} charter town`
                        : `${ATLAS_REGIONS.find((r) => r.id === city.region)!.zh}城邑`
                    }
                    onClick={() => select(city.region)}
                  >
                    <span className="atlas-pin-flag" />
                  </button>
                );
              })}
          </div>
        )}
        <div className="atlas-map-caption">
          {en ? "THE LANTERN COAST · FICTIONAL GEOGRAPHY" : "灯湾沿岸 · 虚构地理"}
        </div>
        {(!decorative || zoomable) && (
          <div className="atlas-navigation">
            <div className="atlas-zoom">
              <button
                type="button"
                disabled={zoom >= 2}
                aria-label={en ? "Zoom in" : "放大地图"}
                onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
              >
                <Plus className="size-4" />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                disabled={zoom <= 1}
                aria-label={en ? "Zoom out" : "缩小地图"}
                onClick={() => {
                  setZoom((z) => Math.max(1, z - 0.25));
                  if (zoom <= 1.25) setPan({ x: 0, y: 0 });
                }}
              >
                <Minus className="size-4" />
              </button>
              <button
                type="button"
                aria-label={en ? "Reset map" : "复位地图"}
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                <Maximize2 className="size-4" />
              </button>
            </div>
            {zoom > 1 && (
              <div className="atlas-pan" aria-label={en ? "Move map" : "平移地图"}>
                {[
                  { zh: "向左查看", en: "Look left", x: 65, y: 0, icon: ArrowLeft },
                  { zh: "向上查看", en: "Look up", x: 0, y: 45, icon: ArrowUp },
                  { zh: "向下查看", en: "Look down", x: 0, y: -45, icon: ArrowDown },
                  { zh: "向右查看", en: "Look right", x: -65, y: 0, icon: ArrowRight },
                ].map((direction) => (
                  <button
                    key={direction.en}
                    type="button"
                    aria-label={en ? direction.en : direction.zh}
                    onClick={() => shift(direction.x, direction.y)}
                  >
                    <direction.icon className="size-4" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {!decorative && (
        <>
          <div className="atlas-legend">
            <span className="atlas-legend-low" />
            {en ? "Strained" : "吃紧"}
            <span className="atlas-legend-mid" />
            {en ? "Steady" : "尚可"}
            <span className="atlas-legend-high" />
            {en ? "Healthy" : "充足"}
            <span className="atlas-legend-note">
              {layer === "economy"
                ? en
                  ? "Color = sector utilization"
                  : "颜色＝行业开工率"
                : layer === "livelihoods"
                  ? en
                    ? "Color = shared household income"
                    : "颜色＝全辖区共同收入"
                  : en
                    ? "Color = stocks / delivery coverage"
                    : "颜色＝库存／送货覆盖"}
            </span>
          </div>
          <div className="atlas-provinces" aria-label={en ? "Choose a province" : "选择省区"}>
            {ATLAS_REGIONS.map((p) => {
              const Icon = icons[p.id];
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={selected === p.id}
                  onClick={() => select(p.id)}
                >
                  <Icon className="size-4" />
                  <span>{en ? p.en : p.zh}</span>
                  <strong>{Math.round(economy.utilization[p.id] * 100)}%</strong>
                </button>
              );
            })}
          </div>
          <div className="atlas-detail" aria-live="polite">
            <div className="atlas-detail-heading">
              <SectorIcon className="size-5" />
              <div>
                <h3>
                  {en ? region.en : region.zh} <span>· {en ? sector.en : sector.zh}</span>
                </h3>
                <p>{en ? sector.detailEn : sector.detailZh}</p>
              </div>
            </div>
            <div className="atlas-detail-values">
              {layer === "livelihoods" ? (
                <>
                  <div>
                    <span>{en ? "Shared income" : "全辖区收入"}</span>
                    <strong>
                      {Math.round(economy.income)}
                      <small> / 100</small>
                    </strong>
                  </div>
                  <div>
                    <span>{en ? "Shared employment" : "全辖区就业"}</span>
                    <strong>{Math.round(economy.employment)}%</strong>
                  </div>
                  <div>
                    <span>{en ? "Price index" : "物价指数"}</span>
                    <strong>{Math.round(economy.price)}</strong>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span>{en ? "Working capacity" : "开工率"}</span>
                    <strong>{Math.round(economy.utilization[selected] * 100)}%</strong>
                  </div>
                  <div>
                    <span>{layer === "supply" ? supplyName : en ? "Capacity" : "产能"}</span>
                    <strong>
                      {layer === "supply"
                        ? supply.toFixed(1)
                        : `×${economy.capacity[selected].toFixed(2)}`}
                    </strong>
                  </div>
                  <div>
                    <span>{en ? "Share of loans" : "借款份额"}</span>
                    <strong>{Math.round(economy.credit[selected] * 100)}%</strong>
                  </div>
                </>
              )}
            </div>
            {onManage && (
              <button className="atlas-manage" type="button" onClick={() => onManage(selected)}>
                {en ? "Manage this industry" : "管理这项产业"}
                <ArrowUpRight className="size-4" />
              </button>
            )}
          </div>
          <p className="atlas-footnote">
            {en
              ? "Three managed provinces. Income and jobs are shared across the territory; neighboring countries provide fictional context only."
              : "你经营三个省区，收入和就业按全辖区统计。周边两国为虚构背景。"}
            {pressure > 0.65 && (
              <span className="text-down">
                {" "}
                {en ? "Financial stress is high." : "当前金融压力较高。"}
              </span>
            )}
          </p>
        </>
      )}
    </section>
  );
}
