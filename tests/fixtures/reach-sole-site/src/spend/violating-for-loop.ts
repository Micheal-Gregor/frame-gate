// A second reachability check, written as a loop - the same fold in another module.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, CurrencyOrder, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export function reachableHere(order: CurrencyOrder, fold: CommitmentLedger, u: Unit, c: Currency, at: RecordHeight): boolean {
  const below = order.predecessors(c);
  if (isUnknown(below)) return false;
  for (const p of below) if (isUnknown(fold.effectiveCommitment(u, p, at))) return false;
  return true;
}
