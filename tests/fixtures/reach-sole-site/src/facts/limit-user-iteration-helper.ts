// LIMIT (R-15, R-39): a reader called from a USER-written iteration helper - the iteration is
// not a library method, so it is not seen.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
function each<T>(xs: readonly T[], f: (x: T) => void): void {
  for (const x of xs) f(x);
}
export function allCommitted(below: readonly Currency[], fold: CommitmentLedger, u: Unit, at: RecordHeight): boolean {
  let ok = true;
  each(below, (p) => {
    if (isUnknown(fold.effectiveCommitment(u, p, at))) ok = false;
  });
  return ok;
}
