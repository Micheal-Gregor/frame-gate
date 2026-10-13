/**
 * MOD-08 `statistics/` (BC-08-1..BC-08-7). Written before the module and watched failing (R-50).
 * Every score is observed (MOD-07) on a candidate drawn through MOD-05, sampled by MOD-06.
 */
import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { asProjection, isUnknown, noSubject, refuse, undetermined, type RecordHeight } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import { LineageReader, type Candidate, type Commitment } from "../../src/facts/index.js";
import { RevisionLog, Samples, type ConditionIdentity } from "../../src/condition/index.js";
import { ObservationLedger, dischargeable, score, type ComponentValue, type Score } from "../../src/observation/index.js";
import { DISPERSION_FLOOR, Dispersion, Location } from "../../src/statistics/index.js";
import { factWorld, never } from "../support/fact-world.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const u = "u1" as Unit;
const X = "condition-x" as ConditionIdentity;
const Y = "condition-y" as ConditionIdentity;
const s = (n: number): Score => {
  const v = score(n);
  if (isUnknown(v)) throw new Error("setup");
  return v;
};
/** A second method for the sample SD (R-63): every pair's squared difference, n(n - 1) apart. */
const pairwiseSd = (xs: readonly number[]): number => {
  let sum = 0;
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) sum += ((xs[i] as number) - (xs[j] as number)) ** 2;
  return Math.sqrt(sum / (xs.length * (xs.length - 1)));
};

function world() {
  const w = factWorld({ currencies: ["c0", "c1"], invalidations: never });
  const [c0, c1] = w.order.currencies() as readonly [Currency, Currency];
  const lineage = new LineageReader({ record: w.record });
  const revisions = new RevisionLog({ record: w.record });
  const samples = new Samples({ candidates: w.candidates, draws: w.draws, revisions, lineage });
  const observations = new ObservationLedger({ record: w.record, components: ["a", "b"] });
  const dispersion = new Dispersion({ samples, observations });
  const location = new Location({ samples, observations });
  const k0 = w.commitAt(u, c0);
  const draw = (condition: ConditionIdentity, from: Commitment = k0): Candidate => {
    const h = w.record.noise();
    const context = w.draws.recordDraw(u, {}, h, condition, h, "ENGINE");
    if (isUnknown(context)) throw new Error("setup: draw");
    const k = w.candidates.appendCandidate({ context, unit: u, currency: c1, condition, seed: "s", from }, "sig", w.record.noise(), "ENGINE");
    if (isUnknown(k)) throw new Error("setup: candidate");
    return k;
  };
  const observe = (k: Candidate, a: ComponentValue, b: ComponentValue = dischargeable("later")) => {
    const o = observations.observe(k, { a: { value: a, author: "ENGINE" }, b: { value: b, author: "ENGINE" } }, "ENGINE", w.record.noise());
    if (isUnknown(o)) throw new Error(`setup: observe answered ${o.kind}`);
    return o;
  };
  /** A member of X's sample, observed with component `a` = `a`. */
  const member = (a: number, condition: ConditionIdentity = X) => {
    const k = draw(condition);
    observe(k, s(a));
    return k;
  };
  const sd = (condition: ConditionIdentity = X, component = "a", at: RecordHeight = w.record.noise()) => dispersion.of(u, c1, condition, component).compute(at);
  const mean = (condition: ConditionIdentity = X, component = "a", at: RecordHeight = w.record.noise()) => location.of(u, c1, condition, component).compute(at);
  return { ...w, c0, c1, samples, observations, dispersion, location, revisions, k0, draw, observe, member, sd, mean };
}

describe("BC-08-1 - REF-08: below the floor of three, dispersion is Undetermined(AE-3)", () => {
  it("test_dispersion_below_floor_returns_undetermined", () => {
    expect(DISPERSION_FLOOR, "the floor is not three").toBe(3);
    const w = world();
    w.member(0.42);
    w.member(0.57);
    const two = w.sd();
    expect(two, "a number below the floor").toEqual(undetermined("AE-3"));
    expect(w.dispersion.available(u, w.c1, X, "a", w.record.noise())).toBe(false);
    w.member(0.61);
    expect(w.sd()).toBeCloseTo(pairwiseSd([0.42, 0.57, 0.61]), 14);
    expect(w.dispersion.available(u, w.c1, X, "a", w.record.noise())).toBe(true);
  });
});

describe("BC-08-2 - a function of the member multiset alone (VEC-03 rule iii)", () => {
  it("test_dispersion_depends_on_the_multiset_alone", () => {
    const a = world();
    const b = world();
    for (const n of [0.61, 0.42, 0.57, 0.38]) a.member(n);
    for (const n of [0.38, 0.57, 0.42, 0.61]) b.member(n);
    const va = a.sd();
    expect(Object.is(va, b.sd()), "the order of the members changed the value").toBe(true);
    // A member contributing nothing (ABSENT for `a`) leaves the multiset, and so the value, unchanged.
    a.observe(a.draw(X), dischargeable("later"));
    expect(Object.is(a.sd(), va)).toBe(true);
    expect(a.sd()).toBeCloseTo(pairwiseSd([0.61, 0.42, 0.57, 0.38]), 14);
  });
});

