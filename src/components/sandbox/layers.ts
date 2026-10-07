import { PROFILES } from "@/lib/sandbox/countries";
import { localUnemployment } from "@/lib/sandbox/provinces";
import type { CountryId, SandboxGame } from "@/lib/sandbox/types";
import { TINT_SLOTS, WORLD_PROVINCES } from "@/lib/world/world";

export type Layer = "nations" | "inflation" | "unemployment";

type Rgb = [number, number, number];
const BRASS: Rgb = [176, 138, 46];
const GOOD: Rgb = [79, 138, 91];
const WARN: Rgb = [201, 154, 60];
const BAD: Rgb = [178, 56, 43];
const COLD: Rgb = [79, 127, 168];

function paint(fill: (provinceId: number) => [Rgb, number] | null): Uint8Array {
  const out = new Uint8Array(TINT_SLOTS * 4);
  for (const p of WORLD_PROVINCES) {
    const v = fill(p.id);
    if (!v) continue;
    const [[r, g, b], a] = v;
    out.set([r, g, b, Math.round(a * 255)], p.id * 4);
  }
  return out;
}

/** Highlight one country (the picker, or the player's own land). */
export function countryTint(id: CountryId | null, strength = 0.35): Uint8Array | null {
  if (!id) return null;
  return paint((pid) => (WORLD_PROVINCES[pid]!.country === id ? [BRASS, strength] : null));
}

function inflationColour(dev: number): Rgb {
  if (dev < -1) return COLD;
  if (Math.abs(dev) <= 0.75) return GOOD;
  return dev <= 2.5 ? WARN : BAD;
}

function joblessColour(dev: number): Rgb {
  if (dev <= 0.3) return GOOD;
  return dev <= 1.8 ? WARN : BAD;
}

export function layerTint(g: SandboxGame, layer: Layer): Uint8Array | null {
  if (layer === "nations") return countryTint(g.player, 0.28);
  if (layer === "inflation") {
    return paint((pid) => {
      const c = WORLD_PROVINCES[pid]!.country;
      return [inflationColour(g.countries[c].pi - PROFILES[c].piStar), 0.5];
    });
  }
  return paint((pid) => {
    const c = WORLD_PROVINCES[pid]!.country;
    return [joblessColour(localUnemployment(g, pid) - PROFILES[c].uStar), 0.5];
  });
}
