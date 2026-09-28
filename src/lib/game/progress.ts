const KEY = "leo-street-progress-v2";

/**
 * What the player has across runs.
 *
 * Note what is NOT here any more: `paidBroker`, `paidQuant`, `paidLegend`,
 * `legendCashPending`. Those let money buy the broker seat, the quant server
 * and six million in starting cash. The two unlocks that remain are **earned**
 * — there is no code path that grants them for a payment — and everything money
 * does buy lands in `owned`, which only ever holds cosmetics and extra modes.
 */
export interface Progress {
  /** Earned by reaching Ł100M as retail with debt ≤ 10% of assets. */
  brokerUnlocked: boolean;
  /** Earned by reaching Ł10B as a broker. */
  governorUnlocked: boolean;
  /** Purchased storefront items: titles, accents, the sandbox. */
  owned: string[];
  /** The cosmetic title currently displayed, or "" for none. */
  activeTitle: string;
  /** Hex accent for the player's own row. Empty means the default. */
  accent: string;
}

const EMPTY: Progress = {
  brokerUnlocked: false,
  governorUnlocked: false,
  owned: [],
  activeTitle: "",
  accent: "",
};

export function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      brokerUnlocked: Boolean(p.brokerUnlocked),
      governorUnlocked: Boolean(p.governorUnlocked),
      owned: Array.isArray(p.owned) ? p.owned.filter((x): x is string => typeof x === "string") : [],
      activeTitle: typeof p.activeTitle === "string" ? p.activeTitle : "",
      accent: typeof p.accent === "string" ? p.accent : "",
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeProgress(patch: Partial<Progress>): Progress {
  const next = { ...readProgress(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}

export function ownsItem(id: string): boolean {
  return readProgress().owned.includes(id);
}

/** Record a purchase. Idempotent, so a replayed order cannot double-grant. */
export function grantItem(id: string): Progress {
  const cur = readProgress();
  if (cur.owned.includes(id)) return cur;
  return writeProgress({ owned: [...cur.owned, id] });
}
