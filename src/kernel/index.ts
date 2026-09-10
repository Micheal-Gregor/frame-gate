/**
 * MOD-01 `kernel/` - the three abstract bases, the closed unknown family, and
 * the height every fold is parameterised by. OBJ-01, OBJ-02, OBJ-03, OBJ-04,
 * OBJ-10.
 *
 * Nothing here computes a domain result, and nothing here imports anything -
 * including `ports/`. That is what makes it the base: the module every other
 * module depends on depends on none, so no cycle can form through it and the
 * parse-level rules it declares cannot be circumvented from downstream.
 *
 * Because it imports nothing, the bases are PARAMETERISED over the types they
 * carry rather than naming them (IR-17, following IR-09's precedent at MOD-02):
 * an author is OBJ-38 in `ports/`, a condition belongs to the gate's own module.
 * A base that named them would be reaching downstream for a type and taking a
 * dependency the design forbids.
 */

/* ─── OBJ-10 RecordHeight ───────────────────────────────────────────────────
 * A prefix of the append-only record: the record as it stood after some number
 * of appends. The sole parameter that makes a Projection reproducible and the
 * sole legitimate cache key.
 *
 * Branded, so an ordinary number cannot drift into a position that means "as of
 * this much of the record". No arithmetic is exposed: `h1 + h2` is meaningless
 * and `h2 - h1` invites a "distance" that no rule here defines. Ordering is the
 * entire contract.
 */
declare const HEIGHT: unique symbol;
export type RecordHeight = number & { readonly [HEIGHT]: true };

export function height(n: number): RecordHeight {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`RecordHeight must be a non-negative integer, got ${n}`);
  }
  return n as RecordHeight;
}

export function compare(a: RecordHeight, b: RecordHeight): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * True iff `newer` is strictly later than `older`. Equal heights do not succeed
 * one another: a fold at height h is the same fold at height h, and treating
 * that as progress is how a stale derivation passes for a current one.
 */
export function succeeds(newer: RecordHeight, older: RecordHeight): boolean {
  return compare(newer, older) === 1;
}

/* ─── OBJ-04 Unknown - closed at five ───────────────────────────────────────
 * Five different facts. A refusal, an unresolved subject, an unreachable
 * answer, an open ambiguity and a withheld verdict do not substitute for one
 * another, and each unfaithful rendering - one member as another, any member as
 * null, any member as a boolean - is a separate defect with a separate test.
 *
 * The closure is load-bearing: a proposed sixth member is a signal that
 * something is being expressed which the upstream model does not contain, and
 * the response is to raise it upstream as an admitted exception, not to widen
 * the family here.
 *
 * OBJ-09 `Absent` (MOD-07) is NOT a member and must not be added. It is an
 * in-band non-value inside a vector of values, with its own discharge
 * condition. Rendering one as the other is a defect of the same class as
 * collapsing two members.
 */
export type UnknownValue =
  | { readonly kind: "refuse"; readonly guard: string }
  | { readonly kind: "no-subject" }
  | { readonly kind: "uncomputable"; readonly boundary: string }
  | { readonly kind: "undetermined"; readonly ae: string }
  | { readonly kind: "latent" };

export const refuse = (guard: string): UnknownValue => ({ kind: "refuse", guard });
export const noSubject = (): UnknownValue => ({ kind: "no-subject" });
export const uncomputable = (boundary: string): UnknownValue => ({ kind: "uncomputable", boundary });
export const undetermined = (ae: string): UnknownValue => ({ kind: "undetermined", ae });
export const latent = (): UnknownValue => ({ kind: "latent" });

const UNKNOWN_KINDS = new Set([
  "refuse", "no-subject", "uncomputable", "undetermined", "latent",
]);

/**
 * Answers WHETHER a value is a member - never WHICH. Discriminating the member
 * is the caller's business and must be done by exhaustive `switch` on `kind`
 * with `assertNever` in the default, so that adding a member breaks every site
 * that must handle it. A helper that answered "which" would let a caller branch
 * on some members and silently fall through on the rest.
 *
 * No total conversion to boolean or to null is offered, in either direction.
 */
export function isUnknown(v: unknown): v is UnknownValue {
  return (
    typeof v === "object" &&
    v !== null &&
    "kind" in v &&
    typeof (v as { kind: unknown }).kind === "string" &&
    UNKNOWN_KINDS.has((v as { kind: string }).kind)
  );
}

