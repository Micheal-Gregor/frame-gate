/**
 * MOD-09 - the separation rule: AE-5, OPEN, NO_DEFAULT (R-69).
 *
 * What makes the two populations "separated" - and the population floor inside that - is the
 * owner's ruling at AE-5, and it is not made here. Bar takes the rule as an INJECTED decider
 * (OS-3). The only rule shipped is the honest stand-in, which separates nothing, so MOD-09 is
 * BUILT and not COMPLETE: VEC-02 row 4 cannot be computed until AE-5 closes.
 */
import type { Score } from "../observation/index.js";

/** A rule's answer: a boundary, or no bar with its cause and what would discharge it. */
export type Separation =
  | { readonly kind: "separated"; readonly theta: number }
  | { readonly kind: "no-bar"; readonly cause: string; readonly discharge: string };

/** AE-5's decider, handed to Bar (OS-3). It is consulted only when both populations are non-empty (REF-11). */
export interface SeparationRule {
  separate(accepted: readonly Score[], passedOver: readonly Score[]): Separation;
}

/** R-69: the open stand-in. AE-5 is open, so it separates no pair of populations. */
export const AE5_OPEN: SeparationRule = Object.freeze({
  separate: (): Separation => Object.freeze({ kind: "no-bar", cause: "AE-5 open", discharge: "the owner rules the separation rule" } as const),
});
