// R-56: the exception is by DECLARATION. The same class and member as MOD-06's Chains.#edges, in
// another file: still a second check.
import type { RecordHeight } from "../../../../../src/kernel/index.js";
import type { AcceptingCommitment, CommitmentLedger } from "../../../../../src/facts/index.js";
export class Chains {
  readonly #fold: CommitmentLedger;
  constructor(fold: CommitmentLedger) {
    this.#fold = fold;
  }
  #edges(ks: readonly AcceptingCommitment[], at: RecordHeight): number {
    return ks.filter((k) => !("kind" in this.#fold.effectiveCommitment(k.unit, k.currency, at))).length;
  }
  count(ks: readonly AcceptingCommitment[], at: RecordHeight): number {
    return this.#edges(ks, at);
  }
}
