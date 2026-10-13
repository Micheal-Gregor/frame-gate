// Samples — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Samples by condition identity, with their closure, as of a height.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-19 (a Projection, joined as "Sample"). The candidates of one (unit, currency) sharing ONE
// identity, as of a height: membership by identity, never by a window, a recency or a cap (J1,
// INV-SAMPLE). HOOK-06 guards the assembly: a member of another identity forms no sample. The
// sample states its closure (R-53) and decides nothing about what closure means (J3).
import { asProjection, isUnknown, refuse, succeeds, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { AcceptingCommitment, Candidate, DrawContext } from "../facts/index.js";
import type { ConditionIdentity } from "./condition-identities.js";
import type { PromptRevision } from "./revision-log.js";

/** R-53: closure is a fact the sample states, never a judgment about validity (J3). */
export type Closure =
  | { readonly kind: "open" }
  | { readonly kind: "closed-by-revision"; readonly revision: RecordHeight }
  | { readonly kind: "closed-by-commitment"; readonly commitment: RecordHeight };

/** OBJ-19's value as of one height - computed per read, stored nowhere. */
export interface SampleValue {
  readonly unit: Unit;
  readonly currency: Currency;
  readonly condition: ConditionIdentity;
  /** The candidates carrying this identity, in append order. */
  readonly members: readonly Candidate[];
  readonly cardinality: number;
  readonly closure: Closure;
  /** AE-3, carried open: only OBJ-20 reads it. */
  readonly heldBehind: "AE-3";
}

/** MOD-05's candidate read by condition identity (S-09). */
export interface CandidateReads {
  candidatesAsOf(unit: Unit, currency: Currency, condition: string, at: RecordHeight): readonly Candidate[];
}
/** MOD-05's draw contexts: where a unit's conditions are read from. */
export interface DrawReads {
  drawsAsOf(unit: Unit, at: RecordHeight): readonly DrawContext[];
}
/** MOD-06's own revisions. */
export interface RevisionReads {
  revisions(unit: Unit, currency: Currency, at: RecordHeight): readonly PromptRevision[];
}
/** MOD-05's record-only lineage: which commitments accepted a candidate (R-41). */
export interface AcceptanceReads {
  acceptedBy(candidate: RecordHeight, at: RecordHeight): readonly AcceptingCommitment[];
}

export class Samples {
  readonly #candidates: CandidateReads;
  readonly #draws: DrawReads;
  readonly #revisions: RevisionReads;
  readonly #lineage: AcceptanceReads;

  constructor({ candidates, draws, revisions, lineage }: { readonly candidates: CandidateReads; readonly draws: DrawReads; readonly revisions: RevisionReads; readonly lineage: AcceptanceReads }) {
    // OS-1: every object input is a declared slot - the operation called on it is named and checked here.
    const slot = (name: string, value: object | undefined | null, operation: string): void => {
      if (value === undefined || value === null) throw new TypeError(`Samples requires ${name}`);
      if (typeof (value as Readonly<Record<string, unknown>>)[operation] !== "function") throw new TypeError(`${name} must offer ${operation}`);
    };
    slot("candidates", candidates, "candidatesAsOf");
    slot("draws", draws, "drawsAsOf");
    slot("revisions", revisions, "revisions");
    slot("lineage", lineage, "acceptedBy");
    this.#candidates = candidates;
    this.#draws = draws;
    this.#revisions = revisions;
    this.#lineage = lineage;
    Object.freeze(this);
  }

  /** OBJ-19 for ONE identity (IR-87): a Projection, joined through the kernel; HOOK-06 guards its assembly. */
  of(unit: Unit, currency: Currency, condition: ConditionIdentity): Projection<SampleValue | UnknownValue> {
    // R-35: joined through the kernel, by name. Computed per read; nothing is kept.
    return asProjection("Sample", (at: RecordHeight) => this.#assemble(unit, currency, condition, at));
  }

  /** Every non-empty sample of (unit, currency) as of `at`: one per identity, disjoint. */
  samplesFor(unit: Unit, currency: Currency, at: RecordHeight): readonly SampleValue[] | UnknownValue {
    // The unit's identities are read off its draws (each candidate binds its draw, R-31), in order.
    const identities = [...new Set(this.#draws.drawsAsOf(unit, at).map((d) => d.payload.condition))];
    const out: SampleValue[] = [];
    for (const condition of identities) {
      const sample = this.#assemble(unit, currency, condition as ConditionIdentity, at);
      if (isUnknown(sample)) return sample;
      if (sample.members[0] !== undefined) out.push(sample);
    }
    return Object.freeze(out);
  }

  /** HOOK-06 @before-sample-assembly, then the sample with its closure. */
  #assemble(unit: Unit, currency: Currency, condition: ConditionIdentity, at: RecordHeight): SampleValue | UnknownValue {
    const members = this.#candidates.candidatesAsOf(unit, currency, condition, at);
    // HOOK-06: every member carries the queried identity, or no sample is formed (IR-89).
    if (members.some((m) => m.payload.condition !== condition)) return refuse("mixed-conditions");
    return Object.freeze({ unit, currency, condition, members, cardinality: members.length, closure: this.#closure(unit, currency, condition, members, at), heldBehind: "AE-3" as const });
  }

  /** R-53: the EARLIEST of a revision to another identity after the first member, or an acceptance of a member. */
  #closure(unit: Unit, currency: Currency, condition: ConditionIdentity, members: readonly Candidate[], at: RecordHeight): Closure {
    const [first] = members;
    if (first === undefined) return Object.freeze({ kind: "open" } as const);
    const revision = this.#revisions.revisions(unit, currency, at).find((r) => succeeds(r.at, first.at) && r.payload.condition !== condition);
    const acceptance = members
      .flatMap((m) => this.#lineage.acceptedBy(m.at, at))
      .reduce<AcceptingCommitment | undefined>((earliest, k) => (earliest === undefined || succeeds(earliest.at, k.at) ? k : earliest), undefined);
    if (acceptance !== undefined && (revision === undefined || succeeds(revision.at, acceptance.at))) {
      return Object.freeze({ kind: "closed-by-commitment", commitment: acceptance.at } as const);
    }
    return revision === undefined ? Object.freeze({ kind: "open" } as const) : Object.freeze({ kind: "closed-by-revision", revision: revision.at } as const);
  }
}
