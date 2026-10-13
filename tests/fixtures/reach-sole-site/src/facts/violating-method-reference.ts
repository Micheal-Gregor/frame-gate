// WI-13: a reader METHOD handed to Array.every by reference.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export class Checker {
  readonly #fold: CommitmentLedger;
  readonly #u: Unit;
  readonly #at: RecordHeight;
  constructor({ fold, u, at }: { readonly fold: CommitmentLedger; readonly u: Unit; readonly at: RecordHeight }) {
    this.#fold = fold;
    this.#u = u;
    this.#at = at;
  }
  committed(p: Currency): boolean {
    return !isUnknown(this.#fold.effectiveCommitment(this.#u, p, this.#at));
  }
  all(below: readonly Currency[]): boolean {
    return below.every(this.committed, this);
  }
}
