// LIMIT (R-15, R-38): a read-wrapping helper whose result is neither a boolean nor a
// commitment (here a string verdict) is not followed by the helper fixed point.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, CurrencyOrder, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
const verdictOf = (fold: CommitmentLedger, u: Unit, c: Currency, at: RecordHeight): string => (isUnknown(fold.effectiveCommitment(u, c, at)) ? "unmet" : "met");
export const allMet = (below: readonly Currency[], fold: CommitmentLedger, u: Unit, at: RecordHeight) =>
  below.every((p) => verdictOf(fold, u, p, at) === "met");
