// A second reachability check: a fold of commitment reads over the predecessors, outside MOD-04.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, CurrencyOrder, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export const reachableToo = (order: CurrencyOrder, fold: CommitmentLedger, u: Unit, c: Currency, at: RecordHeight) => {
  const below = order.predecessors(c);
  return !isUnknown(below) && below.every((p) => !isUnknown(fold.effectiveCommitment(u, p, at)));
};
