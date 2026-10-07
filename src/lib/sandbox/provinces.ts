import { WORLD_PROVINCES, type WorldProvince } from "../world/world.ts";
import type { SandboxGame } from "./types.ts";

/**
 * Regional colour on top of the national numbers: each province sits a fixed
 * distance from the national unemployment rate, and that distance widens in a
 * downturn. Deterministic per province, so the map never flickers.
 */
function offsetOf(p: WorldProvince): number {
  if (p.capital) return -0.9;
  let h = (p.id + 1) * 2654435761;
  h = (h ^ (h >>> 13)) >>> 0;
  return ((h % 1000) / 1000) * 3 - 1.5;
}

export function localUnemployment(g: SandboxGame, provinceId: number): number {
  const p = WORLD_PROVINCES[provinceId]!;
  const m = g.countries[p.country];
  return Math.max(0.5, m.u + offsetOf(p) * (1 + Math.abs(Math.min(0, m.gap)) / 3));
}

export function provincesOf(country: string): WorldProvince[] {
  return WORLD_PROVINCES.filter((p) => p.country === country);
}
