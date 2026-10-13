/**
 * The golden-vector harness (R-36). rederive.py runs it as the declared `rederive_invoke`:
 *
 *     node --import tsx tools/vectors/run.ts {vector_id} {entry} {input_file}
 *
 * Each vector has a handler that names the ONE implementing file it derives from. A run handed a
 * different `{entry}` refuses (exit 2): impl_sha pins `{entry}`, so the file pinned and the file
 * that computes must be the same. The handler reads the encoded input, builds its fixture record,
 * calls the REAL implementation, and prints only the encoded output. Nothing here decides a
 * value: the vector is computed, never written by hand (CC-5).
 *
 * It lives in tools/ because reading the input names an external (node:fs), which REF-02 allows
 * only outside src/ (outside ports/) - the reason R-36 exists. For the same reason it is where
 * OBJ-39 is BOUND for a vector: the system chooses no digest, and a vector names the one it used.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { height, isUnknown, type RecordHeight } from "../../src/kernel/index.js";
import type { RecordPort } from "../../src/ports/index.js";
import { CurrencyOrder, DeclarationLedger, IndependenceLedger, type Currency, type Unit } from "../../src/catalog/index.js";
import { BOTTOM, CandidateLedger, CommitmentLedger, DrawContextLog, LineageReader, type Candidate, type Commitment } from "../../src/facts/index.js";
import { Reachability, ReachabilityGate } from "../../src/reachability/index.js";
import { InvalidationLedger, InvalidationScope, SignatureGate, type SignatureMaterial } from "../../src/lineage/index.js";
import { ObservationLedger, dischargeable, score, type ComponentEntry } from "../../src/observation/index.js";
import { RevisionLog, Samples, type ConditionIdentity } from "../../src/condition/index.js";
import { spread } from "../../src/statistics/index.js";
import { AE5_OPEN, Bar, PopulationPartition, type Populations, type SeparationRule } from "../../src/calibration/index.js";

/** A record for a fixture: append-only, read as of a height (IR-31). */
function fixtureRecord(): RecordPort<unknown, RecordHeight> {
  const facts: unknown[] = [];
  return {
    append: (fact: unknown): RecordHeight => {
      facts.push(fact);
      return height(facts.length);
    },
    readAsOf: (at: RecordHeight): readonly unknown[] => facts.slice(0, at),
  };
}

type Handler = { readonly entry: string; readonly run: (input: string) => string };

/** One act of a calibration fixture. A draw with no `scores` is never observed. */
type Act =
  | { readonly act: "declare"; readonly unit: string; readonly level: string }
  | { readonly act: "draw"; readonly unit: string; readonly currency: string; readonly condition: string; readonly name: string; readonly scores?: Readonly<Record<string, number | "ABSENT">> }
  | { readonly act: "commit"; readonly candidate: string; readonly name: string }
  | { readonly act: "revise"; readonly unit: string; readonly currency: string; readonly condition: string }
  | { readonly act: "invalidate"; readonly commitment: string }
  | { readonly act: "mark"; readonly name: string };

/** A calibration fixture: the configuration, then the acts, in record order. */
interface Script {
  readonly levels: readonly string[];
  readonly components: readonly string[];
  readonly currencies: readonly string[];
  readonly acts: readonly Act[];
}

/**
 * Runs a calibration fixture (VEC-02, VEC-06, VEC-07) through the REAL ledgers on one record:
 * declarations, draws, candidates (`from` is BOTTOM, licensed, at the least currency, else the
 * commitment in force below), observations, commitments, revisions, and invalidations derived
 * and displayed before they are appended (R-47). A `mark` names the height at that point - no
 * fact is appended for it. The setup deciders always admit, verify and stay within the ceiling,
 * as the test world's do: they are setup, never the vector's subject.
 */
