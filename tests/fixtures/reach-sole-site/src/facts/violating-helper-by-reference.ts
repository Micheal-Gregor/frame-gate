// DR-32: the read-wrapping helper handed to Array.every by reference.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, CurrencyOrder, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export function reachableHere(order: CurrencyOrder, fold: CommitmentLedger, u: Unit, c: Currency, at: RecordHeight): boolean {
  const below = order.predecessors(c);
  const isCommitted = (p: Currency): boolean => !isUnknown(fold.effectiveCommitment(u, p, at));
  return !isUnknown(below) && below.every(isCommitted);
}
