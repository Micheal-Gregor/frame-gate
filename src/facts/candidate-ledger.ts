// CandidateLedger — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-3  every cross-module decider is handed in (R-18, R-25), never imported.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The one guarded candidate append, and the as-of reads by condition, by lineage and as
// per-currency counts (OBJ-11; MOD-05).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// There is exactly ONE way a candidate enters the record (S-01): `appendCandidate`. It
// asks, in this order, and the first failure answers with nothing appended (R-28, as
// amended by R-31):
//   1. ADMISSION   - MOD-04, injected (R-18). An unreachable draw costs nothing (REF-03):
//                    no later decider is even asked.
//   2. CONTEXT     - the draw this candidate was drawn under (R-31): REF-05 by construction,
//                    since only `recordDraw` mints a DrawContext and only with a declaration
//                    in force; it must be this unit's, this condition's, and not newer - and
//                    not already bound: one draw, one candidate (R-33).
//   3. FROM        - MOD-05's own check (R-26): `from` IS the effective commitment at the
//                    currency immediately below, as of the append height. At the least
//                    currency it is BOTTOM, for a unit licensed independent then (R-10), or
//                    ANOTHER unit's commitment in force then - F3's inheritance (R-40).
//   4. SIGNATURE   - MOD-12, injected (R-18): it receives the whole proposal, `from`
//                    included, and digests it under its own encoding (R-27, HOOK-04).
//   5. CEILING     - MOD-11, injected (R-25): the scope's remaining ceiling (REF-16).
// No guard sits around this method and no second path exists: a second place where a draw
// is judged is the removed duplicate the S3 forbids growing back.
import { height, isUnknown, refuse, succeeds, type AppendedFact, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Author } from "../ports/index.js";
import type { Currency, IndependenceAct, Unit } from "../catalog/index.js";
import type { Commitment, FactRecord } from "./commitment-ledger.js";
import type { DrawContext } from "./draw-context-log.js";

declare const CANDIDATE: unique symbol;

/** BOTTOM, as the closed Unknown family spells it (IR-42). */
export type Bottom = Extract<UnknownValue, { readonly kind: "no-subject" }>;
/** The BOTTOM a caller passes as `from`, typed so no other Unknown member can be. Never read by the class (OS-1). */
export const BOTTOM: Bottom = Object.freeze({ kind: "no-subject" } as const);

/** What a caller proposes; `from` is a Commitment or BOTTOM - no other Unknown compiles. */
export interface CandidateProposal {
  /**
   * The draw context this candidate was drawn under (R-31). Only `recordDraw` mints one,
   * and only with a declaration in force, so REF-05 holds on this path by construction
   * and the declaration is never re-read from the catalog (F1 S-14).
   */
  readonly context: DrawContext;
  readonly unit: Unit;
  readonly currency: Currency;
  /** The condition's identity, uninterpreted here (R-23; MOD-06 defines it). */
  readonly condition: string;
  readonly seed: string;
  readonly from: Commitment | Bottom;
}

export interface CandidatePayload {
  readonly kind: "candidate";
  /** The draw context drawn under, by its height (IR-43): SEAM-10's key per candidate. */
  readonly context: RecordHeight;
  readonly unit: Unit;
  readonly currency: Currency;
  readonly condition: string;
  readonly seed: string;
  /** The commitment derived from, by its height (IR-43), or BOTTOM. */
  readonly from: RecordHeight | Bottom;
  /** The verified signature, carried opaque (R-27). */
  readonly signature: string;
}

/** OBJ-11 — nominal: only `CandidateLedger.appendCandidate` and its reads mint one. */
export type Candidate = AppendedFact<Author, CandidatePayload> & { readonly [CANDIDATE]: true };

/** One count per currency, in currency order (SEAM-22): never summed, never divided. */
export interface CurrencyCount {
  readonly currency: Currency;
  readonly count: number;
}

/** MOD-05's own fold, injected so `from` is checked against what MOD-04 reads (R-26). */
export interface CommitmentFold {
  effectiveCommitment(unit: Unit, currency: Currency, at: RecordHeight): Commitment | UnknownValue;
}
/** MOD-03's currency order (SEAM-01): the set, and what lies below a currency. */
export interface CurrencyLadder {
  currencies(): readonly Currency[];
  predecessors(currency: Currency): readonly Currency[] | UnknownValue;
}
/** MOD-03's independence acts (R-10). */
export interface IndependenceReader {
  independenceAt(unit: Unit, at: RecordHeight): IndependenceAct | UnknownValue;
}
/** MOD-04's admission (R-18, SEAM-03): ADMIT, or its refusal naming the cheapest BOTTOM predecessor. */
export interface AdmissionDecider {
  admit(unit: Unit, currency: Currency, at: RecordHeight): "ADMIT" | UnknownValue;
}
/** MOD-12's signature check (R-18, R-27, S-05): over the whole proposal; it computes the digest. */
export interface SignatureCheck {
  check(proposal: CandidateProposal, signature: string, at: RecordHeight): "VERIFIED" | UnknownValue;
}
/** MOD-11's scope ceiling (R-25, SEAM-04, REF-16). */
export interface ScopeCeiling {
  admitsDraw(unit: Unit, currency: Currency, at: RecordHeight): "WITHIN" | UnknownValue;
}

