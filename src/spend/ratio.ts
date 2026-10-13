// Ratio — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The per-unit draw count vector over the currency order, computed per read; never a quotient.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-26 (a Projection, joined as "Ratio"). The per-unit candidate count indexed by the currency
// order: a vector in every representation, its arity the currency set (zeros included). Never a
// quotient, a sum or an average - ⟨1,4⟩ and ⟨4,16⟩ are different facts (REF-18). Displayed at every
// authorization (HOOK-09); it closes no gate and enters no gate condition (DG-F4).
import { asProjection, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Unit } from "../catalog/index.js";
import type { CurrencyCount } from "../facts/index.js";

/** OBJ-26's value: one count per currency of the order, zeros included. A vector, never one number (REF-18). */
export interface RatioValue {
  readonly unit: Unit;
  readonly counts: readonly CurrencyCount[];
}

/** MOD-05's candidate counts per currency (SEAM-22). */
export interface CandidateCounts {
  countsAsOf(unit: Unit, at: RecordHeight): readonly CurrencyCount[];
}

export class Ratio {
  readonly #candidates: CandidateCounts;

  constructor({ candidates }: { readonly candidates: CandidateCounts }) {
    if (candidates === undefined || candidates === null) throw new TypeError("Ratio requires candidates");
    if (typeof candidates.countsAsOf !== "function") throw new TypeError("candidates must offer countsAsOf (MOD-05, SEAM-22)");
    this.#candidates = candidates;
    Object.freeze(this);
  }

  /** OBJ-26 for a unit: a Projection. */
  of(unit: Unit): Projection<RatioValue | UnknownValue> {
    // R-35: joined through the kernel, by name. Computed per read; nothing is kept (PC-04).
    return asProjection("Ratio", (at: RecordHeight) => Object.freeze({ unit, counts: this.#candidates.countsAsOf(unit, at) }));
  }
}
