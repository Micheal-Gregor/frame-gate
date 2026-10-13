/**
 * MOD-09 `calibration/` - the module's public surface (OBJ-22, OBJ-23). DEFERRED: BUILT, not
 * COMPLETE until AE-5 closes (R-69).
 *
 * The two populations the operator's own accept/reject behaviour forms at a declaration level,
 * what each one excluded, and the threshold they imply - or no-bar, with a cause and a discharge.
 * It reads no statistic (MOD-08 is not a dependency: S5, the calibration loop), decides no
 * closure (MOD-06), and stores nothing.
 *
 * Deliberately NOT exported: any way to set, configure or default a threshold, or to mint a
 * Threshold except through `Bar.of`.
 */
export { PopulationPartition, type ClosedSampleReads, type DrawTimeReads, type InvalidationReads, type LevelReads, type Member, type ObservationReads, type PartitionLineage, type Populations } from "./population-partition.js";
export { Bar, type BarValue, type PopulationFigures, type PopulationSource, type Threshold } from "./bar.js";
export { AE5_OPEN, type Separation, type SeparationRule } from "./separation.js";
