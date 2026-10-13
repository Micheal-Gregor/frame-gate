// DifficultyAdvisory — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// A display value from a unit's features, through an injected rule; read by nothing.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-34 - a contextual class, NOT a Projection (RFD-01): it takes no height (R-83) and joins no
// family, so it cannot be consumed wherever a Projection is. Owner ruling DG-F1: advisory, entering
// no gate, read by nothing; nothing in src imports this module (REF-01a, S-17). The rule is handed
// in (OS-3, R-82); the build ships the plain one.
import { isUnknown, type UnknownValue } from "../kernel/index.js";
import type { Features, Unit } from "../catalog/index.js";

/** OBJ-34's value: what is displayed, and nothing else (DG-F1). */
export interface AdvisoryValue {
  readonly kind: "difficulty-advisory";
  readonly unit: Unit;
  readonly reading: Features;
}

/** The rule that reads a unit's features as a difficulty, handed in (OS-3, R-82). */
export interface DifficultyRule {
  assess(features: Features): Features;
}

/** MOD-03's unit features (SEAM-27: read only here, R-22). */
export interface FeatureSource {
  features(unit: Unit): Features | UnknownValue;
}

export class DifficultyAdvisory {
  readonly #units: FeatureSource;
  readonly #rule: DifficultyRule;

  constructor({ units, rule }: { readonly units: FeatureSource; readonly rule: DifficultyRule }) {
    if (units === undefined || units === null) throw new TypeError("DifficultyAdvisory requires units");
    if (typeof units.features !== "function") throw new TypeError("units must offer features (MOD-03 UnitRegistry, SEAM-27)");
    if (rule === undefined || rule === null) throw new TypeError("DifficultyAdvisory requires rule");
    if (typeof rule.assess !== "function") throw new TypeError("rule must offer assess (R-82)");
    this.#units = units;
    this.#rule = rule;
    Object.freeze(this);
  }

  /** OBJ-34 for a unit: the rule's reading of its features, for display. No height (R-83). */
  advisory(unit: Unit): AdvisoryValue | UnknownValue {
    const features = this.#units.features(unit);
    if (isUnknown(features)) return features;
    return Object.freeze({ kind: "difficulty-advisory", unit, reading: this.#rule.assess(features) });
  }
}
