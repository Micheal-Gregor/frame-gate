/**
 * MOD-08 `statistics/` - the module's public surface (OBJ-20, OBJ-21).
 *
 * The two axes over evidence: dispersion (the sample SD, available from three scored members) and
 * location (the mean; it takes NO threshold - S3 OBJ-21 - the comparison with θ is MOD-10's).
 * It computes; it decides, gates and stores nothing. A sample closed by a revision is void here
 * (J3): both answer NoSubject for it (R-65, IR-100).
 */
export { DISPERSION_FLOOR, centre, scoresOf, spread, type ObservationSource } from "./scores.js";
export { Dispersion, type SampleSource } from "./dispersion.js";
export { Location } from "./location.js";
