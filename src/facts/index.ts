/**
 * MOD-05 `facts/` - the module's public surface (OBJ-11, OBJ-12, OBJ-16, OBJ-31).
 *
 * The append-only fact substrate the gate guards: the commitments that make further
 * draws reachable (slice 1), the context of each draw (slice 2), and the candidates
 * drawn (slice 3), and the record-only lineage between them (R-41). Every cross-module
 * decider is handed in at construction (R-18).
 *
 * Deliberately NOT exported: a "current commitment" or "current declaration" read, any
 * way to build a Commitment, DrawContext, ResolutionLabel or Candidate except through its
 * ledger, any second candidate append path (S-01),
 * and any stored effective commitment or resolution.
 */
export {
  COMMIT_GATE,
  CommitmentLedger,
  type Commitment,
  type CommitmentPayload,
  type FactRecord,
  type InvalidationReader,
} from "./commitment-ledger.js";
export { LineageReader, type AcceptingCommitment, type DerivedCandidate, type LineageCandidate } from "./lineage-reader.js";
export {
  DrawContextLog,
  type DeclarationReader,
  type DrawScopeGate,
  type DrawContext,
  type DrawContextPayload,
  type Resolution,
  type ResolutionLabel,
  type ResolutionLabelPayload,
} from "./draw-context-log.js";
export {
  BOTTOM,
  CandidateLedger,
  type AdmissionDecider,
  type Bottom,
  type Candidate,
  type CandidateLedgerInputs,
  type CandidatePayload,
  type CandidateProposal,
  type CommitmentFold,
  type CurrencyCount,
  type CurrencyLadder,
  type IndependenceReader,
  type ScopeCeiling,
  type SignatureCheck,
} from "./candidate-ledger.js";
