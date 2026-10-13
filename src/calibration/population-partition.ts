// PopulationPartition — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Accepted and PassedOver at one declaration level for one component, with both exclusion counts, as of a height.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-23 (a Projection, joined as "PopulationPartition"). At one declaration level, for one
// component (R-70), as of a height, pooled across currencies (R-71):
//   Accepted   - the candidates with a commitment not invalidated as of the height (X21: an
//                invalidated commitment's candidate - directly or inside its scope - moves out);
//   PassedOver - every other member of a CLOSED sample, closed by a commitment or by a revision.
//                MOD-06 decides closure (AE-6); a member of an open sample is in neither.
// A candidate's level is the declaration recorded at its draw (SEAM-10), never the current one.
// A member with no score for the component - unobserved, or ABSENT - joins no population and is
// counted excluded on the side it would have joined (SEAM-09, ST-F2). Computed per read and never
// accumulated: the union is monotone, the partition is not (AE-02).
import { asProjection, compare, isUnknown, refuse, uncomputable, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Declaration, Unit } from "../catalog/index.js";
import type { AcceptingCommitment, Candidate, DrawContext, LineageCandidate } from "../facts/index.js";
import type { SampleValue } from "../condition/index.js";
import { component as componentOf, isAbsent, type Observation, type Score } from "../observation/index.js";

/** One scored member of a population. */
export interface Member {
  readonly candidate: Candidate;
  readonly score: Score;
}

/** OBJ-23's value as of one height: computed per read and never accumulated (AE-02). */
export interface Populations {
  readonly level: string;
  readonly component: string;
  /** Scored members with a commitment not invalidated as of the height, by candidate height. */
  readonly accepted: readonly Member[];
  /** Scored members of closed samples with no such commitment, by candidate height. */
  readonly passedOver: readonly Member[];
  /** Members that would have joined Accepted but have no score for the component (SEAM-09, R-70). */
  readonly excludedAccepted: number;
  /** Members that would have joined PassedOver but have no score for the component. */
  readonly excludedPassedOver: number;
}

/** MOD-05's record-only lineage (R-41, IR-90): every candidate and every commitment, by height. */
export interface PartitionLineage {
  candidatesAsOf(at: RecordHeight): readonly LineageCandidate[];
  commitmentsAsOf(at: RecordHeight): readonly AcceptingCommitment[];
}
/** MOD-06's samples and their closure (OBJ-19, R-53). MOD-09 never re-decides closure (AE-6). */
export interface ClosedSampleReads {
  samplesFor(unit: Unit, currency: Currency, at: RecordHeight): readonly SampleValue[] | UnknownValue;
}
/** MOD-05's draw contexts: each records the declaration in force at its draw (SEAM-10). */
export interface DrawTimeReads {
  drawsAsOf(unit: Unit, at: RecordHeight): readonly DrawContext[];
}
/** MOD-03's levels, and the declaration in force at a height. */
export interface LevelReads {
  levels(): readonly string[];
  declarationAt(unit: Unit, at: RecordHeight): Declaration | UnknownValue;
}
/** MOD-12's invalidated commitments as of a height, by height, scopes included (S-07, R-43). */
export interface InvalidationReads {
  invalidatedAsOf(at: RecordHeight): readonly RecordHeight[];
}
/** MOD-07's observation in force for a candidate (R-60). */
export interface ObservationReads {
  observationOf(candidate: Candidate, at: RecordHeight): Observation | UnknownValue;
}

export class PopulationPartition {
  readonly #lineage: PartitionLineage;
  readonly #samples: ClosedSampleReads;
  readonly #draws: DrawTimeReads;
  readonly #declarations: LevelReads;
  readonly #invalidations: InvalidationReads;
  readonly #observations: ObservationReads;

