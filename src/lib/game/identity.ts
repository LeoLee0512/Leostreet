import { readProgress, writeProgress } from "./progress.ts";
import { STORE_ITEMS, storeItem } from "./storefront.ts";

/**
 * How the player is shown to everyone else: their name, the cosmetic title
 * beside it, and the accent colour of their row.
 *
 * This exists because the storefront was granting titles and colours into
 * `progress.owned` and nothing was rendering them — the player paid and saw
 * absolutely nothing change, which is worse than not selling them at all.
 */
export interface Identity {
  name: string;
  /** The cosmetic title, or "" for none. */
  title: { zh: string; en: string } | null;
  /** Hex accent for the player's own row. */
  accent: string;
}

export const DEFAULT_ACCENT = "#2f6b62";

/** The six colours the accent pack unlocks. The first is free for everyone. */
export const ACCENTS = [
  "#2f6b62",
  "#c45045",
  "#3d5a80",
  "#c98f2b",
  "#6b4a8a",
  "#2a7a55",
];

export function ownedTitles(): { id: string; zh: string; en: string }[] {
  const owned = readProgress().owned;
  return STORE_ITEMS.filter((i) => i.title && owned.includes(i.id)).map((i) => ({
    id: i.id,
    zh: i.title!.zh,
    en: i.title!.en,
  }));
}

export function hasAccentPack(): boolean {
  return readProgress().owned.includes("accent-set");
}

/** Accents this player may pick. Without the pack that is the default only. */
export function availableAccents(): string[] {
  return hasAccentPack() ? ACCENTS : [ACCENTS[0]!];
}

export function identityOf(name: string): Identity {
  const prog = readProgress();
  const item = prog.activeTitle ? storeItem(prog.activeTitle) : undefined;
  const owns = item ? prog.owned.includes(item.id) : false;
  return {
    name,
    // A title the player no longer owns simply does not render.
    title: owns && item?.title ? item.title : null,
    accent: prog.accent && availableAccents().includes(prog.accent) ? prog.accent : DEFAULT_ACCENT,
  };
}

export function setActiveTitle(id: string): void {
  writeProgress({ activeTitle: readProgress().owned.includes(id) ? id : "" });
}

export function setAccent(hex: string): void {
  if (availableAccents().includes(hex)) writeProgress({ accent: hex });
}
