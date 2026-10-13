// CommitmentLedger — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Appends HUMAN commitments; folds the effective commitment per (unit, currency) as of
// a height (OBJ-12 Commitment, OBJ-31 CommitGate; MOD-05).
//
// R-41: a commitment ACCEPTS a candidate. `commit(candidate, "HUMAN")` takes its unit and
// currency from the candidate and records the candidate by height (IR-43), so F4's Accepted
// set is read by key and never inferred.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// A commitment is a HUMAN act appended to the record (INV-PROV). `effective(u, c)` is a
// FOLD over the append-only record, recomputed per call and never stored (RC-3, SC-2):
//   - none in force          -> BOTTOM, which is `NoSubject` (IR-42), never null;
//   - exactly one in force   -> that commitment;
//   - two in force           -> `uncomputable("two-effective-commitments")` (R-20).
// "In force" means appended by this ledger, for this (unit, currency), at or below the
// height, and not invalidated at that height by the declared reader (R-19) - which is
// how supersession (MOD-12's derive -> display -> invalidate) reaches the fold without
// MOD-05 defining anything of MOD-12's facts.
import { height, noSubject, uncomputable, type AppendedFact, type Gate, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { RecordPort } from "../ports/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { Candidate } from "./candidate-ledger.js";

declare const COMMITTED: unique symbol;

export interface CommitmentPayload {
  readonly kind: "commitment";
  readonly unit: Unit;
  readonly currency: Currency;
  /** The candidate this commitment accepts, by its height (IR-43; R-41). */
  readonly candidate: RecordHeight;
}

/** OBJ-12 — nominal: only `CommitmentLedger.commit` and its fold mint one. */
export type Commitment = AppendedFact<"HUMAN", CommitmentPayload> & { readonly [COMMITTED]: true };

/** The shared record: every module's facts, in append order (a RecordPort, MOD-02). */
export type FactRecord = RecordPort<unknown, RecordHeight>;

/**
 * R-19: the one question MOD-05 asks of MOD-12. Declared by the operation called on
 * it (OS-1); MOD-12's invalidation facts are never named here.
 */
export interface InvalidationReader {
  isInvalidated(commitment: Commitment, at: RecordHeight): boolean;
}

/**
 * OBJ-31 CommitGate, as a Gate descriptor (OBJ-03). It is closed by a HUMAN act, which
 * `commit`'s `"HUMAN"` author parameter enforces at parse. Its proposals - a diagnostic
 * and an observation - propose and never close: no act signature accepts either
 * (REF-06, ER-4), and a commitment requires neither, so the smallest run (both
 * diagnostic axes absent) still commits. ON_FAIL refuses the commitment; with the
 * author decided at parse, the refusal fires before runtime.
 */
export const COMMIT_GATE: Gate<
  "a human act is present for (unit, currency)",
  "Diagnostic" | "Observation",
  "Commitment"
> = Object.freeze({
  condition: "a human act is present for (unit, currency)",
  closedBy: "HUMAN_ACT",
  proposalsIn: Object.freeze(["Diagnostic", "Observation"] as const),
  records: "Commitment",
  onFail: Object.freeze({ kind: "refuse", guard: "commit-gate" } as const),
});

export class CommitmentLedger {
  readonly #record: FactRecord;
  readonly #invalidations: InvalidationReader;

  constructor({ record, invalidations }: { readonly record: FactRecord; readonly invalidations: InvalidationReader }) {
    if (record === undefined || record === null) throw new TypeError("CommitmentLedger requires record");
    // OS-1: an object input is a declared slot - the operations called on it are named
    // and checked here, never discovered inside a method.
    if (typeof record.append !== "function" || typeof record.readAsOf !== "function") {
      throw new TypeError("record must offer append and readAsOf (RecordPort, MOD-02)");
    }
    if (invalidations === undefined || invalidations === null) throw new TypeError("CommitmentLedger requires invalidations");
    if (typeof invalidations.isInvalidated !== "function") {
      throw new TypeError("invalidations must offer isInvalidated (R-19, MOD-12)");
    }
    this.#record = record;
    this.#invalidations = invalidations;
    Object.freeze(this);
  }

  /** Appends a HUMAN commitment accepting `candidate` (R-41). Takes no diagnostic and no observation. */
  commit(candidate: Candidate, author: "HUMAN"): Commitment {
    // No "is one already in force?" check: that is a read, and a read needs a height
    // this act does not have. A second commitment is appended and the fold answers
    // `uncomputable` for it (R-20) - the record says what happened, the read says what holds.
    // The unit and currency are the candidate's: a commitment cannot name a pair its
    // candidate was not drawn for.
    const payload: CommitmentPayload = Object.freeze({
      kind: "commitment",
      unit: candidate.payload.unit,
      currency: candidate.payload.currency,
      candidate: candidate.at,
    });
    // What the record holds carries no height: the record assigns it (IR-31).
    const at = this.#record.append(Object.freeze({ author, payload }));
    // The one place a Commitment is minted on append.
    return Object.freeze({ author, at, payload }) as Commitment;
  }

  /** The commitment in force for `(unit, currency)` as of `at`: one, BOTTOM, or uncomputable. */
  effectiveCommitment(unit: Unit, currency: Currency, at: RecordHeight): Commitment | UnknownValue {
    const inForce: Commitment[] = [];
    this.#record.readAsOf(at).forEach((fact, position) => {
      if (!isCommitmentEntry(fact) || fact.payload.unit !== unit || fact.payload.currency !== currency) return;
      // A fact's height is its 1-based position: a RecordHeight is a count of appends
      // (OBJ-10; IR-31). The one place a Commitment is minted on read.
      const commitment = Object.freeze({ author: fact.author, at: height(position + 1), payload: fact.payload }) as Commitment;
      if (!this.#invalidations.isInvalidated(commitment, at)) inForce.push(commitment);
    });
    // Zero, one, or more than one - asked by position, not by a count compared to a
    // literal: "more than one" is the rule, not "two" (SC-3).
    const [first, second] = inForce;
    if (first === undefined) return noSubject();
    if (second !== undefined) return uncomputable("two-effective-commitments");
    return first;
  }
}

/**
 * A commitment entry, recognised by kind among every module's facts - the ONE rule for what
 * the record holds as a commitment, shared by the fold and the lineage reader (R-41) so the
 * two can never read different sets. As with the catalog's ledgers (R-12; IR-35): an entry
 * that says `author: "HUMAN"` with this kind, naming a candidate, IS read as a commitment -
 * the record is shared and untyped, so provenance beyond this rests on the static forge guard
 * (no commitment-kind entry is built or appended outside src/facts, BC-05-6) and, at runtime,
 * on PC-02's identity binding. MOD-05-internal: not re-exported from facts/index.ts.
 */
export function isCommitmentEntry(fact: unknown): fact is { author: "HUMAN"; payload: CommitmentPayload } {
  if (typeof fact !== "object" || fact === null || !("payload" in fact) || !("author" in fact)) return false;
  const payload = (fact as { payload: unknown }).payload;
  if (typeof payload !== "object" || payload === null) return false;
  return (
    (fact as { author: unknown }).author === "HUMAN" &&
    (payload as { kind?: unknown }).kind === "commitment" &&
    // R-41: every commitment names the candidate it accepts.
    typeof (payload as { candidate?: unknown }).candidate === "number"
  );
}
