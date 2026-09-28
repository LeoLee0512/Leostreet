/**
 * The first tests over the game's own money. Everything here is a regression
 * guard for a bug that shipped: the suite exists because `npm test` used to be
 * 55 green scaffold tests and zero lines of coverage over the simulation, which
 * is exactly why settlement bugs survived in it.
 *
 * Runs on plain Node (`--experimental-strip-types`), so nothing in this file may
 * reach for a `@/` alias, the DOM, or `localStorage`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyTick, buyStockInternal, closeOptionInternal, closeStockInternal, createInitial, shortStockInternal, tradeOption, trySellStock } from "./sim.ts";
import { countryCcy, dayOf, netWorth, optionMark, slippage, takeLiquidity, toLeo } from "./economy.ts";
import { blackScholes, greeks, seededDraw } from "./math.ts";
import type { GameState } from "./types.ts";

/** A deterministic run: fixed seed, every board account open, hour 15 (Leo + David both trading). */
function fresh(patch: Partial<GameState> = {}): GameState {
  const s = createInitial("TEST", "retail", "TEST00000001", "male", "leo");
  s.seed = 123456789;
  s.rngState = 123456789;
  s.tick = 15;
  s.accounts = { leo: true, david: true, ramona: true, anna: true };
  s.cashDvd = 5_000_000;
  s.cashAna = 5_000_000;
  return Object.assign(s, patch);
}

const LEO_TICKER = "GOLD";
const DVD_TICKER = "DAIX";

describe("black-scholes", () => {
  it("uses one clamped sigma for both the drift and the diffusion term", () => {
    // Below the 0.05 floor every sigma must price identically. The old code
    // floored the denominator but fed the RAW sigma into `sigma^2/2`, so two
    // quotes that should have been the same drifted apart.
    const a = blackScholes(100, 100, 0.25, 0.04, 0.001, "call");
    const b = blackScholes(100, 100, 0.25, 0.04, 0.05, "call");
    assert.equal(a, b);
  });

  it("agrees with greeks() on the same inputs", () => {
    // greeks() always clamped correctly; the two used to disagree at low vol.
    const S = 90;
    const K = 100;
    const T = 0.5;
    const r = 0.04;
    const sigma = 0.01;
    const up = blackScholes(S + 0.01, K, T, r, sigma, "call");
    const dn = blackScholes(S - 0.01, K, T, r, sigma, "call");
    const numericDelta = (up - dn) / 0.02;
    assert.ok(Math.abs(numericDelta - greeks(S, K, T, r, sigma, "call").delta) < 0.02);
  });

  it("respects put-call parity", () => {
    const S = 120;
    const K = 100;
    const T = 0.75;
    const r = 0.05;
    const call = blackScholes(S, K, T, r, 0.3, "call");
    const put = blackScholes(S, K, T, r, 0.3, "put");
    assert.ok(Math.abs(call - put - (S - K * Math.exp(-r * T))) < 0.6);
  });

  it("never returns NaN for a degenerate spot or strike", () => {
    for (const [S, K] of [[0, 100], [100, 0], [0, 0]] as const) {
      assert.ok(Number.isFinite(blackScholes(S, K, 0.25, 0.04, 0.3, "call")));
      assert.ok(Number.isFinite(blackScholes(S, K, 0.25, 0.04, 0.3, "put")));
    }
  });
});

describe("short collateral", () => {
  it("returns a foreign short's margin to the wallet it came from", () => {
    const s = fresh();
    const leoBefore = s.cash;
    const dvdBefore = s.cashDvd;

    assert.equal(shortStockInternal(s, DVD_TICKER, 10), null);
    assert.equal(closeStockInternal(s, DVD_TICKER), null);

    // The margin was debited in David coin. Refunding it as Leo used to hand
    // the player free Leo AND leave the David wallet permanently short.
    assert.equal(s.cash, leoBefore, "a David short must not touch the Leo wallet");
    const drift = Math.abs(s.cashDvd - dvdBefore);
    assert.ok(drift < dvdBefore * 0.001, `David wallet should round-trip, drifted ${drift}`);
  });

  it("books the margin in local coin, not Leo", () => {
    const s = fresh();
    assert.equal(shortStockInternal(s, DVD_TICKER, 10), null);
    const pos = s.positions.find((p) => p.ticker === DVD_TICKER)!;
    const spot = s.stocks[DVD_TICKER]!.price;
    // Half the notional, in David coin — not the ~1/75th of it that a Leo
    // figure would be.
    assert.ok(Math.abs((pos.shortMargin ?? 0) - spot * 10 * 0.5) < spot * 10 * 0.01);
  });

  it("carries the collateral's FX exposure into net worth", () => {
    const s = fresh();
    shortStockInternal(s, DVD_TICKER, 10);
    const before = netWorth(s);
    s.fxDvdPerLeo = (s.fxDvdPerLeo ?? 75) * 2; // David coin halves against Leo
    assert.ok(netWorth(s) < before, "a foreign short's collateral must revalue with FX");
  });

  it("round-trips a domestic short with only the spread lost", () => {
    const s = fresh();
    const before = netWorth(s);
    shortStockInternal(s, LEO_TICKER, 50);
    closeStockInternal(s, LEO_TICKER);
    const cost = before - netWorth(s);
    assert.ok(cost > 0, "crossing the spread twice must cost something");
    assert.ok(cost < before * 0.01, `round-trip should only cost the spread, lost ${cost}`);
  });
});

