import { runFormulas, type CalcInput, type CalcResult } from "./formulas.ts";

/**
 * Classic formula sheet, computed in-process. There used to be a python3
 * fast-path behind a server function; every deploy target without python3
 * silently fell back to runFormulas anyway, so the JS implementation is now
 * the single source of truth (no spawn cost, no dev/prod drift).
 */
export async function runFinanceCalc({ data }: { data: CalcInput }): Promise<CalcResult> {
  if (!data || typeof data.op !== "string") return { ok: false, error: "bad input" };
  return runFormulas({ op: data.op, args: data.args ?? {} });
}
