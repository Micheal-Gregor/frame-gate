/**
 * MOD-09 `calibration/` (BC-09-1..BC-09-9). Written before the module and watched failing (R-50).
 * Every population is assembled from the real record: candidates drawn through MOD-05, sampled by
 * MOD-06, observed through MOD-07, invalidated through MOD-12.
 */
import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isUnknown, refuse, uncomputable, type RecordHeight } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import { LineageReader, type Candidate, type Commitment } from "../../src/facts/index.js";
import { RevisionLog, Samples, type ConditionIdentity } from "../../src/condition/index.js";
import { ObservationLedger, dischargeable, score, type ComponentValue, type Score } from "../../src/observation/index.js";
import { InvalidationLedger, InvalidationScope } from "../../src/lineage/index.js";
import { AE5_OPEN, Bar, PopulationPartition, type BarValue, type Populations, type SeparationRule, type Threshold } from "../../src/calibration/index.js";
import { inMemoryRecord } from "../catalog/in-memory-record.js";
import { factWorld } from "../support/fact-world.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const u = "u1" as Unit;
const v = "u2" as Unit;
const w3 = "u3" as Unit;
const ELSEWHERE = "elsewhere" as ConditionIdentity;
const s = (n: number): Score => {
  const x = score(n);
  if (isUnknown(x)) throw new Error("setup");
  return x;
};

/** A rule that derives a boundary from the populations: the midpoint of the gap, when there is one. Test-only; NOT AE-5's answer. */
const midpoint: SeparationRule = {
  separate: (accepted, passedOver) => {
    const low = Math.min(...accepted);
    const high = Math.max(...passedOver);
    return low > high ? { kind: "separated", theta: (low + high) / 2 } : { kind: "no-bar", cause: "overlap", discharge: "populations that separate" };
  },
};
/** `rule`, recording every consultation. */
const recording = (rule: SeparationRule) => {
  const calls: (readonly [readonly number[], readonly number[]])[] = [];
  const recorder: SeparationRule = {
    separate: (accepted, passedOver) => {
      calls.push([[...accepted], [...passedOver]]);
      return rule.separate(accepted, passedOver);
    },
  };
  return { calls, rule: recorder };
};

/** A member's q-score: a number, ABSENT (r is still scored), or no observation at all. */
type Entry = number | "absent" | "unobserved";

function world() {
  const record = inMemoryRecord();
  const lineage = new LineageReader({ record });
  const invalidations = new InvalidationLedger({ record, scopes: new InvalidationScope({ lineage }), renderer: { present: () => undefined } });
  const w = factWorld({ currencies: ["c0", "c1"], invalidations, record });
  const [c0, c1] = w.order.currencies() as readonly [Currency, Currency];
  const revisions = new RevisionLog({ record });
  const samples = new Samples({ candidates: w.candidates, draws: w.draws, revisions, lineage });
  const observations = new ObservationLedger({ record, components: ["q", "r"] });
  const parts = { lineage, samples, draws: w.draws, declarations: w.declarations, invalidations, observations };
  const partition = new PopulationPartition(parts);
  const bar = new Bar({ populations: partition, separation: AE5_OPEN });
  const value = (x: number | "absent"): ComponentValue => (x === "absent" ? dischargeable("a later look") : s(x));
  let rounds = 0;
  /** One sample: a draw per entry under a fresh condition, observed with q = the entry and r = 0.5, or not observed. */
  const round = (unit: Unit, currency: Currency, entries: readonly Entry[]): Candidate[] => {
    rounds += 1;
    const condition = `round-${rounds}`;
    return entries.map((e) => {
      const k = w.drawAt(unit, currency, condition);
      if (e !== "unobserved") {
        const o = observations.observe(k, { q: { value: value(e), author: "ENGINE" }, r: { value: s(0.5), author: "ENGINE" } }, "ENGINE", record.noise());
        if (isUnknown(o)) throw new Error(`setup: observe answered ${o.kind}`);
      }
      return k;
    });
  };
  const commit = (k: Candidate): Commitment => w.commitments.commit(k, "HUMAN");
  /** Display `k`'s scope now, then invalidate it now (R-47, R-48). */
  const invalidate = (k: Commitment): void => {
    const h = record.noise();
    const inv = invalidations.invalidate(invalidations.display(k, h), "HUMAN", h);
    if (isUnknown(inv)) throw new Error(`setup: the invalidation answered ${inv.kind}`);
  };
  const pops = (level = "easy", component = "q", at: RecordHeight = record.noise()): Populations => {
    const p = partition.of(level, component).compute(at);
    if (isUnknown(p)) throw new Error(`the partition answered ${p.kind}`);
    return p;
  };
  const barOf = (b: Bar = bar, level = "easy", component = "q", at: RecordHeight = record.noise()) => b.of(level, component).compute(at);
  return { ...w, c0, c1, revisions, parts, partition, bar, round, commit, invalidate, pops, barOf };
}
const heights = (members: Populations["accepted"]) => members.map((m) => m.candidate.at);
const figures = (p: Populations) => [p.accepted.length, p.passedOver.length, p.excludedAccepted, p.excludedPassedOver];