describe("written-option collateral", () => {
  it("refunds exactly what was posted, not a slice of today's spot", () => {
    const s = fresh();
    const expiry = dayOf(s.tick) + 30;
    const strike = Math.round(s.stocks[LEO_TICKER]!.price);
    assert.equal(tradeOption(s, LEO_TICKER, "call", strike, expiry, -1), null);

    const o = s.options[0]!;
    const posted = o.posted ?? 0;
    assert.ok(posted > 0, "writing must record the collateral it posted");

    // The underlying doubles. Under the old rule the refund doubled with it,
    // minting money out of a position that had just gone badly wrong.
    s.stocks[LEO_TICKER]!.price *= 2;
    const buyback = optionMark(s, o) * (1 + slippage(s)) * 100;
    const cashBefore = s.cash;
    assert.equal(closeOptionInternal(s, o.id), null);

    assert.ok(
      Math.abs(s.cash - cashBefore - (posted - buyback)) < 1e-6,
      "close must be exactly (posted collateral − buyback)",
    );
  });

  it("posts collateral equal to what leaves the wallet", () => {
    const s = fresh();
    const cashBefore = s.cash;
    const expiry = dayOf(s.tick) + 30;
    const strike = Math.round(s.stocks[LEO_TICKER]!.price * 1.1);
    tradeOption(s, LEO_TICKER, "call", strike, expiry, -2);

    const o = s.options[0]!;
    const premium = o.premium * 100 * 2;
    // cash = start − posted + premium
    assert.ok(Math.abs(s.cash - (cashBefore - (o.posted ?? 0) + premium)) < 1e-6);
  });

  it("releases the same collateral at expiry however far the spot moved", () => {
    // Two runs of one worthless expiry, identical except that the underlying
    // doubles in the second. The option finishes out of the money either way,
    // so the ONLY cash the settlement moves is the refund — which must be the
    // collateral that was posted, not a fresh slice of whatever spot is today.
    const settleWorthless = (spotMultiple: number) => {
      const s = fresh();
      const strike = Math.round(s.stocks[LEO_TICKER]!.price * 4);
      tradeOption(s, LEO_TICKER, "call", strike, dayOf(s.tick) + 1, -1);
      const posted = s.options[0]!.posted ?? 0;

      s.stocks[LEO_TICKER]!.price *= spotMultiple; // still far out of the money
      const cashBefore = s.cash;
      const after = applyTick({ ...s, tick: 39 }); // -> day 2, hour 16: expiry
      assert.equal(after.options.length, 0, "the option must have expired");
      return { refund: after.cash - cashBefore, posted };
    };

    const flat = settleWorthless(1);
    const doubled = settleWorthless(2);
    assert.ok(Math.abs(flat.refund - flat.posted) < 1e-6, "refund must equal the posted collateral");
    assert.ok(
      Math.abs(doubled.refund - flat.refund) < 1e-6,
      "a spot that doubled must not double the collateral handed back",
    );
  });
});

