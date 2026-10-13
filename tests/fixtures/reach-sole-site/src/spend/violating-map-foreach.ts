// R-38: the fold through a library Map's forEach.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export function allCommitted(byName: ReadonlyMap<string, Currency>, fold: CommitmentLedger, u: Unit, at: RecordHeight): boolean {
  let ok = true;
  byName.forEach((p) => {
    if (isUnknown(fold.effectiveCommitment(u, p, at))) ok = false;
  });
  return ok;
}