describe("BC-09-1 - REF-11: an empty population is no-bar, on the population branch", () => {
  it("test_bar_with_empty_population_returns_bottom", () => {
    const w = world();
    const spy = recording(midpoint);
    const b = new Bar({ populations: w.partition, separation: spy.rule });
    const both = w.barOf(b);
    expect(both).toMatchObject({ kind: "no-bar", cause: "both-empty", acceptedCount: 0, passedOverCount: 0, excludedAccepted: 0, excludedPassedOver: 0 });
    // Accepted alone: a sample of one, committed.
    const [a] = w.round(u, w.c0, [0.9]) as [Candidate];
    w.commit(a);
    const acceptedOnly = w.barOf(b);
    expect(acceptedOnly).toMatchObject({ kind: "no-bar", cause: "passed-over-empty", acceptedCount: 1, passedOverCount: 0 });
    // PassedOver alone, at the other level: a sample closed by a revision, nothing committed.
    w.declarations.declare(v, "hard", "HUMAN");
    w.round(v, w.c0, [0.2, 0.3]);
    w.revisions.revise(v, w.c0, ELSEWHERE, "HUMAN");
    const passedOnly = w.barOf(b, "hard");
    expect(passedOnly).toMatchObject({ kind: "no-bar", cause: "accepted-empty", acceptedCount: 0, passedOverCount: 2 });
    for (const x of [both, acceptedOnly, passedOnly]) {
      if (isUnknown(x) || x.kind !== "no-bar") throw new Error("expected no-bar");
      expect(x.discharge.length, "no-bar without a discharge condition").toBeGreaterThan(0);
      expect("theta" in x || "sampleSize" in x, "a number on the population branch").toBe(false);
    }
    expect(spy.calls, "the separation rule was consulted on the population branch").toEqual([]);
  });
});

describe("BC-09-2 - R-69 / AE-5: the injected rule decides separation; the stand-in separates nothing", () => {
  it("test_the_injected_rule_decides_separation", () => {
    const w = world();
    const [a, p1] = w.round(u, w.c0, [0.9, 0.3, 0.4]) as [Candidate, Candidate];
    w.commit(a);
    expect(w.barOf()).toEqual({ kind: "no-bar", cause: "AE-5 open", discharge: "the owner rules the separation rule", acceptedCount: 1, passedOverCount: 2, excludedAccepted: 0, excludedPassedOver: 0 });
    const spy = recording(midpoint);
    const separated = w.barOf(new Bar({ populations: w.partition, separation: spy.rule }));
    expect(spy.calls, "not consulted exactly once, with each population's scores").toEqual([[[0.9], [0.3, 0.4]]]);
    expect(separated).toEqual({ kind: "bar", theta: (0.9 + 0.4) / 2, sampleSize: 3, acceptedCount: 1, passedOverCount: 2, excludedAccepted: 0, excludedPassedOver: 0 });
    // The rule's own no-bar is the answer, with the rule's cause: the bar invents none.
    w.commit(p1);
    expect(w.barOf(new Bar({ populations: w.partition, separation: midpoint }))).toMatchObject({ kind: "no-bar", cause: "overlap", discharge: "populations that separate", acceptedCount: 2, passedOverCount: 1 });
  });
});

