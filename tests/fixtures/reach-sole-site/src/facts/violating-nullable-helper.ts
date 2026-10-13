// WI-13: a read-wrapping helper whose result is boolean OR undefined.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
const committed = (fold: CommitmentLedger, u: Unit, c: Currency, at: RecordHeight): boolean | undefined =>
  isUnknown(fold.effectiveCommitment(u, c, at)) ? undefined : true;
export const all = (below: readonly Currency[], fold: CommitmentLedger, u: Unit, at: RecordHeight) =>
  below.every((p) => committed(fold, u, p, at) === true);