export interface CandidateLedgerInputs {
  readonly record: FactRecord;
  readonly commitments: CommitmentFold;
  readonly currencies: CurrencyLadder;
  readonly independence: IndependenceReader;
  readonly admission: AdmissionDecider;
  readonly signatures: SignatureCheck;
  readonly ceiling: ScopeCeiling;
}

export class CandidateLedger {
  readonly #record: FactRecord;
  readonly #commitments: CommitmentFold;
  readonly #currencies: CurrencyLadder;
  readonly #independence: IndependenceReader;
  readonly #admission: AdmissionDecider;
  readonly #signatures: SignatureCheck;
  readonly #ceiling: ScopeCeiling;

  constructor({ record, commitments, currencies, independence, admission, signatures, ceiling }: CandidateLedgerInputs) {
    // OS-1: every object input is a declared slot - the operations called on it are named
    // and checked here, never discovered inside a method.
    const slot = (name: string, value: object | undefined | null, operations: readonly string[]): void => {
      if (value === undefined || value === null) throw new TypeError(`CandidateLedger requires ${name}`);
      for (const operation of operations) {
        if (typeof (value as Readonly<Record<string, unknown>>)[operation] !== "function") {
          throw new TypeError(`${name} must offer ${operations.join(" and ")}`);
        }
      }
    };
    slot("record", record, ["append", "readAsOf"]);
    slot("commitments", commitments, ["effectiveCommitment"]);
    slot("currencies", currencies, ["currencies", "predecessors"]);
    slot("independence", independence, ["independenceAt"]);
    slot("admission", admission, ["admit"]);
    slot("signatures", signatures, ["check"]);
    slot("ceiling", ceiling, ["admitsDraw"]);
    this.#record = record;
    this.#commitments = commitments;
    this.#currencies = currencies;
    this.#independence = independence;
    this.#admission = admission;
    this.#signatures = signatures;
    this.#ceiling = ceiling;
    Object.freeze(this);
  }

  /** The one guarded candidate append (S-01): admission, context, from, signature, ceiling - in that order (R-31). */
  appendCandidate(proposal: CandidateProposal, signature: string, at: RecordHeight, author: Author): Candidate | UnknownValue {
    // 1. ADMISSION (MOD-04). An unreachable draw costs nothing: nothing after this is asked.
    const admitted = this.#admission.admit(proposal.unit, proposal.currency, at);
    if (admitted !== "ADMIT") return admitted;
    // 2. CONTEXT (R-31) - the draw this candidate was drawn under. Its existence proves a
    // declaration was in force at the draw (REF-05: only recordDraw mints one); it must be THIS
    // draw's - this unit, this condition, recorded at or below the append height. The
    // declaration itself is never re-read here (F1 S-14).
    const context = proposal.context;
    if (context.payload.unit !== proposal.unit || context.payload.condition !== proposal.condition || succeeds(context.at, at)) {
      return refuse("context-mismatch");
    }
    // One draw, one candidate (R-33): a context already bound as of `at` is spent. This reads
    // MOD-05's own record at a height - never the catalog (F1 S-14).
    const [alreadyBound] = this.#candidatesWhere(at, (p) => p.context === context.at);
    if (alreadyBound !== undefined) return refuse("context-spent");
    // 3. FROM (R-26) - MOD-05's own check, against its own fold.
    const lineage = this.#checkFrom(proposal, at);
    if (lineage !== "WELL-FORMED") return lineage;
    // 4. SIGNATURE (MOD-12): over the whole proposal, `from` included; MOD-12 digests it (R-27).
    const verified = this.#signatures.check(proposal, signature, at);
    if (verified !== "VERIFIED") return verified;
    // 5. CEILING (MOD-11, REF-16).
    const within = this.#ceiling.admitsDraw(proposal.unit, proposal.currency, at);
    if (within !== "WITHIN") return within;

    const payload: CandidatePayload = Object.freeze({
      kind: "candidate",
      context: proposal.context.at,
      unit: proposal.unit,
      currency: proposal.currency,
      condition: proposal.condition,
      seed: proposal.seed,
      // By height (IR-43); BOTTOM as a fresh frozen member, never the caller's object.
      from: "payload" in proposal.from ? proposal.from.at : Object.freeze({ kind: "no-subject" } as const),
      signature,
    });
    const recordedAt = this.#record.append(Object.freeze({ author, payload }));
    // The one place a Candidate is minted on append.
    return Object.freeze({ author, at: recordedAt, payload }) as Candidate;
  }

