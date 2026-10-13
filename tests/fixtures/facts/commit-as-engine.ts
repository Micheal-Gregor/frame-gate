// OBJ-31 closed_by HUMAN_ACT: the ENGINE may propose; it may not commit (R-41: commit a candidate).
import type { Candidate, CommitmentLedger } from "../../../src/facts/index.js";
export const engineCommits = (ledger: CommitmentLedger, accepted: Candidate) => ledger.commit(accepted, "ENGINE");