describe("stock round-trips", () => {
  it("conserves net worth on an unlevered buy and sell", () => {
    const s = fresh();
    const before = netWorth(s);
    assert.equal(buyStockInternal(s, LEO_TICKER, 100, 1), null);
    assert.ok(Math.abs(netWorth(s) - before) < before * 0.01);
    assert.equal(closeStockInternal(s, LEO_TICKER), null);
    const cost = before - netWorth(s);
    assert.ok(cost > 0 && cost < before * 0.01, `only the spread should be lost, lost ${cost}`);
  });

  it("leaves net worth flat when opening a levered position", () => {
    const s = fresh();
    const before = netWorth(s);
    assert.equal(buyStockInternal(s, LEO_TICKER, 100, 3), null);
    const pos = s.positions.find((p) => p.ticker === LEO_TICKER)!;
    assert.ok(pos.borrowed > 0, "leverage must record a margin loan");
    assert.ok(Math.abs(netWorth(s) - before) < before * 0.01, "borrowing is not income");
  });

  it("repays the margin loan pro-rata on a partial sell", () => {
    const s = fresh();
    buyStockInternal(s, LEO_TICKER, 100, 3);
    const borrowed = s.positions.find((p) => p.ticker === LEO_TICKER)!.borrowed;
    assert.equal(trySellStock(s, LEO_TICKER, 40), null);
    const after = s.positions.find((p) => p.ticker === LEO_TICKER)!;
    assert.equal(after.shares, 60);
    assert.ok(Math.abs(after.borrowed - borrowed * 0.6) < 1e-6);
  });

  it("values a foreign holding through the exchange rate", () => {
    const s = fresh();
    buyStockInternal(s, DVD_TICKER, 10, 1);
    const before = netWorth(s);
    s.fxDvdPerLeo = (s.fxDvdPerLeo ?? 75) * 2;
    assert.ok(netWorth(s) < before, "David coin halving must mark the holding down");
  });

  it("refuses a board that is closed and a country with no account", () => {
    const closed = fresh({ tick: 3 }); // 03:00 — nothing is trading
    assert.equal(buyStockInternal(closed, LEO_TICKER, 1, 1), "err.closed");

    const noAcct = fresh();
    noAcct.accounts = { leo: true, david: false, ramona: false, anna: false };
    assert.equal(buyStockInternal(noAcct, DVD_TICKER, 1, 1), "err.noAccount");
  });
});

describe("liquidity sweep", () => {
  it("drains cash first, then deposits, and reports what it actually took", () => {
    const s = fresh({ cash: 100, simpleDeposit: 50, simpleAccrued: 5, compoundDeposit: 20 });
    assert.equal(takeLiquidity(s, 130), 130);
    assert.equal(s.cash, 0);
    assert.equal(s.simpleDeposit, 20);
    assert.equal(s.simpleAccrued, 5);
    assert.equal(s.compoundDeposit, 20);
  });

  it("returns the shortfall-adjusted amount when the player is dry", () => {
    const s = fresh({ cash: 10, simpleDeposit: 0, simpleAccrued: 0, compoundDeposit: 5 });
    assert.equal(takeLiquidity(s, 100), 15);
    assert.equal(s.cash, 0);
    assert.equal(s.compoundDeposit, 0);
  });
});

describe("determinism", () => {
  it("seededDraw is pure", () => {
    const a = seededDraw(42, 1);
    const b = seededDraw(42, 1);
    assert.deepEqual(a, b);
    assert.notEqual(a.next, 42);
  });

  it("replays a hundred ticks identically from the same seed", () => {
    const run = () => {
      let s = fresh();
      for (let i = 0; i < 100; i++) s = applyTick(s);
      return s;
    };
    const a = run();
    const b = run();
    assert.equal(a.rngState, b.rngState);
    assert.deepEqual(
      Object.keys(a.stocks).map((k) => a.stocks[k]!.price),
      Object.keys(b.stocks).map((k) => b.stocks[k]!.price),
    );
    assert.equal(a.cash, b.cash);
    assert.equal(a.fedRate, b.fedRate);
  });

  it("diverges from a different seed", () => {
    const run = (seed: number) => {
      let s = fresh({ seed, rngState: seed });
      for (let i = 0; i < 100; i++) s = applyTick(s);
      return s.stocks[LEO_TICKER]!.price;
    };
    assert.notEqual(run(1), run(2));
  });
});

describe("currency conversion", () => {
  it("round-trips through Leo", () => {
    const s = fresh();
    for (const ccy of ["leo", "dvd", "ana"] as const) {
      const leoValue = toLeo(1000, ccy, s);
      assert.ok(Number.isFinite(leoValue) && leoValue > 0);
    }
    assert.equal(toLeo(1000, "leo", s), 1000);
    assert.ok(toLeo(1000, "dvd", s) < 1000, "David coin is worth less than a Leo");
  });

  it("maps each listing to its home coin", () => {
    const s = fresh();
    assert.equal(countryCcy(s.stocks[LEO_TICKER]!.country), "leo");
    assert.equal(countryCcy(s.stocks[DVD_TICKER]!.country), "dvd");
  });
});
