// Location — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The centre of one component's scores in a sample: the mean; it takes no threshold (S3 OBJ-21, R-63).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-21 (a Projection, joined as "Location"): the mean of one component's scores in one sample (R-63).
// It takes NO threshold (S3 OBJ-21): the comparison with an observed θ is MOD-10's. It needs no
// floor - it is the independently available axis - and is void for a revised sample (J3, IR-100).
import { asProjection, isUnknown, noSubject, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { ConditionIdentity, SampleValue } from "../condition/index.js";
import { centre, scoresOf, type ObservationSource } from "./scores.js";

/** MOD-06's sample, by identity (OBJ-19). */
export interface SampleSource {
  of(unit: Unit, currency: Currency, condition: ConditionIdentity): Projection<SampleValue | UnknownValue>;
}

export class Location {
  readonly #samples: SampleSource;
  readonly #observations: ObservationSource;

  constructor({ samples, observations }: { readonly samples: SampleSource; readonly observations: ObservationSource }) {
    if (samples === undefined || samples === null) throw new TypeError("Location requires samples");
    if (typeof samples.of !== "function") throw new TypeError("samples must offer of (MOD-06 Samples, OBJ-19)");
    if (observations === undefined || observations === null) throw new TypeError("Location requires observations");
    if (typeof observations.observationOf !== "function") throw new TypeError("observations must offer observationOf (MOD-07, OBJ-15)");
    this.#samples = samples;
    this.#observations = observations;
    Object.freeze(this);
  }

  /** OBJ-21 for one component of one sample: a Projection, joined through the kernel as "Location". */
  of(unit: Unit, currency: Currency, condition: ConditionIdentity, component: string): Projection<number | UnknownValue> {
    // R-35: joined through the kernel, by name. Computed per read; nothing is kept.
    return asProjection("Location", (at: RecordHeight) => {
      const scores = this.#scoresOf(unit, currency, condition, component, at);
      return isUnknown(scores) ? scores : centre(scores);
    });
  }

  /** The scored members' scores for `component`, or why there are none to read (J3: void after a revision). */
  #scoresOf(unit: Unit, currency: Currency, condition: ConditionIdentity, component: string, at: RecordHeight) {
    const sample = this.#samples.of(unit, currency, condition).compute(at);
    if (isUnknown(sample)) return sample;
    if (sample.closure.kind === "closed-by-revision") return noSubject();
    return scoresOf(sample.members, component, this.#observations, at);
  }
}
