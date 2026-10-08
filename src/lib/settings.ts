import { create } from "zustand";

/**
 * Player-wide settings. `beginner` (新手模式, on by default) shortens text to
 * one plain line, hides advanced indicators behind "more", and shows an
 * advisor's suggestion; experts switch it off.
 */
export const SETTINGS_KEY = "leo-street-settings-v1";

interface Settings {
  beginner: boolean;
}

const DEFAULTS: Settings = { beginner: true };

function read(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    const v = JSON.parse(raw) as Partial<Settings>;
    return { beginner: typeof v.beginner === "boolean" ? v.beginner : DEFAULTS.beginner };
  } catch {
    return DEFAULTS;
  }
}

export const useSettings = create<Settings & { boot: () => void; setBeginner: (on: boolean) => void }>((set, get) => ({
  ...DEFAULTS,
  boot: () => set(read()),
  setBeginner: (beginner) => {
    set({ beginner });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...read(), beginner: get().beginner }));
    } catch {
      /* storage unavailable: the choice lasts this session */
    }
  },
}));
