// The desktop trial has no hosted database. Preserve the existing local-board fallback.
export type BoardRow = { playerId: string; name: string; nav: number };
export async function submitScore(_input: unknown): Promise<{ ok: boolean }> {
  return { ok: false };
}
export async function getBoard(_input?: unknown): Promise<{ ok: boolean; rows: BoardRow[] }> {
  return { ok: false, rows: [] };
}
