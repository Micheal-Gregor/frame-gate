// R-38: a COMMITMENT-returning reader that closes over the height (so its own call takes none),
// called in a loop - found only through the reader fixed point.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export function reachableHere(below: readonly Currency[], fold: CommitmentLedger, u: Unit, at: RecordHeight): boolean {
  const read = (c: Currency) => fold.effectiveCommitment(u, c, at);
  for (const p of below) if (isUnknown(read(p))) return false;
  return true;
}