  constructor({
    lineage,
    samples,
    draws,
    declarations,
    invalidations,
    observations,
  }: {
    readonly lineage: PartitionLineage;
    readonly samples: ClosedSampleReads;
    readonly draws: DrawTimeReads;
    readonly declarations: LevelReads;
    readonly invalidations: InvalidationReads;
    readonly observations: ObservationReads;
  }) {
    // OS-1: every object input is a declared slot - the operations called on it are named and checked here.
    const slot = (name: string, value: object | undefined | null, operations: readonly string[]): void => {
      if (value === undefined || value === null) throw new TypeError(`PopulationPartition requires ${name}`);
      for (const operation of operations) {
        if (typeof (value as Readonly<Record<string, unknown>>)[operation] !== "function") throw new TypeError(`${name} must offer ${operation}`);
      }
    };
    slot("lineage", lineage, ["candidatesAsOf", "commitmentsAsOf"]);
    slot("samples", samples, ["samplesFor"]);
    slot("draws", draws, ["drawsAsOf"]);
    slot("declarations", declarations, ["levels", "declarationAt"]);
    slot("invalidations", invalidations, ["invalidatedAsOf"]);
    slot("observations", observations, ["observationOf"]);
    this.#lineage = lineage;
    this.#samples = samples;
    this.#draws = draws;
    this.#declarations = declarations;
    this.#invalidations = invalidations;
    this.#observations = observations;
    Object.freeze(this);
  }

  /** OBJ-23 at one level, for one component: a Projection, joined through the kernel. */
  of(level: string, component: string): Projection<Populations | UnknownValue> {
    // R-35: joined through the kernel, by name. Computed per read; nothing is kept (PC-04).
    return asProjection("PopulationPartition", (at: RecordHeight) => this.#partition(level, component, at));
  }

  #partition(level: string, component: string, at: RecordHeight): Populations | UnknownValue {
    if (!this.#declarations.levels().includes(level)) return refuse("level-not-configured");
    const invalidated = new Set(this.#invalidations.invalidatedAsOf(at));
    const accepted = new Set(this.#lineage.commitmentsAsOf(at).filter((k) => !invalidated.has(k.at)).map((k) => k.candidate));
    const sides = { accepted: [] as Member[], passedOver: [] as Member[], excludedAccepted: 0, excludedPassedOver: 0 };
    for (const [unit, currency] of this.#drawnIn(at)) {
      const samples = this.#samples.samplesFor(unit, currency, at);
      if (isUnknown(samples)) return samples;
      for (const sample of samples) {
        if (sample.closure.kind === "open") continue;
        for (const candidate of sample.members) {
          const drawnAt = this.#levelAtDraw(candidate, at);
          if (isUnknown(drawnAt)) return drawnAt;
          if (drawnAt !== level) continue;
          const score = this.#scoreOf(candidate, component, at);
          if (isUnknown(score)) return score;
          const isAccepted = accepted.has(candidate.at);
          if (score === "excluded") {
            if (isAccepted) sides.excludedAccepted += 1;
            else sides.excludedPassedOver += 1;
          } else (isAccepted ? sides.accepted : sides.passedOver).push(Object.freeze({ candidate, score }));
        }
      }
    }
    const byHeight = (members: readonly Member[]) => Object.freeze([...members].sort((x, y) => compare(x.candidate.at, y.candidate.at)));
    return Object.freeze({ level, component, ...sides, accepted: byHeight(sides.accepted), passedOver: byHeight(sides.passedOver) });
  }

  /** Every (unit, currency) a candidate has been drawn in, as of `at`, in first-draw order. */
  #drawnIn(at: RecordHeight): readonly (readonly [Unit, Currency])[] {
    const seen = new Map<string, readonly [Unit, Currency]>();
    for (const c of this.#lineage.candidatesAsOf(at)) seen.set(JSON.stringify([c.unit, c.currency]), [c.unit, c.currency]);
    return [...seen.values()];
  }

  /** SEAM-10: the level of the declaration its draw context recorded - by that declaration's height, never the current one. */
  #levelAtDraw(candidate: Candidate, at: RecordHeight): string | UnknownValue {
    const context = this.#draws.drawsAsOf(candidate.payload.unit, at).find((d) => d.at === candidate.payload.context);
    if (context === undefined) return uncomputable("draw-context");
    const declaration = this.#declarations.declarationAt(candidate.payload.unit, context.payload.declaration);
    if (isUnknown(declaration) || declaration.at !== context.payload.declaration) return uncomputable("draw-time-declaration");
    return declaration.payload.level;
  }

  /** The member's score for `component`, or "excluded" when it has none (unobserved or ABSENT, R-70). Any other Unknown is the answer. */
  #scoreOf(candidate: Candidate, component: string, at: RecordHeight): Score | "excluded" | UnknownValue {
    const observation = this.#observations.observationOf(candidate, at);
    if (isUnknown(observation)) return observation.kind === "no-subject" ? "excluded" : observation;
    const value = componentOf(observation, component);
    return isUnknown(value) || isAbsent(value) ? "excluded" : value;
  }
}
