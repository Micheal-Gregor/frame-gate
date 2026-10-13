/**
 * MOD-11 `spend/` - the module's public surface (OBJ-14, OBJ-26, OBJ-30, OBJ-33, OBJ-40).
 *
 * What stands between a permitted spend and an unbounded one. A Scope is a bounded permission
 * appended before the draws it governs and spent by dispatch (R-78). The ScopeGate counts draws
 * against it, and the stop condition exists only where θ does (REF-15). The per-unit draw vector
 * is in front of the human whenever a scope is authorized (HOOK-09, R-81). The ratio is displayed
 * and never blocks; nothing here decides whether to spend.
 *
 * Deliberately NOT exported: any way to edit a Scope (REF-17), any scalar of the ratio (REF-18),
 * any way to mint a Scope or a form except through their owners, and the scope recognizer.
 */
export { ScopeLedger, type LevelSource, type Scope, type ScopePayload, type StopCondition, type StopRequest, type ThresholdSource } from "./scope-ledger.js";
export { ScopeReader, type ScopeRecord } from "./scope-reader.js";
export { SCOPE_GATE, ScopeGate, type DrawCharges, type ScopeReads } from "./scope-gate.js";
export { Ratio, type CandidateCounts, type RatioValue } from "./ratio.js";
export { AuthorizationForms, type AuthorizationForm, type RatioSource } from "./authorization.js";