describe("BC-09-3 - REF-12 / HOOK-03: no threshold is data", () => {
  it("test_threshold_assignment_is_malformed", () => {
    const w = world();
    const [a] = w.round(u, w.c0, [0.9, 0.2]) as [Candidate];
    w.commit(a);
    const value = w.barOf(new Bar({ populations: w.partition, separation: midpoint }));
    if (isUnknown(value) || value.kind !== "bar") throw new Error("expected a bar");
    // The positive case: θ read from the bar is a Threshold.
    const fromBar: Threshold = value.theta;
    expect(fromBar).toBeCloseTo(0.55, 15);
    // At parse, each of these is malformed: a literal, a default, a coalesced fallback, a
    // threshold handed to the bar, a threshold configured at construction.
    const atParse = (): void => {
      // @ts-expect-error - a literal in a threshold position
      const literal: Threshold = 0.85;
      // @ts-expect-error - a defaulted threshold parameter
      const defaulted = (theta: Threshold = 0.85): Threshold => theta;
      // @ts-expect-error - a coalesced fallback is a number, not a threshold
      const coalesced: Threshold = (value.kind === "bar" ? value.theta : undefined) ?? 0.85;
      // @ts-expect-error - a threshold handed to the bar
      w.bar.of("easy", "q", 0.85);
      // @ts-expect-error - a threshold configured at construction
      new Bar({ populations: w.partition, separation: AE5_OPEN, threshold: 0.85 });
      void [literal, defaulted, coalesced];
    };
    void atParse;
    // No setter: Bar's prototype offers `of` and nothing else (read off the class, not listed).
    expect(Object.getOwnPropertyNames(Bar.prototype).filter((n) => n !== "constructor"), "Bar offers an operation besides of").toEqual(["of"]);
    // A Threshold minted by assertion outside MOD-09 is flagged (the mint rule, BRANDS).
    const mint = (
      JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as {
        mint: { src: unknown[]; fixtures: Record<string, { how: string }[]> };
      }
    ).mint;
    expect(mint.src, "a ledger brand is minted outside its owner in src/").toEqual([]);
    expect(mint.fixtures["tests/fixtures/catalog-mint/mint-threshold.ts"]?.map((x) => x.how), "a configured threshold passed as θ").toEqual(["assertion"]);
  });
});

describe("BC-09-4 - REF-13 / X21: an invalidated commitment's candidate moves to PassedOver", () => {
  it("test_invalidated_commitment_moves_to_passed_over", () => {
    const w = world();
    const [a, b] = w.round(u, w.c0, [0.9, 0.3]) as [Candidate, Candidate];
    const k = w.commit(a);
    // Downstream: u's c1 sample derives from k, so the commitment accepting c is in k's scope (R-43).
    const [c, d] = w.round(u, w.c1, [0.8, 0.1]) as [Candidate, Candidate];
    w.commit(c);
    const before = w.pops();
    expect([heights(before.accepted), heights(before.passedOver)], "without an invalidation").toEqual([
      [a.at, c.at],
      [b.at, d.at],
    ]);
    w.invalidate(k);
    const after = w.pops();
    expect(heights(after.accepted), "an invalidated commitment's candidate stayed in Accepted").toEqual([]);
    expect(heights(after.passedOver)).toEqual([a.at, b.at, c.at, d.at]);
    // Only the partition moved: the union is the same members with the same scores.
    const union = (p: Populations) => [...p.accepted, ...p.passedOver].map((m) => [m.candidate.at, m.score]).sort((x, y) => Number(x[0]) - Number(y[0]));
    expect(union(after)).toEqual(union(before));
  });
});

describe("BC-09-5 - REF-14 / HOOK-08: exclusions are counted on both sides, on every return", () => {
  it("test_exclusion_counts_present_on_both_populations", () => {
    const w = world();
    // All scored: both counts zero.
    const [a] = w.round(u, w.c0, [0.9, 0.2]) as [Candidate];
    w.commit(a);
    expect(figures(w.pops())).toEqual([1, 1, 0, 0]);
    // Unobserved and ABSENT members on both sides (SEAM-09, R-70).
    const [x] = w.round(u, w.c0, ["unobserved", 0.3, "absent"]) as [Candidate];
    w.commit(x);
    const [y] = w.round(u, w.c0, ["absent", "unobserved", "unobserved"]) as [Candidate];
    w.commit(y);
    expect(figures(w.pops()), "q: an exclusion went uncounted, or counted on the wrong side").toEqual([1, 2, 2, 3]);
    // Per component: an ABSENT q is a scored r.
    expect(figures(w.pops("easy", "r")), "r").toEqual([2, 3, 1, 2]);
    // Both counts ride on every return: the separation branch, the threshold, the population branch.
    const counts = { excludedAccepted: 2, excludedPassedOver: 3 };
    expect(w.barOf()).toMatchObject({ kind: "no-bar", cause: "AE-5 open", acceptedCount: 1, passedOverCount: 2, ...counts });
    expect(w.barOf(new Bar({ populations: w.partition, separation: midpoint }))).toMatchObject({ kind: "bar", sampleSize: 3, ...counts });
    w.declarations.declare(v, "hard", "HUMAN");
    const [z] = w.round(v, w.c0, ["unobserved", "unobserved"]) as [Candidate];
    w.commit(z);
    expect(w.barOf(w.bar, "hard")).toMatchObject({ kind: "no-bar", cause: "both-empty", acceptedCount: 0, passedOverCount: 0, excludedAccepted: 1, excludedPassedOver: 1 });
    // At parse: a bar value missing either count is not a BarValue.
    const atParse = (): void => {
      // @ts-expect-error - no PassedOver exclusion count (HOOK-08)
      const missing: BarValue = { kind: "no-bar", cause: "c", discharge: "d", acceptedCount: 0, passedOverCount: 0, excludedAccepted: 0 };
      void missing;
    };
    void atParse;
  });
});

