// POSITIVE CONTROL: commits in a loop are APPENDS, not reads - commit takes no height, so this
// is no fold over the order (the height discriminator, pinned before battery 15).
import type { Candidate, CommitmentLedger } from "../../../../../src/facts/index.js";
export function acceptAll(ledger: CommitmentLedger, accepted: readonly Candidate[]): void {
  for (const k of accepted) ledger.commit(k, "HUMAN");
}
