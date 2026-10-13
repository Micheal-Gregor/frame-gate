// Dispersion — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The spread of one component's scores in a sample: the sample SD, or Undetermined(AE-3) below three (R-63, REF-08).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-20 (a Projection, joined as "Dispersion"): the sample SD of one component's scores in one sample
// (R-63), Undetermined(AE-3) below three scored members (REF-08). A sample closed by a revision is
// void here (J3, R-65): NoSubject. An unknown handed in propagates as itself (SEAM-12).
import { asProjection, isUnknown, noSubject, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { ConditionIdentity, SampleValue } from "../condition/index.js";
import { spread, DISPERSION_FLOOR, scoresOf, type ObservationSource } from "./scores.js";

/** MOD-06's sample, by identity (OBJ-19). */
export interface SampleSource {
  of(unit: Unit, currency: Currency, condition: ConditionIdentity): Projection<SampleValue | UnknownValue>;
}

export class Dispersion {
  readonly #samples: SampleSource;
  readonly #observations: ObservationSource;

  constructor({ samples, observations }: { readonly samples: SampleSource; readonly observations: ObservationSource }) {
    if (samples === undefined || samples === null) throw new TypeError("Dispersion requires samples");
    if (typeof samples.of !== "function") throw new TypeError("samples must offer of (MOD-06 Samples, OBJ-19)");
    if (observations === undefined || observations === null) throw new TypeError("Dispersion requires observations");
    if (typeof observations.observationOf !== "function") throw new TypeError("observations must offer observationOf (MOD-07, OBJ-15)");
    this.#samples = samples;
    this.#observations = observations;
    Object.freeze(this);
  }

  /** OBJ-20 for one component of one sample: a Projection, joined through the kernel as "Dispersion". */
  of(unit: Unit, currency: Currency, condition: ConditionIdentity, component: string): Projection<number | UnknownValue> {
    // R-35: joined through the kernel, by name. Computed per read; nothing is kept.
    return asProjection("Dispersion", (at: RecordHeight) => {
      const scores = this.#scoresOf(unit, currency, condition, component, at);
      return isUnknown(scores) ? scores : spread(scores);
    });
  }

  /** The scored members' scores for `component`, or why there are none to read (J3: void after a revision). */
  #scoresOf(unit: Unit, currency: Currency, condition: ConditionIdentity, component: string, at: RecordHeight) {
    const sample = this.#samples.of(unit, currency, condition).compute(at);
    if (isUnknown(sample)) return sample;
    if (sample.closure.kind === "closed-by-revision") return noSubject();
    return scoresOf(sample.members, component, this.#observations, at);
  }

  /** Whether the floor is met - a test, not a value, so a caller need not provoke the unknown to ask. */
  available(unit: Unit, currency: Currency, condition: ConditionIdentity, component: string, at: RecordHeight): boolean {
    const scores = this.#scoresOf(unit, currency, condition, component, at);
    return !isUnknown(scores) && scores.length >= DISPERSION_FLOOR;
  }
}