  /** The candidates for (unit, currency) under one condition identity, at or below `at` (S-09). */
  candidatesAsOf(unit: Unit, currency: Currency, condition: string, at: RecordHeight): readonly Candidate[] {
    // Membership by condition IDENTITY, never a time window (S-09, REF-10).
    return this.#candidatesWhere(at, (p) => p.unit === unit && p.currency === currency && p.condition === condition);
  }

  /** The candidates derived from `commitment`, at or below `at` (MOD-12's lineage walk). */
  derivedFrom(commitment: Commitment, at: RecordHeight): readonly Candidate[] {
    return this.#candidatesWhere(at, (p) => p.from === commitment.at);
  }

  /** One candidate count per currency for `unit`, in currency order, as of `at` (SEAM-22). */
  countsAsOf(unit: Unit, at: RecordHeight): readonly CurrencyCount[] {
    // Counts only, one per currency, zeros included: never summed and never divided (the
    // ratio is MOD-11's, and a 1-to-4 vector must not hide inside "0.25").
    const mine = this.#candidatesWhere(at, (p) => p.unit === unit);
    return Object.freeze(
      this.#currencies.currencies().map((currency) =>
        Object.freeze({ currency, count: mine.filter((k) => k.payload.currency === currency).length }),
      ),
    );
  }

  /**
   * R-26. Above the least currency, `from` must BE the effective commitment at the currency
   * immediately below, as of `at`. At the least currency there is nothing below, so `from`
   * is BOTTOM, licensed by an independence act in force at `at` (R-10), or - F3's
   * inheritance (R-40) - ANOTHER unit's commitment, which the fold answers for that unit and
   * currency as of `at`. A read that answers "none" is the malformation; any other Unknown is
   * passed through, not collapsed.
   */
  #checkFrom(proposal: CandidateProposal, at: RecordHeight): "WELL-FORMED" | UnknownValue {
    const below = this.#currencies.predecessors(proposal.currency);
    if (isUnknown(below)) return below;
    const immediate = below.at(-1);
    if (immediate === undefined) {
      if ("payload" in proposal.from) {
        // Inheritance (R-40): another unit's - never this unit's own, at any currency - and in
        // force as of `at`. The fold is asked for the pair the commitment names; agreement by
        // height means the record holds exactly that commitment, in force, for that pair.
        const donor = proposal.from.payload;
        if (donor.unit === proposal.unit) return refuse("malformed-from");
        const inForce = this.#commitments.effectiveCommitment(donor.unit, donor.currency, at);
        if (isUnknown(inForce)) return inForce.kind === "no-subject" ? refuse("malformed-from") : inForce;
        return inForce.at === proposal.from.at ? "WELL-FORMED" : refuse("malformed-from");
      }
      const license = this.#independence.independenceAt(proposal.unit, at);
      if (isUnknown(license)) return license.kind === "no-subject" ? refuse("malformed-from") : license;
      return license.payload.independent ? "WELL-FORMED" : refuse("malformed-from");
    }
    if (!("payload" in proposal.from)) return refuse("malformed-from");
    const effective = this.#commitments.effectiveCommitment(proposal.unit, immediate, at);
    if (isUnknown(effective)) return effective.kind === "no-subject" ? refuse("malformed-from") : effective;
    return effective.at === proposal.from.at ? "WELL-FORMED" : refuse("malformed-from");
  }

  /** This ledger's candidates at or below `at` that `keep` selects, minted by position (IR-31). */
  #candidatesWhere(at: RecordHeight, keep: (payload: CandidatePayload) => boolean): readonly Candidate[] {
    const out: Candidate[] = [];
    this.#record.readAsOf(at).forEach((fact, position) => {
      if (!isCandidateEntry(fact) || !keep(fact.payload)) return;
      // The one place a Candidate is minted on read.
      out.push(Object.freeze({ author: fact.author, at: height(position + 1), payload: fact.payload }) as Candidate);
    });
    return Object.freeze(out);
  }
}

/**
 * A candidate entry, recognised by kind among every module's facts - the ONE rule, shared by
 * this ledger and the lineage reader (R-41). Provenance rests on the static guards - no
 * candidate-kind entry is built outside src/facts (BC-05-6), and only `appendCandidate`
 * appends one (S-01, the paths map) - and at runtime on PC-02. MOD-05-internal: not
 * re-exported from facts/index.ts.
 */
export function isCandidateEntry(fact: unknown): fact is { author: Author; payload: CandidatePayload } {
  if (typeof fact !== "object" || fact === null || !("payload" in fact) || !("author" in fact)) return false;
  const payload = (fact as { payload: unknown }).payload;
  return typeof payload === "object" && payload !== null && (payload as { kind?: unknown }).kind === "candidate";
}
