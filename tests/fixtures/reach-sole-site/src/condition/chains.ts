// R-56: judged as if at src/condition/chains.ts, the exempt FILE. The same read in another member
// of Chains, and in #edges of another class, is still a second check: the exception is one
// declaration, not a file.
import type { RecordHeight } from "../../../../../src/kernel/index.js";
import type { AcceptingCommitment, CommitmentLedger } from "../../../../../src/facts/index.js";
export class Chains {
  readonly #fold: CommitmentLedger;
  constructor(fold: CommitmentLedger) {
    this.#fold = fold;
  }
  others(ks: readonly AcceptingCommitment[], at: RecordHeight): number {
    return ks.filter((k) => !("kind" in this.#fold.effectiveCommitment(k.unit, k.currency, at))).length;
  }
}
export class Other {
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
