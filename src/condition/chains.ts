// Chains — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Maximal paths of units whose least-currency commitment inherits from another unit's.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-27 (a Projection, joined as "Chain"). An edge u -> v exists when v's least-currency
// commitment IN FORCE accepted a candidate derived from u's commitment (R-40, R-41, R-54), so a
// unit has one predecessor at most. A chain is each maximal path from a head (a unit nobody
// precedes) to an end. Chains are reported; nothing here schedules, blocks or gates on them.
import { asProjection, isUnknown, type Projection, type RecordHeight } from "../kernel/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { AcceptingCommitment, CommitmentFold, LineageCandidate } from "../facts/index.js";
import type { UnknownValue } from "../kernel/index.js";

/** One inheritance: `to`'s least-currency commitment accepted `candidate`, derived from `from`'s commitment `donor`. */
export interface ChainEdge {
  readonly from: Unit;
  readonly to: Unit;
  readonly donor: RecordHeight;
  readonly candidate: RecordHeight;
  readonly commitment: RecordHeight;
}

/** OBJ-27: one maximal path, from an independent head to an end (R-54). */
export interface Chain {
  readonly units: readonly Unit[];
  readonly edges: readonly ChainEdge[];
}

/** MOD-05's record-only lineage, read whole (IR-90). */
export interface ChainLineage {
  candidatesAsOf(at: RecordHeight): readonly LineageCandidate[];
  commitmentsAsOf(at: RecordHeight): readonly AcceptingCommitment[];
}
/** MOD-03's order: the least currency is the one with no predecessors (S-13: never compared by name). */
export interface ChainLadder {
  predecessors(currency: Currency): readonly Currency[] | UnknownValue;
}

export class Chains {
  readonly #lineage: ChainLineage;
  readonly #commitments: CommitmentFold;
  readonly #currencies: ChainLadder;

  constructor({ lineage, commitments, currencies }: { readonly lineage: ChainLineage; readonly commitments: CommitmentFold; readonly currencies: ChainLadder }) {
    // OS-1: every object input is a declared slot - the operations called on it are named and checked here.
    const slot = (name: string, value: object | undefined | null, operations: readonly string[]): void => {
      if (value === undefined || value === null) throw new TypeError(`Chains requires ${name}`);
      for (const operation of operations) {
        if (typeof (value as Readonly<Record<string, unknown>>)[operation] !== "function") throw new TypeError(`${name} must offer ${operations.join(" and ")}`);
      }
    };
    slot("lineage", lineage, ["candidatesAsOf", "commitmentsAsOf"]);
    slot("commitments", commitments, ["effectiveCommitment"]);
    slot("currencies", currencies, ["predecessors"]);
    this.#lineage = lineage;
    this.#commitments = commitments;
    this.#currencies = currencies;
    Object.freeze(this);
  }

  /** OBJ-27, every chain as of a height: a Projection, joined through the kernel. */
  chains(): Projection<readonly Chain[]> {
    // R-35: joined through the kernel, by name. Computed per read; nothing is kept.
    return asProjection("Chain", (at: RecordHeight) => this.#paths(this.#edges(at)));
  }

  /** Every inheritance edge as of `at`, in the order the successors' commitments were appended. */
  #edges(at: RecordHeight): readonly ChainEdge[] {
    const commitments = this.#lineage.commitmentsAsOf(at);
    const commitmentAt = new Map(commitments.map((k) => [k.at, k]));
    const candidateAt = new Map(this.#lineage.candidatesAsOf(at).map((c) => [c.at, c]));
    const edges: ChainEdge[] = [];
    for (const k of commitments) {
      // The least currency is the one with nothing below it (S-13: by the order, never by name).
      const below = this.#currencies.predecessors(k.currency);
      if (isUnknown(below) || below.at(-1) !== undefined) continue;
      // R-54: only the commitment the fold answers - in force, alone - makes an edge.
      const inForce = this.#commitments.effectiveCommitment(k.unit, k.currency, at);
      if (isUnknown(inForce) || inForce.at !== k.at) continue;
      const accepted = candidateAt.get(k.candidate);
      if (accepted === undefined || typeof accepted.from !== "number") continue; // independent: no edge in
      const donor = commitmentAt.get(accepted.from);
      if (donor === undefined || donor.unit === k.unit) continue;
      edges.push(Object.freeze({ from: donor.unit, to: k.unit, donor: donor.at, candidate: k.candidate, commitment: k.at }));
    }
    return edges;
  }

  /** Each maximal path from a head (a unit with successors and no predecessor) to an end. */
  #paths(edges: readonly ChainEdge[]): readonly Chain[] {
    const out: Chain[] = [];
    const preceded = new Set(edges.map((e) => e.to));
    const walk = (last: Unit, units: readonly Unit[], path: readonly ChainEdge[]): void => {
      const next = edges.filter((e) => e.from === last);
      if (next[0] === undefined) {
        out.push(Object.freeze({ units: Object.freeze([...units]), edges: Object.freeze([...path]) }));
        return;
      }
      for (const e of next) walk(e.to, [...units, e.to], [...path, e]);
    };
    for (const head of new Set(edges.map((e) => e.from))) if (!preceded.has(head)) walk(head, [head], []);
    return Object.freeze(out);
  }
}
