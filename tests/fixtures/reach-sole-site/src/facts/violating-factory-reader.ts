// WI-13: a reader made by a FACTORY and handed to Array.every.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
const readerFor = (fold: CommitmentLedger, u: Unit, at: RecordHeight) => (p: Currency): boolean => !isUnknown(fold.effectiveCommitment(u, p, at));
export const all = (below: readonly Currency[], fold: CommitmentLedger, u: Unit, at: RecordHeight) => below.every(readerFor(fold, u, at));