function calibrationFixture(script: Script) {
  const facts: unknown[] = [];
  const record: RecordPort<unknown, RecordHeight> = {
    append: (fact: unknown): RecordHeight => {
      facts.push(fact);
      return height(facts.length);
    },
    readAsOf: (at: RecordHeight): readonly unknown[] => facts.slice(0, at),
  };
  const tick = (): RecordHeight => record.append({ kind: "fixture-height" });
  const broken = (what: string, x: { readonly kind: string }) => new Error(`calibration fixture: ${what} answered ${x.kind}`);
  const order = new CurrencyOrder({ currencies: [...script.currencies] });
  const declarations = new DeclarationLedger({ record, levels: [...script.levels] });
  const independence = new IndependenceLedger({ record });
  const draws = new DrawContextLog({ record, declarations });
  const lineage = new LineageReader({ record });
  const invalidations = new InvalidationLedger({ record, scopes: new InvalidationScope({ lineage }), renderer: { present: () => undefined } });
  const commitments = new CommitmentLedger({ record, invalidations });
  const candidates = new CandidateLedger({
    record,
    commitments,
    currencies: order,
    independence,
    admission: { admit: () => "ADMIT" },
    signatures: { check: () => "VERIFIED" },
    ceiling: { admitsDraw: () => "WITHIN" },
  });
  const revisions = new RevisionLog({ record });
  const samples = new Samples({ candidates, draws, revisions, lineage });
  const observations = new ObservationLedger({ record, components: [...script.components] });
  const partition = new PopulationPartition({ lineage, samples, draws, declarations, invalidations, observations });
  const drawn = new Map<string, Candidate>();
  const committed = new Map<string, Commitment>();
  const marks = new Map<string, RecordHeight>();
  const named = <T>(map: ReadonlyMap<string, T>, name: string): T => {
    const x = map.get(name);
    if (x === undefined) throw new Error(`calibration fixture: nothing is named ${name}`);
    return x;
  };
  for (const act of script.acts) {
    if (act.act === "declare") {
      const d = declarations.declare(act.unit as Unit, act.level, "HUMAN");
      if (isUnknown(d)) throw broken("declare", d);
    } else if (act.act === "draw") {
      const unit = act.unit as Unit;
      const currency = act.currency as Currency;
      const below = order.predecessors(currency);
      if (isUnknown(below)) throw broken("the currency", below);
      const immediate = below.at(-1);
      let from: Commitment | typeof BOTTOM = BOTTOM;
      if (immediate === undefined) {
        const license = independence.independenceAt(unit, tick());
        if (isUnknown(license) || !license.payload.independent) independence.declareIndependence(unit, true, "HUMAN");
      } else {
        const k = commitments.effectiveCommitment(unit, immediate, tick());
        if (isUnknown(k)) throw broken("the commitment below", k);
        from = k;
      }
      const h = tick();
      const context = draws.recordDraw(unit, {}, h, act.condition, h, "ENGINE");
      if (isUnknown(context)) throw broken("the draw", context);
      const k = candidates.appendCandidate({ context, unit, currency, condition: act.condition, seed: act.name, from }, "fixture", tick(), "ENGINE");
      if (isUnknown(k)) throw broken("the candidate", k);
      drawn.set(act.name, k);
      if (act.scores !== undefined) {
        const values: Record<string, ComponentEntry> = {};
        for (const [name, x] of Object.entries(act.scores)) {
          const v = x === "ABSENT" ? dischargeable("a later look") : score(x);
          if (isUnknown(v)) throw broken(`the score ${String(x)}`, v);
          values[name] = { value: v, author: "ENGINE" };
        }
        const o = observations.observe(k, values, "ENGINE", tick());
        if (isUnknown(o)) throw broken("the observation", o);
      }
    } else if (act.act === "commit") {
      committed.set(act.name, commitments.commit(named(drawn, act.candidate), "HUMAN"));
    } else if (act.act === "revise") {
      revisions.revise(act.unit as Unit, act.currency as Currency, act.condition as ConditionIdentity, "HUMAN");
    } else if (act.act === "invalidate") {
      const h = height(facts.length);
      const invalidation = invalidations.invalidate(invalidations.display(named(committed, act.commitment), h), "HUMAN", h);
      if (isUnknown(invalidation)) throw broken("the invalidation", invalidation);
    } else {
      marks.set(act.name, height(facts.length));
    }
  }
  return { partition, at: (mark: string): RecordHeight => named(marks, mark), candidate: (name: string): Candidate => named(drawn, name) };
}

