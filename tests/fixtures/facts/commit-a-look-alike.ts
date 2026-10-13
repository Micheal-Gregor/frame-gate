// R-41: a commitment accepts a REAL candidate, minted only by CandidateLedger (the mint rule).
// A look-alike carrying every field but the brand does not compile.
import type { CandidatePayload, CommitmentLedger } from "../../../src/facts/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
export const commitALookAlike = (ledger: CommitmentLedger, payload: CandidatePayload, at: RecordHeight) =>
  ledger.commit({ author: "ENGINE", at, payload }, "HUMAN");
