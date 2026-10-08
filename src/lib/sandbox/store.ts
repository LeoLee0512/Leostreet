import { create } from "zustand";
import { act, createGame, stepWeek } from "./sim.ts";
import type { Action, CountryId, SandboxGame, Txt } from "./types.ts";

export const SANDBOX_KEY = "leo-street-sandbox-v1";
/** Real seconds per game week at each speed. */
export const SPEEDS = [0, 1, 0.5, 0.2] as const;
export type Speed = 0 | 1 | 2 | 3;

interface SandboxStore {
  game: SandboxGame | null;
  speed: Speed;
  toast: { id: number; text: Txt } | null;
  load: () => void;
  start: (country: CountryId, endless?: boolean) => void;
  quit: () => void;
  setSpeed: (s: Speed) => void;
  tick: () => void;
  act: (a: Action) => boolean;
  save: () => void;
  clearToast: () => void;
}

function readSave(): SandboxGame | null {
  try {
    const raw = localStorage.getItem(SANDBOX_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as SandboxGame;
    return g && g.version === 1 && g.countries && g.player ? g : null;
  } catch {
    return null;
  }
}

export const useSandbox = create<SandboxStore>((set, get) => ({
  game: null,
  speed: 0,
  toast: null,
  load: () => set({ game: readSave(), speed: 0 }),
  start: (country, endless = false) => {
    const game = createGame(country, undefined, endless);
    set({ game, speed: 1, toast: null });
    get().save();
  },
  quit: () => {
    try {
      localStorage.removeItem(SANDBOX_KEY);
    } catch {
      /* ignore */
    }
    set({ game: null, speed: 0, toast: null });
  },
  setSpeed: (speed) => set({ speed }),
  tick: () => {
    const g = get().game;
    if (!g || g.over || g.event) return;
    const next = stepWeek(g);
    set({ game: next });
    if (next.event || next.over) set({ speed: 0 });
    if (next.week % 4 === 0 || next.over) get().save();
  },
  act: (a) => {
    const g = get().game;
    if (!g) return false;
    const r = act(g, a);
    if (!r.ok) {
      if (r.msg) set({ toast: { id: Date.now(), text: r.msg } });
      return false;
    }
    set({ game: r.game });
    if (a.type === "choose") get().save();
    return true;
  },
  clearToast: () => set({ toast: null }),
  save: () => {
    const g = get().game;
    if (!g) return;
    try {
      localStorage.setItem(SANDBOX_KEY, JSON.stringify(g));
    } catch {
      /* storage full or unavailable: the run continues unsaved */
    }
  },
}));
