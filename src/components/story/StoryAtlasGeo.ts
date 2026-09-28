import type { SectorId } from "@/lib/story/economy";
import type { AtlasPoint } from "@/lib/story/atlas";
import { ATLAS_SHEET } from "@/lib/story/atlas";

/** Shared sandbox geometry: camera tilt and province relief heights. */
export const ATLAS_TILT = (42 * Math.PI) / 180;
export const ATLAS_HEIGHTS: Record<SectorId, number> = {
  materials: 10,
  industry: 8,
  transport: 6,
};
export const ATLAS_LAND_HEIGHT = 4;
export const ATLAS_RIVER_HEIGHT = 13.5;
export const ATLAS_RAIL_HEIGHT = 14;

/** Surveyed towns; each pins its province for the atlas overlays. */
export const ATLAS_CITIES: { point: AtlasPoint; region: SectorId }[] = [
  { point: [682, 706], region: "materials" },
  { point: [842, 879], region: "industry" },
  { point: [1218, 931], region: "transport" },
];

/**
 * Detail-layer settlements across the wider world. `ground` is the relief
 * height the block cluster stands on; `size` scales the cluster.
 */
export interface AtlasSettlement {
  point: AtlasPoint;
  ground: number;
  size: "town" | "city" | "metro";
  /** Factory chimneys rise beside the cluster (mill towns). */
  mills?: boolean;
}
export const ATLAS_SETTLEMENTS: AtlasSettlement[] = [
  { point: [682, 706], ground: ATLAS_HEIGHTS.materials, size: "town" },
  { point: [842, 879], ground: ATLAS_HEIGHTS.industry, size: "metro", mills: true },
  { point: [1218, 931], ground: ATLAS_HEIGHTS.transport, size: "metro" },
  { point: [800, 320], ground: ATLAS_LAND_HEIGHT, size: "city" },
  { point: [380, 820], ground: ATLAS_LAND_HEIGHT, size: "town" },
  { point: [660, 1130], ground: ATLAS_LAND_HEIGHT, size: "town" },
  { point: [1560, 330], ground: ATLAS_LAND_HEIGHT, size: "city", mills: true },
  { point: [1860, 240], ground: ATLAS_LAND_HEIGHT, size: "town" },
  { point: [2090, 545], ground: ATLAS_LAND_HEIGHT, size: "city" },
  { point: [960, 1470], ground: ATLAS_LAND_HEIGHT, size: "town" },
  { point: [1300, 1460], ground: ATLAS_LAND_HEIGHT, size: "city" },
  { point: [1830, 1440], ground: ATLAS_LAND_HEIGHT, size: "town" },
];

/** Harbours: a pier running seaward from `point`, plus moored hulls. */
export const ATLAS_PORTS: { point: AtlasPoint; angle: number }[] = [
  { point: [1292, 955], angle: 0.15 }, // Tidemarch home port
  { point: [1243, 866], angle: -0.2 }, // Tidemarch north quay
  { point: [2060, 575], angle: Math.PI / 2 }, // Baigang, Dawei
  { point: [940, 1428], angle: -Math.PI / 2 }, // Chengtan, Ramona
  { point: [1850, 1368], angle: -Math.PI / 2 }, // Nuanfan, Ramona
];

/** Monuments: an obelisk on the Panbei plateau, a strait lighthouse. */
export const ATLAS_MONUMENTS: {
  kind: "obelisk" | "lighthouse";
  point: AtlasPoint;
  ground: number;
}[] = [
  { kind: "obelisk", point: [742, 268], ground: ATLAS_LAND_HEIGHT },
  { kind: "lighthouse", point: [1352, 700], ground: ATLAS_LAND_HEIGHT - 1 },
];

/** The brass exchange tower of Tidemarch, tallest structure on the sheet. */
export const ATLAS_BRASS_TOWER: { point: AtlasPoint; ground: number } = {
  point: [1180, 900],
  ground: ATLAS_HEIGHTS.transport,
};

/** Pixels per atlas unit for the fitted orthographic view. */
export function atlasFit(width: number, height: number, zoom: number) {
  return Math.min(width / ATLAS_SHEET.w, height / ATLAS_SHEET.h) * zoom;
}

/**
 * Orthographic projection of an atlas point (data coords, height h) to viewport
 * pixels. Must mirror the CameraRig transform in StoryAtlasScene exactly.
 */
export function atlasProject(
  size: { w: number; h: number },
  zoom: number,
  pan: { x: number; y: number },
  x: number,
  y: number,
  h = 0,
) {
  const fit = atlasFit(size.w, size.h, zoom);
  const s = Math.sin(ATLAS_TILT);
  const c = Math.cos(ATLAS_TILT);
  return {
    left: size.w / 2 + (x - ATLAS_SHEET.cx + pan.x) * fit,
    top: size.h / 2 + ((y - ATLAS_SHEET.cy + pan.y) * s - h * c) * fit,
  };
}
