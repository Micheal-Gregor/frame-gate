// POSITIVE CONTROL: a caller narrowed through mayDecide commits the candidate it accepts.
import { mayDecide, type Author } from "../../../src/ports/index.js";
import type { Candidate, CommitmentLedger } from "../../../src/facts/index.js";
export function humanCommits(ledger: CommitmentLedger, accepted: Candidate, author: Author) {
  return mayDecide(author) ? ledger.commit(accepted, author) : null;
}
