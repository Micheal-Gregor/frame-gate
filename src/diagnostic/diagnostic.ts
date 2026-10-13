// Diagnostic — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The two-axis diagnostic of a unit's latest sample for one component: each axis a reading or withheld with its reason.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-25 (a Projection, joined as "Diagnostic"). The product of two independently available
// classifiers over a unit's LATEST sample at a currency, for one component (R-72):
//   dispersion - MOD-08's sample SD with the n of scored members behind it; no category (R-73);
//   location   - MOD-08's centre against MOD-09's θ at the level in force (R-74, R-75): "meets"
//                when μ ≥ θ, "below" otherwise, carrying the bar whole. θ = ⊥ withholds it (SEAM-13).
// Each axis is decided on its own evidence. An ABSENCE (NoSubject, Undetermined) withholds that
// axis alone, with the source's own answer as the cause; any other Unknown is a broken read and
// is the diagnostic's answer. The withheld entries are part of the value (PC-07). It proposes and
// closes nothing: no act accepts a DiagnosticValue (REF-06, R-76).
import { asProjection, assertNever, isUnknown, noSubject, succeeds, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Declaration, Unit } from "../catalog/index.js";
import type { ConditionIdentity, SampleValue } from "../condition/index.js";
import { scoresOf, type ObservationSource } from "../statistics/index.js";
import type { BarValue } from "../calibration/index.js";
import type { Axis, DiagnosticAxis, DispersionReading, LocationReading, WithheldReason } from "./axes.js";

declare const DIAGNOSED: unique symbol;

/**
 * OBJ-25's value: the two axes and the withheld entries, as one value (PC-07). Nominal: only
 * `Diagnostic.of` mints one, and no act accepts one (REF-06, R-76).
 */
export type DiagnosticValue = {
  readonly unit: Unit;
  readonly currency: Currency;
  readonly component: string;
  /** The sample read (R-72). */
  readonly condition: ConditionIdentity;
  readonly dispersion: DiagnosticAxis<DispersionReading>;
  readonly location: DiagnosticAxis<LocationReading>;
  /** One per withheld axis, none when both are present. */
  readonly withheld: readonly WithheldReason[];
} & { readonly [DIAGNOSED]: true };

/** MOD-06's samples of a (unit, currency) (OBJ-19). */
export interface SampleListing {
  samplesFor(unit: Unit, currency: Currency, at: RecordHeight): readonly SampleValue[] | UnknownValue;
}
/** One of MOD-08's axes over a sample (OBJ-20, OBJ-21). */
export interface AxisSource {
  of(unit: Unit, currency: Currency, condition: ConditionIdentity, component: string): Projection<number | UnknownValue>;
}
/** MOD-09's bar (OBJ-22). */
export interface BarSource {
  of(level: string, component: string): Projection<BarValue | UnknownValue>;
}
/** MOD-03's declaration in force at a height (R-75). */
export interface DeclarationSource {
  declarationAt(unit: Unit, at: RecordHeight): Declaration | UnknownValue;
}

export class Diagnostic {
  readonly #samples: SampleListing;
  readonly #dispersion: AxisSource;
  readonly #location: AxisSource;
  readonly #observations: ObservationSource;
  readonly #bar: BarSource;
  readonly #declarations: DeclarationSource;

  constructor({
    samples,
    dispersion,
    location,
    observations,
    bar,
    declarations,
  }: {
    readonly samples: SampleListing;
    readonly dispersion: AxisSource;
    readonly location: AxisSource;
    readonly observations: ObservationSource;
    readonly bar: BarSource;
    readonly declarations: DeclarationSource;
  }) {
    // OS-1: every object input is a declared slot - the operation called on it is named and checked here.
    const slot = (name: string, value: object | undefined | null, operation: string): void => {
      if (value === undefined || value === null) throw new TypeError(`Diagnostic requires ${name}`);
      if (typeof (value as Readonly<Record<string, unknown>>)[operation] !== "function") throw new TypeError(`${name} must offer ${operation}`);
    };
    slot("samples", samples, "samplesFor");
    slot("dispersion", dispersion, "of");
    slot("location", location, "of");
    slot("observations", observations, "observationOf");
    slot("bar", bar, "of");
    slot("declarations", declarations, "declarationAt");
    this.#samples = samples;
    this.#dispersion = dispersion;
    this.#location = location;
    this.#observations = observations;
    this.#bar = bar;
    this.#declarations = declarations;
    Object.freeze(this);
  }