describe("BC-09-6 - SEAM-10: the declaration recorded at draw time; one bar per level", () => {
  it("test_membership_reads_the_declaration_recorded_at_draw_time", () => {
    const w = world();
    const [a, b] = w.round(u, w.c0, [0.9, 0.3]) as [Candidate, Candidate];
    w.commit(a);
    // A re-declaration is prospective: it moves no candidate drawn before it.
    w.declarations.declare(u, "hard", "HUMAN");
    const [c, d] = w.round(u, w.c0, [0.7, 0.1]) as [Candidate, Candidate];
    w.commit(c);
    const easy = w.pops("easy");
    const hard = w.pops("hard");
    expect([heights(easy.accepted), heights(easy.passedOver)], "easy").toEqual([[a.at], [b.at]]);
    expect([heights(hard.accepted), heights(hard.passedOver)], "hard").toEqual([[c.at], [d.at]]);
    expect(w.partition.of("medium", "q").compute(w.record.noise())).toEqual(refuse("level-not-configured"));
    expect(w.bar.of("medium", "q").compute(w.record.noise())).toEqual(refuse("level-not-configured"));
  });
});

describe("BC-09-7 - OBJ-23: Accepted, and PassedOver read from closed samples only", () => {
  it("test_passed_over_is_read_from_closed_samples", () => {
    const w = world();
    w.round(u, w.c0, [0.5, 0.6]); // open: in neither population
    expect(figures(w.pops()), "a member of an open sample joined a population").toEqual([0, 0, 0, 0]);
    // Closed by a revision, nothing committed: both passed over (SEAM-23).
    const [p, q] = w.round(v, w.c0, [0.4, 0.45]) as [Candidate, Candidate];
    w.revisions.revise(v, w.c0, ELSEWHERE, "HUMAN");
    // Closed by commitments at two currencies: pooled at the level (R-71).
    const [a] = w.round(w3, w.c0, [0.9]) as [Candidate];
    w.commit(a);
    const [c, d] = w.round(w3, w.c1, [0.8, 0.2]) as [Candidate, Candidate];
    w.commit(c);
    // A later sample of v: found with v's first sample, but read in candidate-height order.
    const [r] = w.round(v, w.c0, [0.35]) as [Candidate];
    w.commit(r);
    const pops = w.pops();
    expect(heights(pops.accepted), "the populations are not in candidate-height order").toEqual([a.at, c.at, r.at]);
    expect(heights(pops.passedOver)).toEqual([p.at, q.at, d.at]);
  });
});

describe("BC-09-8 - computed as of a height, never accumulated; unknowns propagate; one join each", () => {
  it("test_populations_are_computed_as_of_a_height", () => {
    const w = world();
    const [a, b] = w.round(u, w.c0, [0.9, 0.3]) as [Candidate, Candidate];
    const k = w.commit(a);
    const h = w.record.noise();
    w.invalidate(k);
    expect(heights(w.pops().accepted)).toEqual([]);
    const then = w.pops("easy", "q", h);
    expect([heights(then.accepted), heights(then.passedOver)], "an earlier height read a later invalidation").toEqual([[a.at], [b.at]]);
    // An observation source's Unknown other than NoSubject is the answer, never "unobserved".
    const broken = new PopulationPartition({ ...w.parts, observations: { observationOf: () => uncomputable("two-observations") } });
    expect(broken.of("easy", "q").compute(w.record.noise())).toEqual(uncomputable("two-observations"));
    expect(new Bar({ populations: broken, separation: AE5_OPEN }).of("easy", "q").compute(w.record.noise())).toEqual(uncomputable("two-observations"));
    // ... and a sample source's Unknown too.
    const mixed = new PopulationPartition({ ...w.parts, samples: { samplesFor: () => refuse("mixed-conditions") } });
    expect(mixed.of("easy", "q").compute(w.record.noise())).toEqual(refuse("mixed-conditions"));
    const joins = (JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/projection-joins.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as { joins: string[] }).joins;
    expect(joins.filter((j) => j.startsWith("Bar ") || j.startsWith("PopulationPartition "))).toEqual(["Bar src/calibration/bar.ts", "PopulationPartition src/calibration/population-partition.ts"]);
  });
});

