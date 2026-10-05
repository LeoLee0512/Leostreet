/**
 * The governor's profile: who is sitting in the central bank's chair. Kept in
 * localStorage only; it gates "Start game" (first visit builds a profile).
 */
export type Gender = "male" | "female";

export interface Profile {
  name: string;
  playerId: string;
  gender: Gender;
}

export const PROFILE_KEY = "leo-street-profile-v1";
export const DEFAULT_NAME = "LEO";

export function normalizeProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<Record<keyof Profile, unknown>>;
  const name = typeof p.name === "string" ? p.name.trim().slice(0, 16) : "";
  const playerId = typeof p.playerId === "string" ? p.playerId.replace(/[^A-Za-z0-9]/g, "").slice(0, 16) : "";
  if (!playerId) return null;
  return {
    name: name || DEFAULT_NAME,
    playerId,
    gender: p.gender === "female" ? "female" : "male",
  };
}

export function readProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeProfile(profile: Profile): Profile {
  const clean = normalizeProfile(profile)!;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));
  } catch {
    /* storage unavailable: the profile lives for this session only */
  }
  return clean;
}