/** OBJ-23 at a height, or the fixture is broken. */
const populationsAt = (fixture: ReturnType<typeof calibrationFixture>, level: string, component: string, at: RecordHeight): Populations => {
  const p = fixture.partition.of(level, component).compute(at);
  if (isUnknown(p)) throw new Error(`calibration fixture: the partition answered ${p.kind}`);
  return p;
};

const HANDLERS: Readonly<Record<string, Handler>> = {
  /** VEC-01 (MOD-04): the reachability truth table over a three-currency order. */
  "VEC-01": {
    entry: "src/reachability/reachability.ts",
    run: (input) => {
      const spec = JSON.parse(input) as {
        readonly currencies: readonly string[];
        readonly commitmentSets: readonly (readonly string[])[];
        readonly requested: readonly string[];
      };
      const order = new CurrencyOrder({ currencies: [...spec.currencies] });
      const unit = "u" as Unit;
      const table: Record<string, Record<string, string>> = {};
      for (const set of spec.commitmentSets) {
        const row: Record<string, string> = {};
        for (const requested of spec.requested) {
          const record = fixtureRecord();
          const commitments = new CommitmentLedger({ record, invalidations: { isInvalidated: () => false } });
          // R-41: each commitment in the cell's set accepts a real candidate, drawn in cost order -
          // BOTTOM (licensed) at the least currency, then the commitment below.
          const declarations = new DeclarationLedger({ record, levels: ["fixture"] });
          const independence = new IndependenceLedger({ record });
          const draws = new DrawContextLog({ record, declarations });
          const setup = new CandidateLedger({
            record,
            commitments,
            currencies: order,
            independence,
            admission: { admit: () => "ADMIT" },
            signatures: { check: () => "VERIFIED" },
            ceiling: { admitsDraw: () => "WITHIN" },
          });
          declarations.declare(unit, "fixture", "HUMAN");
          independence.declareIndependence(unit, true, "HUMAN");
          let below: Commitment | typeof BOTTOM = BOTTOM;
          for (const c of set) {
            const h = record.append({ kind: "fixture-height" });
            const context = draws.recordDraw(unit, {}, h, "fixture", h, "ENGINE");
            if (isUnknown(context)) throw new Error(`VEC-01 fixture: draw refused (${context.kind})`);
            const candidate = setup.appendCandidate({ context, unit, currency: c as Currency, condition: "fixture", seed: "fixture", from: below }, "fixture", record.append({ kind: "fixture-height" }), "ENGINE");
            if (isUnknown(candidate)) throw new Error(`VEC-01 fixture: candidate refused (${candidate.kind})`);
            below = commitments.commit(candidate, "HUMAN");
          }
          const gate = new ReachabilityGate({ reachability: new Reachability({ currencies: order, commitments }) });
          const at = record.append({ kind: "fixture-height" });
          const answer = gate.admit(unit, requested as Currency, at);
          row[requested] = isUnknown(answer) ? (answer.kind === "refuse" ? `Refuse(${answer.guard})` : answer.kind) : answer;
        }
        table[`{${set.join(",")}}`] = row;
      }
      return JSON.stringify(table);
    },
  },
  /**
   * VEC-03 (MOD-08): one fixed score set read at nested cardinalities. Below the floor the row
   * carries the unknown's token and NO number; at or above it, the statistic's value at full
   * emitted precision. The statistic's identity rides in the input (R-63).
   */
  "VEC-03": {
    entry: "src/statistics/scores.ts",
    run: (input) => {
      const spec = JSON.parse(input) as { readonly statistic: string; readonly scores: readonly number[]; readonly cardinalities: readonly number[] };
      if (spec.statistic !== "sample-sd") throw new Error(`VEC-03: no statistic '${spec.statistic}' (R-63)`);
      const scores = spec.scores.map((n) => {
        const v = score(n);
        if (isUnknown(v)) throw new Error(`VEC-03 fixture: ${n} is not a Score`);
        return v;
      });
      return JSON.stringify(
        spec.cardinalities.map((n) => {
          const r = spread(scores.slice(0, n));
          return { n, scores: spec.scores.slice(0, n), expect: isUnknown(r) ? (r.kind === "undetermined" ? `UNDETERMINED(${r.ae})` : r.kind) : r };
        }),
      );
    },
  },
  /**
   * VEC-02 (MOD-09): the bar at one level across population states, each read at a pinned
   * height of one fixture. Every row carries both exclusion counts, and whether the separation
   * rule was consulted - through the rule the build ships, the AE-5 stand-in (R-69). Row 4 (both
   * populated and separated) is not computed: it needs AE-5's rule.
   */
  "VEC-02": {
    entry: "src/calibration/bar.ts",
    run: (input) => {
      const spec = JSON.parse(input) as Script & { readonly level: string; readonly component: string; readonly rows: readonly { readonly state: string; readonly at: string }[] };
      const fixture = calibrationFixture(spec);
      let consulted = 0;
      const rule: SeparationRule = {
        separate: (accepted, passedOver) => {
          consulted += 1;
          return AE5_OPEN.separate(accepted, passedOver);
        },
      };
      const bar = new Bar({ populations: fixture.partition, separation: rule });
      return JSON.stringify(
        spec.rows.map((row) => {
          consulted = 0;
          const v = bar.of(spec.level, spec.component).compute(fixture.at(row.at));
          if (isUnknown(v)) throw new Error(`VEC-02: the bar answered ${v.kind}`);
          const answer = v.kind === "bar" ? { theta: v.theta, sample_size: v.sampleSize } : { cause: v.cause, discharge: v.discharge };
          return {
            state: row.state,
            kind: v.kind,
            ...answer,
            accepted: v.acceptedCount,
            passed_over: v.passedOverCount,
            excluded_accepted: v.excludedAccepted,
            excluded_passed_over: v.excludedPassedOver,
            separation_invoked: consulted > 0,
          };
        }),
      );
    },
  },
  /**
   * VEC-06 (MOD-09 with MOD-12): the partition immediately before and immediately after one
   * invalidation append. Each snapshot is computed from the record at its own height - never by
   * diffing the other - so the moved candidate is found, not applied.
   */
  "VEC-06": {
    entry: "src/calibration/population-partition.ts",
    run: (input) => {
      const spec = JSON.parse(input) as Script & { readonly level: string; readonly component: string; readonly moved: string; readonly snapshots: readonly { readonly label: string; readonly at: string }[] };
      const fixture = calibrationFixture(spec);
      return JSON.stringify({
        moved: fixture.candidate(spec.moved).at,
        snapshots: spec.snapshots.map(({ label, at }) => {
          const p = populationsAt(fixture, spec.level, spec.component, fixture.at(at));
          return {
            label,
            at: fixture.at(at),
            accepted: p.accepted.map((m) => m.candidate.at),
            passed_over: p.passedOver.map((m) => m.candidate.at),
            excluded_accepted: p.excludedAccepted,
            excluded_passed_over: p.excludedPassedOver,
            union: p.accepted.length + p.passedOver.length,
          };
        }),
      });
    },
  },
  /**
   * VEC-07 (MOD-09): the four population figures for a fixture with unobserved and ABSENT
   * members on both sides, and for an all-observed control, each at its pinned height.
   */
  "VEC-07": {
    entry: "src/calibration/population-partition.ts",
    run: (input) => {
      const spec = JSON.parse(input) as { readonly fixtures: readonly (Script & { readonly name: string; readonly level: string; readonly component: string; readonly at: string })[] };
      return JSON.stringify(
        spec.fixtures.map((f) => {
          const fixture = calibrationFixture(f);
          const p = populationsAt(fixture, f.level, f.component, fixture.at(f.at));
          return { fixture: f.name, accepted: p.accepted.length, passed_over: p.passedOver.length, excluded_accepted: p.excludedAccepted, excluded_passed_over: p.excludedPassedOver };
        }),
      );
    },
  },
  /**
   * VEC-05 (MOD-12): one candidate's material, held fixed, signed WITH the digest of the
   * commitment it derives from and WITHOUT it. The "without" form cannot be emitted (REF-04: the
   * material requires its lineage), so it is constructed here, as an artefact, from the same
   * material with the lineage removed. The digest is bound from the input's identifier (IR-06).
   */
  "VEC-05": {
    entry: "src/lineage/signature-gate.ts",
    run: (input) => {
      const spec = JSON.parse(input) as { readonly digest: string; readonly currencies: readonly string[]; readonly condition: string; readonly seed: string };
      if (spec.digest !== "sha256-hex") throw new Error(`VEC-05: no binding for the digest '${spec.digest}'`);
      const gate = new SignatureGate({ digests: { digest: (bytes) => createHash("sha256").update(bytes).digest("hex") } });
      const record = fixtureRecord();
      const order = new CurrencyOrder({ currencies: [...spec.currencies] });
      const [least, next] = order.currencies() as readonly [Currency, Currency];
      const unit = "u" as Unit;
      const commitments = new CommitmentLedger({ record, invalidations: { isInvalidated: () => false } });
      const declarations = new DeclarationLedger({ record, levels: ["fixture"] });
      const independence = new IndependenceLedger({ record });
      const draws = new DrawContextLog({ record, declarations });
      const setup = new CandidateLedger({
        record,
        commitments,
        currencies: order,
        independence,
        admission: { admit: () => "ADMIT" },
        signatures: gate,
        ceiling: { admitsDraw: () => "WITHIN" },
      });
      declarations.declare(unit, "fixture", "HUMAN");
      independence.declareIndependence(unit, true, "HUMAN");
      const drawn = (at: RecordHeight) => {
        const context = draws.recordDraw(unit, {}, at, spec.condition, at, "ENGINE");
        if (isUnknown(context)) throw new Error(`VEC-05 fixture: draw refused (${context.kind})`);
        return context;
      };
      // The commitment the candidate derives from: u at the least currency, from BOTTOM.
      const h0 = record.append({ kind: "fixture-height" });
      const first = { context: drawn(h0), unit, currency: least, condition: spec.condition, seed: spec.seed, from: BOTTOM };
      const accepted = setup.appendCandidate(first, gate.sign(gate.materialOf(first)), record.append({ kind: "fixture-height" }), "ENGINE");
      if (isUnknown(accepted)) throw new Error(`VEC-05 fixture: candidate refused (${accepted.kind})`);
      const k: Commitment = commitments.commit(accepted, "HUMAN");
      // The candidate whose signature the vector pins: at the next currency, from k.
      const h1 = record.append({ kind: "fixture-height" });
      const material = gate.materialOf({ context: drawn(h1), unit, currency: next, condition: spec.condition, seed: spec.seed, from: k });
      const { lineage, ...without } = material;
      void lineage;
      return JSON.stringify({ digest: spec.digest, with: gate.sign(material), without: gate.sign(without as unknown as SignatureMaterial) });
    },
  },
};

const [vectorId, entry, inputFile] = process.argv.slice(2);
const handler = vectorId === undefined ? undefined : HANDLERS[vectorId];
if (handler === undefined || entry === undefined || inputFile === undefined) {
  process.stderr.write(`run.ts: no handler for ${String(vectorId)} (usage: run.ts <VEC-ID> <entry> <input_file>)\n`);
  process.exit(2);
}
if (resolve(entry) !== resolve(handler.entry)) {
  process.stderr.write(`run.ts: ${vectorId} derives from ${handler.entry}, but was handed ${entry}; impl_sha would pin the wrong file\n`);
  process.exit(2);
}
process.stdout.write(handler.run(readFileSync(inputFile, "utf8")));
