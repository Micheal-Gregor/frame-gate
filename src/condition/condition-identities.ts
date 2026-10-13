// ConditionIdentities — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The identity of a complete draw-input set: its digest, compared exactly.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-07 (R-52). An identity is the digest, through the pinned DigestPort, of a canonical
// encoding of the WHOLE draw-input set the caller gives. Canonical means only that object keys
// are sorted: no component is dropped, trimmed or normalized, so a changed cited reference IS a
// condition change, and a component added later partitions by construction (J2, AE-6).
// Comparison is exact string equality: no tolerance, no near-match.
import type { DigestPort } from "../ports/index.js";
import type { Candidate } from "../facts/index.js";

declare const CONDITION: unique symbol;

/** OBJ-07: the identity of a complete draw-input set (R-52) - a string, so MOD-05 records it as given (R-23). */
export type ConditionIdentity = string & { readonly [CONDITION]: true };

/** One component of a draw's inputs: text, a number, a flag, a list, or a nested record of them. */
export type DrawInput = string | number | boolean | readonly DrawInput[] | { readonly [component: string]: DrawInput };

/** The COMPLETE set of inputs a draw is taken from: the prompt, every cited reference, anything added later. */
export type DrawInputs = { readonly [component: string]: DrawInput };

/**
 * The condition identity a candidate carries (`condition_identity_of`). It needs nothing handed in
 * - MOD-05 records the identity as the string it was given (R-23, R-52) - so it is a function, not
 * an operation of an object that would ignore its inputs (OS-12).
 */
export function conditionOf(candidate: Candidate): ConditionIdentity {
  return candidate.payload.condition as ConditionIdentity;
}

export class ConditionIdentities {
  readonly #digests: DigestPort;

  constructor({ digests }: { readonly digests: DigestPort }) {
    if (digests === undefined || digests === null) throw new TypeError("ConditionIdentities requires digests");
    // OS-1: a declared slot - the one operation called on it is named and checked here.
    if (typeof digests.digest !== "function") throw new TypeError("digests must offer digest (DigestPort, OBJ-39)");
    this.#digests = digests;
    Object.freeze(this);
  }

  /** The identity of `inputs` (R-52). */
  identityOf(inputs: DrawInputs): ConditionIdentity {
    const bytes = new TextEncoder().encode(JSON.stringify(["condition-identity", this.#canonical(inputs)]));
    // The one place a ConditionIdentity is minted from inputs.
    return this.#digests.digest(bytes) as ConditionIdentity;
  }

  /** Exact identity equality - total, no tolerance, no near-match. */
  sameCondition(a: ConditionIdentity, b: ConditionIdentity): boolean {
    return a === b;
  }

  /** Tagged and ordered: a record becomes its sorted entries, a list keeps its order, a leaf stays. */
  #canonical(value: DrawInput): unknown {
    if (Array.isArray(value)) return { list: value.map((v: DrawInput) => this.#canonical(v)) };
    if (typeof value === "object") {
      const record = value as { readonly [component: string]: DrawInput };
      return { record: Object.keys(record).sort().map((k) => [k, this.#canonical(record[k] as DrawInput)]) };
    }
    return value;
  }
}
