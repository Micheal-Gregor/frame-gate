/**
 * MOD-07 `observation/` - the module's public surface (OBJ-08, OBJ-09, OBJ-15).
 *
 * What was observed about a candidate: a vector over a configured component list, each component
 * a Score or ABSENT with its own author. ABSENT is a non-value: no expression combines it with a
 * value (HOOK-02, at parse), and it is never coerced, defaulted or zeroed. MOD-07 owns no scoring
 * algorithm, no statistic, no threshold and no population.
 *
 * Deliberately NOT exported: any way to mint an Observation except through `observe`, or a Score
 * except through `score`.
 */
export {
  authorOf,
  component,
  dischargeable,
  dischargeCondition,
  isAbsent,
  isAllAbsent,
  score,
  scoredComponents,
  undischargeable,
  type Absent,
  type ComponentValue,
  type Discharge,
  type Score,
} from "./values.js";
export { ObservationLedger, type ComponentEntry, type Observation, type ObservationPayload, type ObservedComponent } from "./observation-ledger.js";
