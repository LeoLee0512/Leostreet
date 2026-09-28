import { useEffect, useRef } from "react";
import type { Economy, SectorId } from "@/lib/story/economy";
import {
  ATLAS_COUNTRY_TINT,
  ATLAS_ISLANDS,
  ATLAS_LABELS,
  ATLAS_LAND,
  ATLAS_NEIGHBOR_LANDS,
  ATLAS_NEIGHBORS,
  ATLAS_RAIL,
  ATLAS_RAIL_SPUR,
  ATLAS_REGIONS,
  ATLAS_RIVER,
  ATLAS_RIVER_WEST,
  ATLAS_ROUTES,
  ATLAS_SHEET,
  atlasContains,
  type AtlasLayer,
  type AtlasPoint,
} from "@/lib/story/atlas";
import { ATLAS_BRASS_TOWER, ATLAS_PORTS, ATLAS_SETTLEMENTS } from "./StoryAtlasGeo";

export interface StoryAtlasPaperProps {
  economy: Economy;
  en: boolean;
  selected: SectorId;
  layer: AtlasLayer;
  zoom: number;
  pan: { x: number; y: number };
  decorative: boolean;
  onSelectRegion?: (id: SectorId) => void;
}

const W = ATLAS_SHEET.w,
  H = ATLAS_SHEET.h;

/**
 * Hand-engraved 2D chart: the SSR render and the fallback whenever the 3D
 * sandbox cannot mount (no WebGL, context lost, render error).
 */
