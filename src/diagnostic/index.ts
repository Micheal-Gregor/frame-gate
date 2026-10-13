/**
 * MOD-10 `diagnostic/` - the module's public surface (OBJ-25, OBJ-41, OBJ-42).
 *
 * The product of two independently available classifiers over a unit's latest sample: the
 * dispersion axis (MOD-08's spread, R-73) and the location axis (MOD-08's centre against MOD-09's
 * θ, R-74). An axis it cannot carry is withheld, naming the axis, the upstream answer and what
 * would supply it. It proposes and never closes a gate: no act accepts a diagnostic (REF-06,
 * SEAM-14). It owns no statistic, no threshold and no renderer.
 *
 * Deliberately NOT exported: any way to mint a DiagnosticValue except through `Diagnostic.of`.
 */
export { Diagnostic, type AxisSource, type BarSource, type DeclarationSource, type DiagnosticValue, type SampleListing } from "./diagnostic.js";
export type { Axis, DiagnosticAxis, DispersionReading, LocationReading, NoBar, ThresholdBar, WithheldReason } from "./axes.js";
