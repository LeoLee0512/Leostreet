export function makeRng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One draw off a seeded stream, as a pure value: the number in [0,1) plus the
 * advanced state. Lets code outside the tick loop (a player order, a raise)
 * stay on the run's own stream instead of reaching for `Math.random()`.
 */
export function seededDraw(rngState: number, seed = 1): { value: number; next: number } {
  const base = rngState || seed || 1;
  return {
    value: makeRng(base)(),
    next: (Math.imul(base, 1664525) + 1013904223) >>> 0,
  };
}

export function randn(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function ncdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp((-x * x) / 2);
  return 0.5 * (1 + sign * y);
}

export function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  kind: "call" | "put",
): number {
  const t = Math.max(T, 1 / 365);
  // One clamped sigma for BOTH the diffusion term and the drift term — using the
  // raw sigma in `sigma^2/2` while the denominator used the floor made low-vol
  // names price inconsistently (and `greeks()` already did it this way).
  const sig = Math.max(sigma, 0.05);
  const spot = Math.max(S, 1e-6);
  const strike = Math.max(K, 1e-6);
  const vol = sig * Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (r + (sig * sig) / 2) * t) / vol;
  const d2 = d1 - vol;
  if (kind === "call") return Math.max(0, spot * ncdf(d1) - strike * Math.exp(-r * t) * ncdf(d2));
  return Math.max(0, strike * Math.exp(-r * t) * ncdf(-d2) - spot * ncdf(-d1));
}

export function greeks(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  kind: "call" | "put",
): { delta: number; theta: number } {
  const t = Math.max(T, 1 / 365);
  const sig = Math.max(sigma, 0.05);
  const S_ = Math.max(S, 1e-6);
  const K_ = Math.max(K, 1e-6);
  const vol = sig * Math.sqrt(t);
  const d1 = (Math.log(S_ / K_) + (r + (sig * sig) / 2) * t) / vol;
  const d2 = d1 - vol;
  const nd1 = Math.exp((-d1 * d1) / 2) / Math.sqrt(2 * Math.PI);
  const delta = kind === "call" ? ncdf(d1) : ncdf(d1) - 1;
  const discount = Math.exp(-r * t);
  const thetaYear =
    kind === "call"
      ? (-(S_ * nd1 * sig) / (2 * Math.sqrt(t)) - r * K_ * discount * ncdf(d2))
      : (-(S_ * nd1 * sig) / (2 * Math.sqrt(t)) + r * K_ * discount * ncdf(-d2));
  return { delta, theta: thetaYear / 365 };
}

export function realizedVol(history: number[]): number {
  if (history.length < 8) return 0;
  const rets: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1]!;
    const b = history[i]!;
    if (a > 0) rets.push(Math.log(b / a));
  }
  if (rets.length < 2) return 0;
  const mean = rets.reduce((x, y) => x + y, 0) / rets.length;
  const v = rets.reduce((x, y) => x + (y - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(Math.max(0, v) * 252 * 7);
}

export function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function randomPlayerId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const buf = new Uint32Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(buf);
  else for (let i = 0; i < 12; i++) buf[i] = Math.floor(Math.random() * 0xffffffff);
  for (let i = 0; i < 12; i++) out += chars[buf[i]! % chars.length];
  return out;
}

export function sanitizePlayerId(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
}

export function sanitizeName(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.length === 0 ? "LEO" : trimmed.slice(0, 16);
}
