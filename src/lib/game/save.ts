import { SAVE_KEY, SAVE_VERSION } from "./catalog.ts";
import type { GameState } from "./types.ts";

export function serialize(s: GameState): string {
  const { openPanel: _p, lastToast: _t, ...rest } = s;
  return JSON.stringify({ ...rest, openPanel: null, lastToast: null, version: SAVE_VERSION });
}

export function writeSave(s: GameState) {
  try {
    const raw = serialize(s);
    // Keep the previous good save as `.bak` BEFORE overwriting, so a write that
    // lands mid-quota-error cannot take the run with it.
    const prev = localStorage.getItem(SAVE_KEY);
    if (prev) localStorage.setItem(`${SAVE_KEY}.bak`, prev);
    localStorage.setItem(SAVE_KEY, raw);
  } catch {
    /* private mode / quota */
  }
}

function parseSave(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || parsed.started !== true) return null;
    return { ...parsed, openPanel: null, lastToast: null, speed: 0, version: SAVE_VERSION };
  } catch {
    return null;
  }
}

/**
 * Load the run, falling back to the previous write if the current one is
 * unreadable. The backup was being written on every save and never read, so a
 * single truncated write meant the run was gone.
 */
export function readSave(): GameState | null {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY)) ?? parseSave(localStorage.getItem(`${SAVE_KEY}.bak`));
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    // The backup has to go too, or `readSave` resurrects the run we just wiped.
    localStorage.removeItem(`${SAVE_KEY}.bak`);
  } catch {
    /* ignore */
  }
}

export function hasSave(): boolean {
  try {
    return Boolean(localStorage.getItem(SAVE_KEY));
  } catch {
    return false;
  }
}
