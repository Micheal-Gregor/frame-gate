// DR-32: the commitment read wrapped in a boolean helper, called from Array.every.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, CurrencyOrder, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
const committed = (fold: CommitmentLedger, u: Unit, c: Currency, at: RecordHeight): boolean => !isUnknown(fold.effectiveCommitment(u, c, at));
export const reachableToo = (order: CurrencyOrder, fold: CommitmentLedger, u: Unit, c: Currency, at: RecordHeight) => {
  const below = order.predecessors(c);
  return !isUnknown(below) && below.every((p) => committed(fold, u, p, at));
};
