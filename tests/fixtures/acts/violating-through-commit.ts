// REF-06: a function that commits through the real CommitmentLedger is an act, and
// one that takes the engine's reason for committing takes a proposal into an act.
import type { Candidate, CommitmentLedger } from "../../../src/facts/index.js";
export function commitBecause(ledger: CommitmentLedger, accepted: Candidate, because: unknown) {
  void because;
  return ledger.commit(accepted, "HUMAN");
}
