/**
 * MOD-04 `reachability/` - the module's public surface (OBJ-24, OBJ-29). THE CONCEPT.
 *
 * One condition over one currency order: a draw is refused unless every cheaper currency
 * already carries a commitment for that unit. OBJ-24 Reachability answers the question as a
 * Projection; OBJ-29 ReachabilityGate acts on the answer, and is the only place it is acted on.
 *
 * Deliberately NOT exported: any per-currency branch, any second or "fast path" evaluation,
 * any stored or cached verdict, and any way to ask without a record height.
 */
export {
  Reachability,
  type CommitmentFold,
  type PredecessorOrder,
  type ReachabilityEvaluation,
  type Witness,
} from "./reachability.js";
export { REACHABILITY_GATE, ReachabilityGate, type ReachabilityProjections } from "./reachability-gate.js";