export function StoryAtlasPaper({
  economy,
  en,
  selected,
  layer,
  zoom,
  pan,
  decorative,
  onSelectRegion,
}: StoryAtlasPaperProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ economy, en, selected, layer, zoom, pan, decorative });
  const draw = useRef<() => void>(() => {});
  useEffect(() => {
    state.current = { economy, en, selected, layer, zoom, pan, decorative };
    draw.current();
  }, [economy, en, selected, layer, zoom, pan, decorative]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const paint = () => {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.round(box.width * dpr),
        height = Math.round(box.height * dpr);
      if (el.width !== width || el.height !== height) {
        el.width = width;
        el.height = height;
      }
      const css = getComputedStyle(el);
      const color = (key: string) => css.getPropertyValue(`--atlas-${key}`).trim();
      const p = {
        water: color("water"),
        land: color("land"),
        border: color("border"),
        ink: color("ink"),
        muted: color("muted"),
        accent: color("accent"),
        relief: color("relief"),
        low: color("low"),
        mid: color("mid"),
        high: color("high"),
        graticule: color("graticule"),
      };
      const s = state.current,
        e = s.economy;
      ctx.setTransform((dpr * box.width) / W, 0, 0, (dpr * box.height) / H, 0, 0);
      // Old-chart sea: warm parchment with age stains, darker toward the sheet's edge.
      ctx.fillStyle = p.water;
      ctx.fillRect(0, 0, W, H);
      const vignette = ctx.createRadialGradient(1200, 700, 360, 1200, 750, 1500);
      vignette.addColorStop(0, "rgba(255,248,228,0.16)");
      vignette.addColorStop(1, "rgba(74,56,35,0.22)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
      for (const [sx, sy, sr, sa] of [
        [500, 300, 260, 0.05],
        [1980, 1080, 320, 0.06],
        [1280, 1300, 220, 0.04],
        [2150, 240, 180, 0.05],
        [320, 1180, 200, 0.05],
      ] as const) {
        const stain = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        stain.addColorStop(0, `rgba(122,92,58,${sa})`);
        stain.addColorStop(1, "rgba(122,92,58,0)");
        ctx.fillStyle = stain;
        ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      }
      ctx.translate(1200, 750);
      ctx.scale(s.zoom, s.zoom);
      ctx.translate(-1200 + s.pan.x, -750 + s.pan.y);
      const path = (points: readonly AtlasPoint[], close = false) => {
        ctx.beginPath();
        points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        if (close) ctx.closePath();
      };
      const stroke = (
        points: readonly AtlasPoint[],
        style: string,
        thickness = 1,
        dash: number[] = [],
      ) => {
        path(points);
        ctx.strokeStyle = style;
        ctx.lineWidth = thickness;
        ctx.setLineDash(dash);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      // Graticule: fine survey lines on the water, not the land.
      ctx.globalAlpha = 0.28;
      for (let x = -160; x <= 2560; x += 80)
        stroke(
          [
            [x, -160],
            [x, 1660],
          ],
          p.graticule,
          0.6,
        );
      for (let y = -160; y <= 1660; y += 80)
        stroke(
          [
            [-160, y],
            [2560, y],
          ],
          p.graticule,
          0.6,
        );
      ctx.globalAlpha = 1;
      const landMass = (points: readonly AtlasPoint[]) => {
        path(points, true);
        ctx.fillStyle = p.land;
        ctx.fill();
        // Hand-drawn coast: a pale halo under a fine ink line, in the survey manner.
        ctx.strokeStyle = p.land;
        ctx.lineWidth = 5;
        ctx.globalAlpha = 0.75;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = p.border;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      };
      landMass(ATLAS_LAND);
      for (const land of ATLAS_NEIGHBOR_LANDS) landMass(land);
      // Hand-laid coastline hatching, in the old watercolour manner.
      ctx.save();
      path(ATLAS_LAND, true);
      ctx.clip();
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 0.5;
      for (let y = 0; y < H; y += 14) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 18) {
          const wobble = Math.sin(x * 0.02 + y * 0.01) * 2.2;
          if (x === 0) ctx.moveTo(x, y + wobble);
          else ctx.lineTo(x, y + wobble);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      for (const island of ATLAS_ISLANDS) {
        path(island, true);
        ctx.fillStyle = p.land;
        ctx.fill();
        ctx.strokeStyle = p.border;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      // Neighbor provinces: flat country washes with hairline borders.
      for (const region of ATLAS_NEIGHBORS) {
        path(region.boundary, true);
        ctx.fillStyle = ATLAS_COUNTRY_TINT[region.country];
        ctx.globalAlpha = 0.32;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = p.border;
        ctx.lineWidth = region.country === "lion" ? 1.1 : 0.8;
        ctx.setLineDash(region.country === "lion" ? [5, 5] : []);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Political tints: muted hues distinguish the provinces beneath the data wash.
      const tint: Record<string, string> = {
        materials: "rgba(176,138,46,0.28)",
        industry: "rgba(84,110,74,0.24)",
        transport: "rgba(148,86,74,0.22)",
      };
      for (const region of ATLAS_REGIONS) {
        const value =
          s.layer === "economy"
            ? e.utilization[region.id]
            : s.layer === "livelihoods"
              ? e.income / 100
              : region.id === "materials"
                ? e.materials / 14
                : region.id === "industry"
                  ? e.goods / 10
                  : e.sales / Math.max(1, e.demand);
        path(region.boundary, true);
        ctx.fillStyle = tint[region.id] ?? "rgba(133,114,82,0.2)";
        ctx.fill();
        ctx.fillStyle = value < 0.45 ? p.low : value < 0.8 ? p.mid : p.high;
        ctx.globalAlpha = 0.72;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = p.border;
        ctx.lineWidth = 1.8 / s.zoom;
        ctx.stroke();
      }
      // Contour rings in the old survey manner, clipped to land.
      ctx.save();
      path(ATLAS_LAND, true);
      ctx.clip();
      ctx.strokeStyle = p.relief;
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = 0.6;
      for (let mountain = 0; mountain < 9; mountain++) {
        const mx = 560 + mountain * 62,
          my = 200 + Math.sin(mountain * 0.9) * 120;
        for (let ring = 1; ring <= 7; ring++) {
          ctx.beginPath();
          for (let k = 0; k <= 36; k++) {
            const angle = (k / 36) * Math.PI * 2,
              radius = ring * 6 + Math.sin(angle * 3 + mountain) * 4;
            const x = mx + Math.cos(angle) * radius * 1.5,
              y = my + Math.sin(angle) * radius * 0.65;
            if (k) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      // Stipple: the hand of the engraver, not random noise.
      ctx.fillStyle = p.ink;
      ctx.globalAlpha = 0.05;
      for (let i = 0; i < 2600; i++)
        ctx.fillRect((i * 97.31) % W, (i * 53.71) % H, 1.1, 1.1);
      ctx.restore();
      // The Dawei highlands, engraved on their own sheet edge.
      ctx.save();
      path(ATLAS_NEIGHBOR_LANDS[0]!, true);
      ctx.clip();
      ctx.strokeStyle = p.relief;
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = 0.55;
      for (let mountain = 0; mountain < 7; mountain++) {
        const mx = 1560 + mountain * 95,
          my = 150 + Math.sin(mountain * 1.3) * 130;
        for (let ring = 1; ring <= 5; ring++) {
          ctx.beginPath();
          for (let k = 0; k <= 30; k++) {
            const angle = (k / 30) * Math.PI * 2,
              radius = ring * 6 + Math.sin(angle * 3 + mountain) * 4;
            const x = mx + Math.cos(angle) * radius * 1.5,
              y = my + Math.sin(angle) * radius * 0.65;
            if (k) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.restore();
      stroke(ATLAS_RIVER, p.water, 5.5);
      stroke(ATLAS_RIVER, p.border, 0.8);
      stroke(ATLAS_RIVER_WEST, p.water, 4.5);
      stroke(ATLAS_RIVER_WEST, p.border, 0.7);
      stroke(ATLAS_RAIL, p.water, 6);
      stroke(ATLAS_RAIL, p.ink, 1.4);
      stroke(ATLAS_RAIL, p.ink, 4, [1, 7]);
      stroke(ATLAS_RAIL_SPUR, p.water, 5);
      stroke(ATLAS_RAIL_SPUR, p.ink, 1.2);
      stroke(ATLAS_RAIL_SPUR, p.ink, 3.4, [1, 7]);
      // Charted sea lanes with a brass dash.
      ctx.globalAlpha = 0.8;
      for (const route of ATLAS_ROUTES) stroke(route.points, p.accent, 1.6, [7, 6]);
      ctx.globalAlpha = 1;
      // Settlements: block clusters, denser downtown in the metropolises.
      for (const town of ATLAS_SETTLEMENTS) {
        const [x, y] = town.point;
        const blocks = town.size === "metro" ? 18 : town.size === "city" ? 12 : 7;
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = p.ink;
        for (let block = 0; block < blocks; block++)
          ctx.fillRect(
            x + 8 + (block % 5) * 5,
            y + 2 + Math.floor(block / 5) * 6,
            3,
            4,
          );
        ctx.globalAlpha = 1;
      }
      // Harbours: a fine pier rule with two moored marks.
      for (const port of ATLAS_PORTS) {
        const [x, y] = port.point;
        const dx = Math.cos(port.angle),
          dy = Math.sin(port.angle);
        stroke(
          [
            [x, y],
            [x + dx * 26, y + dy * 26],
          ],
          p.ink,
          2.2,
        );
        ctx.fillStyle = p.ink;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x + dx * 30 - 2, y + dy * 30 - 2, 5, 3);
        ctx.fillRect(x + dx * 38 - 2, y + dy * 38 - 2, 5, 3);
        ctx.globalAlpha = 1;
      }
      // The brass exchange tower of Tidemarch: a fleuron on the chart.
      ctx.fillStyle = p.accent;
      ctx.font = `600 15px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.fillText("◆", ATLAS_BRASS_TOWER.point[0], ATLAS_BRASS_TOWER.point[1] + 5);
      // City symbols: a parchment pennant on a brass pin, the survey mark.
      for (const [x, y] of [
        [682, 706],
        [842, 879],
        [1218, 931],
      ] as AtlasPoint[]) {
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 16);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 16);
        ctx.lineTo(x + 12, y - 12.5);
        ctx.lineTo(x, y - 9);
        ctx.closePath();
        ctx.fillStyle = p.accent;
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = p.land;
        ctx.fill();
        ctx.stroke();
      }
      if (!s.decorative) {
        path(ATLAS_REGIONS.find((r) => r.id === s.selected)!.boundary, true);
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 3 / s.zoom;
        ctx.stroke();
      }
      const textSize = Math.min(30, Math.max(17, (W / box.width) * 11)) / Math.sqrt(s.zoom);
      const label = (text: string, x: number, y: number, size: number, style: string) => {
        ctx.font = `600 ${size}px "Noto Serif SC", Georgia, "Songti SC", SimSun, serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = style;
        ctx.strokeStyle = p.land;
        ctx.lineWidth = 3.5;
        ctx.lineJoin = "round";
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      };
      for (const region of ATLAS_REGIONS)
        label(s.en ? region.en : region.zh, ...region.center, textSize, p.ink);
      for (const item of ATLAS_LABELS) {
        if (item.kind === "country") {
          ctx.save();
          ctx.font = `700 ${textSize * 1.25}px "Noto Serif SC", Georgia, "Songti SC", SimSun, serif`;
          ctx.textAlign = "center";
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = p.ink;
          ctx.strokeStyle = p.land;
          ctx.lineWidth = 4;
          ctx.lineJoin = "round";
          ctx.strokeText(s.en ? item.en : item.zh, item.at[0], item.at[1]);
          ctx.fillText(s.en ? item.en : item.zh, item.at[0], item.at[1]);
          ctx.restore();
        } else if (item.kind === "sea") {
          ctx.font = `italic 500 ${textSize * 0.95}px Georgia, "Songti SC", SimSun, serif`;
          ctx.textAlign = "center";
          ctx.fillStyle = p.muted;
          ctx.fillText(s.en ? item.en : item.zh, item.at[0], item.at[1]);
        } else if (item.kind === "route") {
          ctx.font = `500 ${textSize * 0.6}px "Noto Serif SC", Georgia, "Songti SC", SimSun, serif`;
          ctx.textAlign = "center";
          ctx.fillStyle = p.muted;
          ctx.fillText(s.en ? item.en : item.zh, item.at[0], item.at[1]);
        } else {
          label(
            s.en ? item.en : item.zh,
            item.at[0],
            item.at[1],
            textSize * (item.kind === "power" ? 0.8 : 0.68),
            p.muted,
          );
        }
      }
      // Compass rose stays still while the player moves the map.
      ctx.setTransform((dpr * box.width) / W, 0, 0, (dpr * box.height) / H, 0, 0);
      const cx = 2272,
        cy = 150,
        rose = (r: number, rot: number) => {
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const a = rot + (k / 8) * Math.PI * 2;
            const rr = k % 2 ? r * 0.32 : r;
            const px = cx + Math.cos(a) * rr,
              py = cy + Math.sin(a) * rr;
            if (k) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
          }
          ctx.closePath();
        };
      ctx.strokeStyle = p.muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.stroke();
      rose(30, -Math.PI / 2);
      ctx.fillStyle = p.muted;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      rose(15, -Math.PI / 2 + Math.PI / 8);
      ctx.fillStyle = p.land;
      ctx.fill();
      ctx.strokeStyle = p.muted;
      ctx.stroke();
      ctx.fillStyle = p.muted;
      ctx.font = `600 ${textSize * 0.8}px "Noto Serif SC", Georgia, serif`;
      ctx.textAlign = "center";
      ctx.fillText("N", cx, cy - 42);
      // Frame rule: double hairlines with corner fleurons on the sheet's edge.
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(6, 6, W - 12, H - 12);
      ctx.strokeStyle = p.accent;
      ctx.globalAlpha = 0.55;
      ctx.strokeRect(11, 11, W - 22, H - 22);
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.accent;
      ctx.font = `600 14px Georgia, serif`;
      ctx.textAlign = "center";
      for (const [ox, oy] of [
        [6, 6],
        [W - 6, 6],
        [6, H - 6],
        [W - 6, H - 6],
      ] as const)
        ctx.fillText("❦", ox, oy + 5);
    };
    draw.current = paint;
    const observer = new ResizeObserver(paint);
    observer.observe(el);
    paint();
    return () => {
      observer.disconnect();
      draw.current = () => {};
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={
        en
          ? "An original fictional world: the Lion Kingdom heartland of Cangling, Riverbend and Tidemarch, with Dawei to the north and Ramona to the south. Choose a province below to inspect it."
          : "原创虚构世界：狮子国腹地苍岭省、河湾省、潮门省，北邻大卫国，南接拉莫娜国。点击省区或下方省名查看。"
      }
      onClick={
        decorative || !onSelectRegion
          ? undefined
          : (event) => {
              const box = event.currentTarget.getBoundingClientRect();
              const point: AtlasPoint = [
                (((event.clientX - box.left) / box.width) * W - W / 2) / zoom +
                  W / 2 -
                  pan.x,
                (((event.clientY - box.top) / box.height) * H - H / 2) / zoom +
                  H / 2 -
                  pan.y,
              ];
              const hit = ATLAS_REGIONS.find((r) => atlasContains(point, r.boundary));
              if (hit) onSelectRegion(hit.id);
            }
      }
    />
  );
}
