// DR-32: the fold through Array.from(iterable, mapFn) - a library Array method.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, CurrencyOrder, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export const answers = (below: readonly Currency[], fold: CommitmentLedger, u: Unit, at: RecordHeight) =>
  Array.from(below, (p) => fold.effectiveCommitment(u, p, at));