describe("BC-08-3 - per component; ABSENT and unobserved count for nothing (R-64, rule iv)", () => {
  it("test_only_scored_members_count_toward_the_floor", () => {
    const w = world();
    w.member(0.4);
    w.member(0.5);
    w.observe(w.draw(X), dischargeable("later")); // ABSENT for `a`
    w.draw(X); // never observed
    expect(w.sd(), "an ABSENT or unobserved member counted toward the floor").toEqual(undetermined("AE-3"));
    // Component `b` is ABSENT everywhere: no scored member at all.
    expect(w.sd(X, "b")).toEqual(undetermined("AE-3"));
    expect(w.mean(X, "b"), "a centre of nothing").toEqual(noSubject());
    // The observation IN FORCE counts (R-60): re-observing replaces the score.
    const k = w.member(0.6);
    expect(w.sd()).toBeCloseTo(pairwiseSd([0.4, 0.5, 0.6]), 14);
    w.observe(k, s(0.9));
    expect(w.sd()).toBeCloseTo(pairwiseSd([0.4, 0.5, 0.9]), 14);
  });
});

describe("BC-08-4 - a sample closed by a revision is void here; by a commitment, it is not (R-65, J3)", () => {
  it("test_a_revised_sample_is_void_for_statistics", () => {
    // Closed by a commitment (the earliest event, R-53): still measured.
    const kept = world();
    const first = kept.member(0.4);
    kept.member(0.5);
    kept.member(0.6);
    kept.commitments.commit(first, "HUMAN");
    expect(typeof kept.sd()).toBe("number");
    // Closed by a revision away: void, on both axes.
    const w = world();
    w.member(0.4);
    w.member(0.5);
    w.member(0.6);
    expect(typeof w.sd()).toBe("number");
    w.revisions.revise(u, w.c1, Y, "HUMAN");
    expect(w.sd(), "a revised sample was measured").toEqual(noSubject());
    expect(w.mean(), "location read a voided sample (IR-100)").toEqual(noSubject());
  });
});

describe("BC-08-5 - OBJ-21: location is the mean, available alone, and takes no threshold", () => {
  it("test_location_is_the_mean_and_takes_no_threshold", () => {
    const w = world();
    expect(w.mean()).toEqual(noSubject());
    w.member(0.4);
    expect(w.mean(), "location waited for the dispersion floor").toBe(0.4);
    w.member(0.5);
    expect(w.mean()).toBeCloseTo(0.45, 15);
    // At parse: Location takes no threshold (S3 OBJ-21, "does not take θ").
    const noThreshold = (): void => {
      // @ts-expect-error - a fifth argument (a threshold) is not accepted
      w.location.of(u, w.c1, X, "a", 0.5);
    };
    void noThreshold;
  });
});

describe("BC-08-6 - VEC-03, computed from MOD-08 and re-derived by a second method (R-36)", () => {
  type Vector = { module: string; input: string; output: string; state: string; impl_sha: string; statistic: string };
  it("test_vec_03_re_derives_from_the_dispersion", () => {
    const v3 = JSON.parse(readFileSync(resolve(repo, "vectors/VEC-03.json"), "utf8")) as Vector;
    expect([v3.state, v3.module, v3.statistic]).toEqual(["COMPUTED", "MOD-08 · scores", "sample-sd"]);
    const file = join(mkdtempSync(join(tmpdir(), "vec03-")), "in.json");
    writeFileSync(file, v3.input, "utf8");
    const r = spawnSync(process.execPath, ["--import", "tsx", "tools/vectors/run.ts", "VEC-03", "src/statistics/scores.ts", file], { cwd: repo, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual(JSON.parse(v3.output));
    expect(v3.impl_sha).toBe(createHash("sha256").update(readFileSync(resolve(repo, "src/statistics/scores.ts"))).digest("hex"));
    // Re-derived by a second method; the n = 2 row is discharged by the ABSENCE of a number.
    const scores = (JSON.parse(v3.input) as { scores: number[] }).scores;
    const rows = JSON.parse(v3.output) as { n: number; expect: string | number }[];
    expect(rows.map((x) => x.n)).toEqual([2, 3, 4]);
    expect(rows[0]?.expect).toBe("UNDETERMINED(AE-3)");
    for (const row of rows.slice(1)) expect(row.expect).toBeCloseTo(pairwiseSd(scores.slice(0, row.n)), 14);
  });
});

describe("BC-08-7 - an unknown propagates as itself; each axis joins the family once", () => {
  it("test_the_samples_unknown_propagates_as_itself", () => {
    const w = world();
    const mixed = { of: () => asProjection("Sample", () => refuse("mixed-conditions")) };
    expect(new Dispersion({ samples: mixed, observations: w.observations }).of(u, w.c1, X, "a").compute(w.record.noise())).toEqual(refuse("mixed-conditions"));
    expect(new Location({ samples: mixed, observations: w.observations }).of(u, w.c1, X, "a").compute(w.record.noise())).toEqual(refuse("mixed-conditions"));
    const joins = (JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/projection-joins.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as { joins: string[] }).joins;
    expect(joins.filter((j) => j.startsWith("Dispersion ") || j.startsWith("Location "))).toEqual(["Dispersion src/statistics/dispersion.ts", "Location src/statistics/location.ts"]);
  });
});
