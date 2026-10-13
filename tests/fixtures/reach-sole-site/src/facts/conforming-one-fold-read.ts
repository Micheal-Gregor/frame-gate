// POSITIVE CONTROL: ONE commitment read outside an iteration (as MOD-05's `from` check) is no fold.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, CurrencyOrder, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export const immediatelyBelow = (order: CurrencyOrder, fold: CommitmentLedger, u: Unit, c: Currency, at: RecordHeight) => {
  const below = order.predecessors(c);
  const immediate = isUnknown(below) ? undefined : below.at(-1);
  return immediate === undefined ? undefined : fold.effectiveCommitment(u, immediate, at);
};