describe("BC-09-9 - VEC-02 rows 1-3, VEC-06, VEC-07: computed from MOD-09 and re-derived (R-36)", () => {
  type Vector = { id: string; module: string; input: string; output: string; state: string; impl_sha: string; deferred_rows?: { row: number; discharge: string }[] };
  const load = (id: string): Vector => JSON.parse(readFileSync(resolve(repo, `vectors/${id}.json`), "utf8")) as Vector;
  /** Recomputed through the harness from the file impl_sha pins; the output must equal the vector's. */
  const rederive = (vec: Vector, entry: string): unknown => {
    const file = join(mkdtempSync(join(tmpdir(), `${vec.id.toLowerCase()}-`)), "in.json");
    writeFileSync(file, vec.input, "utf8");
    const r = spawnSync(process.execPath, ["--import", "tsx", "tools/vectors/run.ts", vec.id, entry, file], { cwd: repo, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual(JSON.parse(vec.output));
    expect(vec.impl_sha, `${vec.id} is pinned to another implementation`).toBe(createHash("sha256").update(readFileSync(resolve(repo, entry))).digest("hex"));
    return JSON.parse(r.stdout);
  };
  const isCount = (n: unknown) => Number.isInteger(n) && (n as number) >= 0;

  it("test_calibration_vectors_re_derive_from_mod_09", () => {
    // VEC-02: rows 1-3 computed; row 4 is carried deferred, with its discharge, while AE-5 is open (R-69).
    const v2 = load("VEC-02");
    expect([v2.state, v2.module, v2.deferred_rows?.map((x) => x.row)]).toEqual(["COMPUTED", "MOD-09 · Bar", [4]]);
    expect(v2.deferred_rows?.[0]?.discharge, "row 4 deferred without a discharge condition").toContain("AE-5");
    type Row2 = { state: string; kind: string; cause: string; accepted: number; passed_over: number; excluded_accepted: number; excluded_passed_over: number; separation_invoked: boolean };
    const rows = rederive(v2, "src/calibration/bar.ts") as Row2[];
    expect(rows.map((r) => [r.state, r.kind, r.cause, r.separation_invoked])).toEqual([
      ["both empty", "no-bar", "both-empty", false],
      ["one empty", "no-bar", "passed-over-empty", false],
      ["both populated, overlapping", "no-bar", "AE-5 open", true],
    ]);
    for (const r of rows) expect([r.accepted, r.passed_over, r.excluded_accepted, r.excluded_passed_over].every(isCount), `${r.state}: a count is missing`).toBe(true);
    // VEC-06: two snapshots, each computed from the record; the union holds, one candidate moves.
    const v6 = load("VEC-06");
    expect([v6.state, v6.module]).toEqual(["COMPUTED", "MOD-09 · PopulationPartition"]);
    type Snap = { label: string; accepted: number[]; passed_over: number[]; excluded_accepted: number; excluded_passed_over: number; union: number };
    const six = rederive(v6, "src/calibration/population-partition.ts") as { moved: number; snapshots: [Snap, Snap] };
    const [pre, post] = six.snapshots;
    expect([pre.label, post.label]).toEqual(["before", "after"]);
    expect([pre.accepted.includes(six.moved), post.passed_over.includes(six.moved), post.accepted.includes(six.moved)]).toEqual([true, true, false]);
    expect(post.union).toBe(pre.union);
    expect([...post.accepted, ...post.passed_over].sort()).toEqual([...pre.accepted, ...pre.passed_over].sort());
    // VEC-07: the control has no exclusions; the mixed fixture has them on BOTH sides, PassedOver's the larger.
    const v7 = load("VEC-07");
    expect([v7.state, v7.module]).toEqual(["COMPUTED", "MOD-09 · PopulationPartition"]);
    type Row7 = { fixture: string; accepted: number; passed_over: number; excluded_accepted: number; excluded_passed_over: number };
    const [mixed, control] = rederive(v7, "src/calibration/population-partition.ts") as [Row7, Row7];
    expect([mixed.fixture, control.fixture]).toEqual(["mixed", "control"]);
    expect([control.excluded_accepted, control.excluded_passed_over]).toEqual([0, 0]);
    expect(mixed.excluded_accepted, "ST-F2: only one side counted").toBeGreaterThan(0);
    expect(mixed.excluded_passed_over).toBeGreaterThan(mixed.excluded_accepted);
  });
});
