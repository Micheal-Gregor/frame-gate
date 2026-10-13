/**
 * MOD-10 - the diagnostic's value types: OBJ-41 DiagnosticAxis and OBJ-42 WithheldReason.
 *
 * An axis is a reading or it is withheld. Withheld is not zero, low or neutral: it names the axis,
 * the upstream answer that withheld it - as itself, never re-worded (SEAM-12, SEAM-13) - and what
 * would supply it.
 */
import type { UnknownValue } from "../kernel/index.js";
import type { BarValue } from "../calibration/index.js";

export type Axis = "dispersion" | "location";

/** MOD-09's answer when there is no bar: θ = ⊥, with its cause, discharge and four figures. */
export type NoBar = Extract<BarValue, { readonly kind: "no-bar" }>;
/** MOD-09's answer when there is a bar: θ, its sample size and four figures. */
export type ThresholdBar = Extract<BarValue, { readonly kind: "bar" }>;

/** OBJ-42: which axis is missing, why, and what would supply it. */
export interface WithheldReason {
  readonly kind: "withheld";
  readonly axis: Axis;
  /** The source's own answer: MOD-08's Unknown, or MOD-09's no-bar. */
  readonly cause: UnknownValue | NoBar;
  readonly discharge: string;
}

/** The dispersion axis when present (R-73): the measured spread and the n behind it. No category. */
export interface DispersionReading {
  readonly kind: "dispersion";
  readonly spread: number;
  readonly n: number;
}

/** The location axis when present (R-74): μ against θ, with the bar whole so θ never travels alone. */
export interface LocationReading {
  readonly kind: "location";
  readonly classification: "meets" | "below";
  readonly centre: number;
  readonly level: string;
  readonly bar: ThresholdBar;
}

/** OBJ-41: one axis slot. */
export type DiagnosticAxis<Reading> = Reading | WithheldReason;
