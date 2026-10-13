// InvalidationScope — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The consequence set of un-approving a commitment: its candidates closed transitively over from, through acceptances (R-42), as of a height.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-28 InvalidationScope (a Projection, R-35). The scope of commitment K as of a height: the
// candidates whose `from` is K; the commitments that ACCEPTED any of them (R-41, R-42); the
// candidates whose `from` is one of those; and so on, to a fixed point. "Chain propagation IS
// the closure - not a separate rule, a second pass, or a configurable depth" (F2): one rule,
// walked until nothing new is reached. It reads MOD-05's record-only lineage (R-41) and nothing
// else - no fold, so MOD-12 never constructs the ledger whose invalidation reader it supplies.
// Lineage points only backwards (a candidate's `from` and a commitment's candidate are both
// lower heights), so the walk terminates and nothing above the height is ever reached.
import { asProjection, compare, type Projection, type RecordHeight } from "../kernel/index.js";
import type { AcceptingCommitment, DerivedCandidate } from "../facts/index.js";

/** MOD-05's record-only lineage (R-41): the two operations called on it. */
export interface LineageWalk {
  derivedFrom(commitment: RecordHeight, at: RecordHeight): readonly DerivedCandidate[];
  acceptedBy(candidate: RecordHeight, at: RecordHeight): readonly AcceptingCommitment[];
}

/** OBJ-28's value as of one height - computed per read, stored nowhere. */
export interface ScopeValue {
  /** The commitment whose un-approval this is the consequence of, by its height. */
  readonly commitment: RecordHeight;
  /** The height it was derived as of. */
  readonly at: RecordHeight;
  /** The closure over `from` (through acceptances, R-42), in append order. */
  readonly candidates: readonly DerivedCandidate[];
  /** The commitments in the closure that accepted one of its candidates, in append order. */
  readonly commitments: readonly AcceptingCommitment[];
  /** How many candidates: the count the human is shown before the act (F2). */
  readonly count: number;
}

export class InvalidationScope {
  readonly #lineage: LineageWalk;

  constructor({ lineage }: { readonly lineage: LineageWalk }) {
    if (lineage === undefined || lineage === null) throw new TypeError("InvalidationScope requires lineage");
    // OS-1: a declared slot - the operations called on it are named and checked here.
    if (typeof lineage.derivedFrom !== "function" || typeof lineage.acceptedBy !== "function") {
      throw new TypeError("lineage must offer derivedFrom and acceptedBy (MOD-05's LineageReader, R-41)");
    }
    this.#lineage = lineage;
    Object.freeze(this);
  }

  /** OBJ-28 for the commitment at `commitment`: a Projection, joined through the kernel (R-35). */
  of(commitment: RecordHeight): Projection<ScopeValue> {
    // R-35: joined through the kernel, by name. Computed per read; nothing is kept.
    return asProjection("InvalidationScope", (at: RecordHeight) => this.#closure(commitment, at));
  }

  /** The closure of `commitment` over `from`, through acceptances, as of `at`. */
  #closure(commitment: RecordHeight, at: RecordHeight): ScopeValue {
    const candidates = new Map<RecordHeight, DerivedCandidate>();
    const commitments = new Map<RecordHeight, AcceptingCommitment>();
    const pending: RecordHeight[] = [commitment];
    for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
      for (const derived of this.#lineage.derivedFrom(next, at)) {
        if (candidates.has(derived.at)) continue;
        candidates.set(derived.at, derived);
        for (const accepting of this.#lineage.acceptedBy(derived.at, at)) {
          if (commitments.has(accepting.at)) continue;
          commitments.set(accepting.at, accepting);
          pending.push(accepting.at);
        }
      }
    }
    const inAppendOrder = <T extends { readonly at: RecordHeight }>(found: ReadonlyMap<RecordHeight, T>): readonly T[] =>
      Object.freeze([...found.values()].sort((a, b) => compare(a.at, b.at)));
    const reached = inAppendOrder(candidates);
    return Object.freeze({ commitment, at, candidates: reached, commitments: inAppendOrder(commitments), count: reached.length });
  }
}
