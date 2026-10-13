// A second reachability check, as a classic indexed for loop.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export function reachableByIndex(below: readonly Currency[], fold: CommitmentLedger, u: Unit, at: RecordHeight): boolean {
  for (let i = 0; i < below.length; i += 1) {
    const c = below[i];
    if (c !== undefined && isUnknown(fold.effectiveCommitment(u, c, at))) return false;
  }
  return true;
}