/** Exhaustiveness. A missed member is a compile error at every switch. */
export function assertNever(x: never): never {
  throw new Error(`unhandled member: ${JSON.stringify(x)}`);
}

/* ─── OBJ-02 Projection - the family is a LIST, not a property ──────────────
 * THE SELF-RELIANCE POINT OF THIS BUILD.
 *
 * The family is proven by one named S1 contract, RC-3 `AsOfFold`, whose stated
 * membership is MOD-04/07/09/10/11/16 extended across the objects those modules
 * produce. It is NOT proven by "stateless", "pure", or "takes a height".
 *
 * OBJ-34 DifficultyAdvisory is stateless, pure, and computable at a height.
 * Every property a reader might re-derive the family from admits it. If it
 * rejoins, difficulty becomes consumable wherever a Projection is consumed and
 * owner ruling DG-F1 is defeated WITHOUT ANYONE EDITING A LINE THAT MENTIONS
 * DIFFICULTY.
 *
 * So: this module exports the ten names and exports NO membership predicate.
 * A module cannot ask "is this a Projection?" and get an answer from shape.
 *
 * The brand is the second half. TypeScript is structurally typed, so any object
 * with a `compute(at)` method would otherwise BE a Projection to the compiler.
 * The brand makes joining the family a deliberate, visible act rather than an
 * accident of shape - it does not replace the list, it stops the list being
 * bypassed silently.
 */
export const PROJECTION_MEMBERS = [
  "Sample",
  "Dispersion",
  "Location",
  "Bar",
  "PopulationPartition",
  "Reachability",
  "Diagnostic",
  "Ratio",
  "Chain",
  "InvalidationScope",
] as const;

export type ProjectionMember = (typeof PROJECTION_MEMBERS)[number];

declare const PROJECTION: unique symbol;

/**
 * Computed per read from the record as of a height, and stored nowhere.
 * No member may be memoised across an extension of the record: a cache keyed on
 * anything but a RecordHeight gives a derived fact a second home that can go
 * stale at the moment a human reads it. A height-keyed cache is permitted - a
 * value computed at height h remains correct for height h forever, and is
 * simply not an answer about h+1.
 *
 * A Projection carries no ON_FAIL (RFD-02). That is what a Gate has, and it is
 * why a Gate is not a Projection but *has* one.
 */
export interface Projection<T> {
  readonly [PROJECTION]: ProjectionMember;
  compute(at: RecordHeight): T;
}

/* ─── OBJ-01 AppendedFact - append-only by ABSENCE ──────────────────────────
 * A record entry that came into existence by an append at a height and never
 * changed. The contract is negative as much as positive: every field is
 * readonly, and no `update` or `delete` exists on the base or on any subclass,
 * so "the fact was corrected" HAS NO EXPRESSION IN THE TYPE SYSTEM.
 *
 * A correction is a new fact at a greater height whose relationship to the
 * earlier one is itself recorded (OBJ-18, MOD-12).
 */
export interface AppendedFact<TAuthor, TPayload> {
  readonly author: TAuthor;
  readonly at: RecordHeight;
  readonly payload: TPayload;
}

/* ─── OBJ-03 Gate - ON_FAIL is mandatory ────────────────────────────────────
 * A decision point with a mandatory failure outcome. A gate that can fail
 * without saying in WHICH of the five ways it failed re-opens the collapse
 * OBJ-04 exists to prevent, so `onFail` is required rather than optional.
 *
 * `closedBy` separates the two gates a human closes from the two a derivation
 * closes, and is what makes "proposals do not decide" checkable: `proposalsIn`
 * accepts a proposal type, and a proposal type is never an argument type of the
 * closing act (ER-4).
 *
 * Difficulty (OBJ-34) may never appear in a `condition`. Stated here at the
 * base, per owner ruling DG-F1, so no individual gate has to remember it.
 */
export interface Gate<TCondition, TProposal, TRecord> {
  readonly condition: TCondition;
  readonly closedBy: "HUMAN_ACT" | "DERIVATION";
  readonly proposalsIn: readonly TProposal[];
  readonly records: TRecord;
  readonly onFail: UnknownValue;
}
