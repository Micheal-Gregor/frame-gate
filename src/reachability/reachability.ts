// Reachability — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The fold: reachable(u, c) as of a height iff every strictly cheaper currency has a
// commitment; one evaluation with its witness set (OBJ-24; MOD-04).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// THE CONCEPT, as one condition over one order (F2 OBJ-24):
//     reachable(u, c)  <=>  for all c' < c : effective_commitment(u, c') IS a commitment
// "IS a commitment", not "is not BOTTOM" (IR-42): R-20's uncomputable leaves c' unmet too, so
// reachability refuses rather than guesses. At the least currency the predecessor set is empty
// and the fold is vacuously reachable - the identity of the fold, never a branch on WHICH
// currency it is. It carries no threshold, no count, and no notion of "how much cheaper".
// It is a Projection (R-35): it joins the family through the kernel, and stores nothing.
import { asProjection, isUnknown, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { Commitment } from "../facts/index.js";

/** One strictly cheaper currency, and what the fold answered for it. */
export interface Witness {
  readonly currency: Currency;
  readonly answer: Commitment | UnknownValue;
}

/** The verdict with its evidence, from ONE evaluation (R-34; S1 PC-5). */
export type ReachabilityEvaluation =
  | {
      readonly verdict: "reachable";
      readonly unit: Unit;
      readonly currency: Currency;
      readonly at: RecordHeight;
      readonly witnesses: readonly Witness[];
    }
  | {
      readonly verdict: "unreachable";
      readonly unit: Unit;
      readonly currency: Currency;
      readonly at: RecordHeight;
      readonly witnesses: readonly Witness[];
      /** The cheapest currency whose answer is not a commitment: what the refusal names. */
      readonly cheapestUnmet: Currency;
    }
  | UnknownValue;

/** MOD-03's order (SEAM-01, S-13): what lies strictly below a currency, cheapest first. */
export interface PredecessorOrder {
  predecessors(currency: Currency): readonly Currency[] | UnknownValue;
}
/** MOD-05's fold (SEAM-02, R-18): injected, never imported. */
export interface CommitmentFold {
  effectiveCommitment(unit: Unit, currency: Currency, at: RecordHeight): Commitment | UnknownValue;
}

export class Reachability {
  readonly #currencies: PredecessorOrder;
  readonly #commitments: CommitmentFold;

  constructor({ currencies, commitments }: { readonly currencies: PredecessorOrder; readonly commitments: CommitmentFold }) {
    if (currencies === undefined || currencies === null) throw new TypeError("Reachability requires currencies");
    // OS-1: each object input is a declared slot - the operation called on it is checked here.
    if (typeof currencies.predecessors !== "function") throw new TypeError("currencies must offer predecessors (SEAM-01, MOD-03)");
    if (commitments === undefined || commitments === null) throw new TypeError("Reachability requires commitments");
    if (typeof commitments.effectiveCommitment !== "function") {
      throw new TypeError("commitments must offer effectiveCommitment (SEAM-02, MOD-05)");
    }
    this.#currencies = currencies;
    this.#commitments = commitments;
    Object.freeze(this);
  }

  /** Reachability of `unit` in `currency`, as a Projection: computed at a height, stored nowhere. */
  of(unit: Unit, currency: Currency): Projection<ReachabilityEvaluation> {
    // R-35: joined through the kernel, by name. Computed per read; nothing is kept.
    return asProjection("Reachability", (at: RecordHeight) => this.#fold(unit, currency, at));
  }

  /**
   * The fold. Every strictly cheaper currency, cheapest first, with the fold's answer for it;
   * reachable when NONE of those answers is anything but a commitment. An empty predecessor set
   * finds nothing unmet - the least currency is reachable by the identity of the fold.
   */
  #fold(unit: Unit, currency: Currency, at: RecordHeight): ReachabilityEvaluation {
    const below = this.#currencies.predecessors(currency);
    if (isUnknown(below)) return below; // a currency outside the order is not "unreachable"
    const witnesses = Object.freeze(
      below.map((c) => Object.freeze({ currency: c, answer: this.#commitments.effectiveCommitment(unit, c, at) })),
    );
    const unmet = witnesses.find((w) => isUnknown(w.answer));
    return unmet === undefined
      ? Object.freeze({ verdict: "reachable", unit, currency, at, witnesses })
      : Object.freeze({ verdict: "unreachable", unit, currency, at, witnesses, cheapestUnmet: unmet.currency });
  }
}
