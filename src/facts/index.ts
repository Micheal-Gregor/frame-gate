/**
 * MOD-05 `facts/` - the module's public surface (OBJ-11, OBJ-12, OBJ-16, OBJ-31).
 *
 * The append-only fact substrate the gate guards: the commitments that make further
 * draws reachable (slice 1), the context of each draw (slice 2), and the candidates
 * drawn (slice 3). Every cross-module decider is handed in at construction (R-18).
 *
 * Deliberately NOT exported: a "current commitment" or "current declaration" read, any
 * way to build a Commitment, DrawContext or ResolutionLabel except through its ledger,
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
export {
  DrawContextLog,
  type DeclarationReader,
  type DrawContext,
  type DrawContextPayload,
  type Resolution,
  type ResolutionLabel,
  type ResolutionLabelPayload,
} from "./draw-context-log.js";
