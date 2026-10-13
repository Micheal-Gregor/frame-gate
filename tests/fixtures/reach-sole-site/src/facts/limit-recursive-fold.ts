// LIMIT (R-15): the fold written as RECURSION over the predecessor list - no loop and no array
// callback - is not seen as a second reachability check.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, CurrencyOrder, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export function allCommitted(fold: CommitmentLedger, u: Unit, cs: readonly Currency[], at: RecordHeight): boolean {
  const [first, ...rest] = cs;
  return first === undefined || (!isUnknown(fold.effectiveCommitment(u, first, at)) && allCommitted(fold, u, rest, at));
}
