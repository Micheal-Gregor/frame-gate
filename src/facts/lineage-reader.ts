// LineageReader — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Record-only lineage: candidates derived from a commitment, commitments accepting a candidate (R-41).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// It reads the record and nothing else - no fold, no decider - so MOD-12 can derive a scope
// without constructing the CommitmentLedger whose invalidation reader MOD-12 itself supplies
// (R-41: no construction cycle). It answers UNBRANDED records - heights, and the fields that
// link them - because a Commitment or a Candidate is minted only by its own ledger (the mint
// rule, BC-05-6): this reader names lineage; it never mints a fact. What counts as each kind is
// the ledgers' own recognizer, never a second one.
import { height, type RecordHeight } from "../kernel/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import { isCandidateEntry } from "./candidate-ledger.js";
import { isCommitmentEntry, type FactRecord } from "./commitment-ledger.js";

/** A candidate derived from a commitment, by its height - unbranded (the mint rule). */
export interface DerivedCandidate {
  readonly at: RecordHeight;
  readonly unit: Unit;
  readonly currency: Currency;
  readonly from: RecordHeight;
}

/** A commitment that accepted a candidate, by its height - unbranded (the mint rule). */
export interface AcceptingCommitment {
  readonly at: RecordHeight;
  readonly unit: Unit;
  readonly currency: Currency;
  readonly candidate: RecordHeight;
}

export class LineageReader {
  readonly #record: FactRecord;

  constructor({ record }: { readonly record: FactRecord }) {
    if (record === undefined || record === null) throw new TypeError("LineageReader requires record");
    // OS-1: a declared slot - the one operation called on it is named and checked here.
    if (typeof record.readAsOf !== "function") throw new TypeError("record must offer readAsOf (RecordPort, MOD-02)");
    this.#record = record;
    Object.freeze(this);
  }

  /** The candidates whose `from` is the commitment at `commitment`, at or below `at`, in append order. */
  derivedFrom(commitment: RecordHeight, at: RecordHeight): readonly DerivedCandidate[] {
    const out: DerivedCandidate[] = [];
    this.#record.readAsOf(at).forEach((fact, position) => {
      if (!isCandidateEntry(fact) || fact.payload.from !== commitment) return;
      // A fact's height is its 1-based position (OBJ-10; IR-31).
      out.push(Object.freeze({ at: height(position + 1), unit: fact.payload.unit, currency: fact.payload.currency, from: commitment }));
    });
    return Object.freeze(out);
  }

  /** The commitments that accepted the candidate at `candidate`, at or below `at`, in append order. */
  acceptedBy(candidate: RecordHeight, at: RecordHeight): readonly AcceptingCommitment[] {
    const out: AcceptingCommitment[] = [];
    this.#record.readAsOf(at).forEach((fact, position) => {
      if (!isCommitmentEntry(fact) || fact.payload.candidate !== candidate) return;
      out.push(Object.freeze({ at: height(position + 1), unit: fact.payload.unit, currency: fact.payload.currency, candidate }));
    });
    return Object.freeze(out);
  }
}
