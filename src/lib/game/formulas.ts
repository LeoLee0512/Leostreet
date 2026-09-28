export type CalcInput = { op: string; args: Record<string, number | string> };
export type CalcResult = Record<string, number | string | boolean>;

function n(a: Record<string, number | string>, k: string, d = 0): number {
  const v = Number(a[k]);
  return Number.isFinite(v) ? v : d;
}

function ncdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp((-x * x) / 2);
  return 0.5 * (1 + sign * y);
}

export function runFormulas(input: CalcInput): CalcResult {
  const a = input.args ?? {};
  try {
    switch (input.op) {
      case "simple": {
        const fv = n(a, "pv") * (1 + n(a, "rate") * n(a, "years"));
        return { ok: true, value: fv, interest: fv - n(a, "pv") };
      }
      case "compound": {
        const m = Math.max(1, n(a, "m", 1));
        const fv = n(a, "pv") * (1 + n(a, "rate") / m) ** (m * n(a, "years"));
        return { ok: true, value: fv, interest: fv - n(a, "pv") };
      }
      case "rule72":
        return { ok: true, value: 72 / Math.max(0.01, n(a, "rate") * 100) };
      case "npv": {
        const r = n(a, "rate");
        const cfs = String(a.cashflows ?? "0")
          .split(",")
          .map((x) => Number(x.trim()))
          .filter((x) => Number.isFinite(x));
        const total = cfs.reduce((s, cf, i) => s + cf / (1 + r) ** i, 0);
        return { ok: true, value: total, n: cfs.length };
      }
      case "cagr":
        return {
          ok: true,
          value: (n(a, "fv") / Math.max(1e-9, n(a, "pv"))) ** (1 / Math.max(1e-9, n(a, "years"))) - 1,
        };
      case "mortgage": {
        const r = n(a, "rate") / 12;
        const months = Math.max(1, n(a, "months", 360));
        const pmt =
          r <= 0 ? n(a, "pv") / months : (n(a, "pv") * (r * (1 + r) ** months)) / ((1 + r) ** months - 1);
        return { ok: true, value: pmt, total: pmt * months, interest: pmt * months - n(a, "pv") };
      }
      case "duration": {
        const y = n(a, "rate");
        const coupon = n(a, "coupon", y);
        const face = n(a, "face", 100);
        const years = Math.max(1, Math.floor(n(a, "years", 10)));
        let price = 0;
        let mac = 0;
        for (let t = 1; t <= years; t++) {
          const cf = t < years ? coupon * face : coupon * face + face;
          const df = cf / (1 + y) ** t;
          price += df;
          mac += t * df;
        }
        const macaulay = price ? mac / price : 0;
        return { ok: true, value: macaulay, modified: macaulay / (1 + y), price };
      }
      case "capm":
        return { ok: true, value: n(a, "rf") + n(a, "beta") * (n(a, "rm") - n(a, "rf")) };
      case "sharpe":
        return { ok: true, value: (n(a, "rp") - n(a, "rf")) / Math.max(1e-9, n(a, "vol")) };
      case "bs": {
        const s = n(a, "spot");
        const k = n(a, "strike");
        const t = Math.max(1e-8, n(a, "years"));
        const r = n(a, "rate");
        const v = Math.max(1e-8, n(a, "vol"));
        const kind = String(a.kind ?? "call");
        const d1 = (Math.log(s / k) + (r + 0.5 * v * v) * t) / (v * Math.sqrt(t));
        const d2 = d1 - v * Math.sqrt(t);
        if (kind === "put") {
          const px = k * Math.exp(-r * t) * ncdf(-d2) - s * ncdf(-d1);
          return { ok: true, value: px, delta: ncdf(d1) - 1, d1 };
        }
        const px = s * ncdf(d1) - k * Math.exp(-r * t) * ncdf(d2);
        return { ok: true, value: px, delta: ncdf(d1), d1 };
      }
      case "fx":
        return { ok: true, value: n(a, "b") / Math.max(1e-12, n(a, "a")) };
      default:
        return { ok: false, error: "unknown op" };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "calc failed" };
  }
}
