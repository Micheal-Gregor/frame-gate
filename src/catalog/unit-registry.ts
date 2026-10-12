// UnitRegistry — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Unit identities and their read-only features (OBJ-06, MOD-03).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// A Unit holds NO classification of its own: classification is an appended,
// human-authored Declaration read as of a height (OBJ-13), so "what this unit is"
// always has an author and a moment. Its features are read by MOD-13 (advisory)
// only, and nothing flows back (S-17).
import { noSubject, type UnknownValue } from "../kernel/index.js";

declare const UNIT: unique symbol;

/** OBJ-06 — the identity of the thing a draw is made for. */
export type Unit = string & { readonly [UNIT]: true };

/** Read-only unit features. Consumed by MOD-13 advisory; written by nothing here. */
export type Features = Readonly<Record<string, string | number | boolean>>;

export class UnitRegistry {
  readonly #units: ReadonlyMap<string, Features>;

  constructor({ units }: { readonly units: Readonly<Record<string, Features>> }) {
    if (units === undefined || units === null) throw new TypeError("UnitRegistry requires units");
    this.#units = new Map(Object.entries(units).map(([id, f]) => [id, Object.freeze({ ...f })]));
    Object.freeze(this);
  }

  /** The Unit with this identity, or NoSubject when no such unit was loaded. */
  unit(id: string): Unit | UnknownValue {
    return this.#units.has(id) ? (id as Unit) : noSubject();
  }

  /** A unit's features, read-only. */
  features(unit: Unit): Features | UnknownValue {
    const features = this.#units.get(unit);
    return features === undefined ? noSubject() : features;
  }
}
