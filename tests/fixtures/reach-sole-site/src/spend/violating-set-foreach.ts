// DR-32: the fold through a library Set's forEach.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, CurrencyOrder, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export function allCommitted(below: readonly Currency[], fold: CommitmentLedger, u: Unit, at: RecordHeight): boolean {
  let ok = true;
  new Set(below).forEach((p) => {
    if (isUnknown(fold.effectiveCommitment(u, p, at))) ok = false;
  });
  return ok;
}
