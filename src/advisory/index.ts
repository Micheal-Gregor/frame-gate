/**
 * MOD-13 `advisory/` - the module's public surface (OBJ-34).
 *
 * A difficulty advisory over a unit's features: computed, displayed, and read by nothing (DG-F1).
 * It is NOT a member of the Projection family (RFD-01): it takes no height and joins nothing.
 * Nothing in src imports this module, so no gate condition, proposal, act or declaration can name
 * a difficulty (REF-01a, S-17). It reaches MOD-03's features and nothing else.
 */
export { DifficultyAdvisory, type AdvisoryValue, type DifficultyRule, type FeatureSource } from "./difficulty-advisory.js";
export { PLAIN_DIFFICULTY } from "./plain-rule.js";
