// POSITIVE CONTROL: the fold, in MOD-04 - the one place it is allowed.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, CurrencyOrder, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export const reachable = (order: CurrencyOrder, fold: CommitmentLedger, u: Unit, c: Currency, at: RecordHeight) => {
  const below = order.predecessors(c);
  return !isUnknown(below) && below.every((p) => !isUnknown(fold.effectiveCommitment(u, p, at)));
};
