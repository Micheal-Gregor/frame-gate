// Bar — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The threshold the two populations imply at a level, or no-bar with its cause and discharge; both exclusion counts on every return.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-22 (a Projection, joined as "Bar"). Its codomain includes no-bar (AE-01): a bar is observed
// or it does not exist. The POPULATION branch is taken first - either population empty is no-bar
// with its cause, and the separation rule is never consulted (REF-11). Only with both populated is
// the injected rule asked (AE-5, R-69); its no-bar is the answer as given. A Threshold is minted
// here and nowhere else (HOOK-03), with the sample size behind it. Every return carries the four
// population figures (HOOK-08): one exit, `#answer`, attaches them, and the type requires them.
// No threshold goes in: not as an argument, a constructor key, a default or a fallback (REF-12).
import { asProjection, isUnknown, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Populations } from "./population-partition.js";
import type { Separation, SeparationRule } from "./separation.js";

declare const THRESHOLD: unique symbol;

/** θ: a number only the bar mints (HOOK-03). A literal, configured or defaulted number does not type-check as one. */
export type Threshold = number & { readonly [THRESHOLD]: true };

/** The four population figures. Every return carries all of them (HOOK-08). */
export interface PopulationFigures {
  readonly acceptedCount: number;
  readonly passedOverCount: number;
  readonly excludedAccepted: number;
  readonly excludedPassedOver: number;
}

/** OBJ-22's codomain: θ with its sample size, or no-bar. A value, never null (AE-01, ADR-001). */
export type BarValue =
  | (PopulationFigures & { readonly kind: "bar"; readonly theta: Threshold; readonly sampleSize: number })
  | (PopulationFigures & { readonly kind: "no-bar"; readonly cause: string; readonly discharge: string });

/** OBJ-23, as Bar reads it. */
export interface PopulationSource {
  of(level: string, component: string): Projection<Populations | UnknownValue>;
}

export class Bar {
  readonly #populations: PopulationSource;
  readonly #separation: SeparationRule;

  constructor({ populations, separation }: { readonly populations: PopulationSource; readonly separation: SeparationRule }) {
    if (populations === undefined || populations === null) throw new TypeError("Bar requires populations");
    if (typeof populations.of !== "function") throw new TypeError("populations must offer of (MOD-09 PopulationPartition, OBJ-23)");
    if (separation === undefined || separation === null) throw new TypeError("Bar requires separation");
    if (typeof separation.separate !== "function") throw new TypeError("separation must offer separate (AE-5's rule, R-69)");
    this.#populations = populations;
    this.#separation = separation;
    Object.freeze(this);
  }

  /** OBJ-22 at one level, for one component: a Projection. No threshold goes in; one may come out. */
  of(level: string, component: string): Projection<BarValue | UnknownValue> {
    // R-35: joined through the kernel, by name. Computed per read; nothing is kept (PC-04).
    return asProjection("Bar", (at: RecordHeight) => {
      const populations = this.#populations.of(level, component).compute(at);
      if (isUnknown(populations)) return populations;
      const { accepted, passedOver } = populations;
      // REF-11: the population branch, before the separation operator is consulted. The cause
      // names the empty side; the discharge says what would fill it.
      if (accepted[0] === undefined && passedOver[0] === undefined) {
        return this.#answer(populations, { kind: "no-bar", cause: "both-empty", discharge: "a scored commitment and a scored passed-over member of a closed sample, at this level" });
      }
      if (accepted[0] === undefined) return this.#answer(populations, { kind: "no-bar", cause: "accepted-empty", discharge: "a commitment at this level on a candidate scored for this component" });
      if (passedOver[0] === undefined) return this.#answer(populations, { kind: "no-bar", cause: "passed-over-empty", discharge: "a closed sample at this level with a scored member no commitment accepted" });
      // AE-5, OPEN behind this interface (R-69): the injected rule decides; nothing here does.
      return this.#answer(populations, this.#separation.separate(accepted.map((m) => m.score), passedOver.map((m) => m.score)));
    });
  }

  /** HOOK-08 @before-bar-return: the one exit. Both exclusion counts ride on a threshold and on no-bar alike. */
  #answer(populations: Populations, verdict: Separation): BarValue {
    const figures: PopulationFigures = {
      acceptedCount: populations.accepted.length,
      passedOverCount: populations.passedOver.length,
      excludedAccepted: populations.excludedAccepted,
      excludedPassedOver: populations.excludedPassedOver,
    };
    if (verdict.kind === "no-bar") return Object.freeze({ kind: "no-bar", cause: verdict.cause, discharge: verdict.discharge, ...figures });
    // HOOK-03: the one place a Threshold is minted - from the rule's answer over these populations.
    return Object.freeze({ kind: "bar", theta: verdict.theta as Threshold, sampleSize: figures.acceptedCount + figures.passedOverCount, ...figures });
  }
}