  /** OBJ-25 for a unit's latest sample at a currency, for one component (R-72): a Projection. */
  of(unit: Unit, currency: Currency, component: string): Projection<DiagnosticValue | UnknownValue> {
    // R-35: joined through the kernel, by name. Computed per read; nothing is kept (PC-04).
    return asProjection("Diagnostic", (at: RecordHeight) => this.#diagnose(unit, currency, component, at));
  }

  #diagnose(unit: Unit, currency: Currency, component: string, at: RecordHeight): DiagnosticValue | UnknownValue {
    const samples = this.#samples.samplesFor(unit, currency, at);
    if (isUnknown(samples)) return samples;
    const sample = this.#latest(samples);
    if (sample === undefined) return noSubject(); // nothing drawn at (unit, currency): nothing to diagnose
    const dispersion = this.#dispersionAxis(unit, currency, sample, component, at);
    if (isUnknown(dispersion)) return dispersion;
    const location = this.#locationAxis(unit, currency, sample.condition, component, at);
    if (isUnknown(location)) return location;
    const withheld = [dispersion, location].filter((axis): axis is WithheldReason => axis.kind === "withheld");
    return Object.freeze({ unit, currency, component, condition: sample.condition, dispersion, location, withheld: Object.freeze(withheld) }) as DiagnosticValue;
  }

  /** R-72: the sample holding the unit's most recent candidate at this currency. */
  #latest(samples: readonly SampleValue[]): SampleValue | undefined {
    let latest: { readonly sample: SampleValue; readonly at: RecordHeight } | undefined;
    for (const sample of samples) {
      const last = sample.members.at(-1);
      if (last !== undefined && (latest === undefined || succeeds(last.at, latest.at))) latest = { sample, at: last.at };
    }
    return latest?.sample;
  }

  /** R-73: MOD-08's spread and the n of scored members behind it - or withheld with MOD-08's own answer. */
  #dispersionAxis(unit: Unit, currency: Currency, sample: SampleValue, component: string, at: RecordHeight): DiagnosticAxis<DispersionReading> | UnknownValue {
    const spread = this.#dispersion.of(unit, currency, sample.condition, component).compute(at);
    if (isUnknown(spread)) return this.#withhold("dispersion", spread, "three members scored for this component, in a sample no revision has closed");
    const scores = scoresOf(sample.members, component, this.#observations, at);
    if (isUnknown(scores)) return scores;
    return Object.freeze({ kind: "dispersion", spread, n: scores.length });
  }

  /** R-74, R-75: μ against θ at the level in force. θ = ⊥ withholds the axis with the bar's own answer (SEAM-13). */
  #locationAxis(unit: Unit, currency: Currency, condition: ConditionIdentity, component: string, at: RecordHeight): DiagnosticAxis<LocationReading> | UnknownValue {
    const declaration = this.#declarations.declarationAt(unit, at);
    if (isUnknown(declaration)) return this.#withhold("location", declaration, "a declaration of this unit's level");
    const level = declaration.payload.level;
    const bar = this.#bar.of(level, component).compute(at);
    if (isUnknown(bar)) return this.#withhold("location", bar, "a bar this level's record can be read for");
    if (bar.kind === "no-bar") return Object.freeze({ kind: "withheld", axis: "location", cause: bar, discharge: bar.discharge });
    const centre = this.#location.of(unit, currency, condition, component).compute(at);
    if (isUnknown(centre)) return this.#withhold("location", centre, "a member scored for this component, in a sample no revision has closed");
    return Object.freeze({ kind: "location", classification: centre >= bar.theta ? "meets" : "below", centre, level, bar });
  }

  /** An ABSENCE withholds the axis, its cause the source's own answer; any other member is a broken read, and the answer. */
  #withhold(axis: Axis, cause: UnknownValue, discharge: string): WithheldReason | UnknownValue {
    switch (cause.kind) {
      case "no-subject":
      case "undetermined":
        return Object.freeze({ kind: "withheld", axis, cause, discharge });
      case "refuse":
      case "uncomputable":
      case "latent":
        return cause;
      default:
        return assertNever(cause);
    }
  }
}
