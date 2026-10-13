/**
 * MOD-06 `condition/` - the module's public surface (OBJ-07, OBJ-17, OBJ-19, OBJ-27).
 *
 * The identity of the conditions draws are made under, their revisions as appended facts, and the
 * two structures that partition on them: the Sample (per unit, currency and identity, with its
 * closure) and the Chain (paths of inheriting units). MOD-06 computes no statistic, decides no
 * meaning of closure for a consumer (J3), and schedules nothing on a chain.
 *
 * Deliberately NOT exported: any way to mint a PromptRevision except through `revise`, and any
 * stored sample, closure or chain.
 */
export { ConditionIdentities, conditionOf, type ConditionIdentity, type DrawInput, type DrawInputs } from "./condition-identities.js";
export { RevisionLog, type PromptRevision, type RevisionPayload } from "./revision-log.js";
export { Samples, type AcceptanceReads, type CandidateReads, type Closure, type DrawReads, type RevisionReads, type SampleValue } from "./samples.js";
export { Chains, type Chain, type ChainEdge, type ChainLadder, type ChainLineage } from "./chains.js";
