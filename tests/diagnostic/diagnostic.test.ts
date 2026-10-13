/**
 * MOD-10 `diagnostic/` (BC-10-1..BC-10-8). Written before the module and watched failing (R-50).
 * Every diagnostic reads the real chain: candidates drawn through MOD-05, sampled by MOD-06,
 * observed through MOD-07, measured by MOD-08, and compared with MOD-09's bar.
 */
import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { asProjection, isUnknown, noSubject, refuse, uncomputable, undetermined, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import { LineageReader, type Candidate } from "../../src/facts/index.js";
import { RevisionLog, Samples, type ConditionIdentity } from "../../src/condition/index.js";
import { ObservationLedger, dischargeable, score, type ComponentValue, type Score } from "../../src/observation/index.js";
import { InvalidationLedger, InvalidationScope } from "../../src/lineage/index.js";
import { Dispersion, Location } from "../../src/statistics/index.js";
import { AE5_OPEN, Bar, PopulationPartition, type SeparationRule } from "../../src/calibration/index.js";
import { Diagnostic, type DiagnosticValue } from "../../src/diagnostic/index.js";
import { inMemoryRecord } from "../catalog/in-memory-record.js";
import { factWorld } from "../support/fact-world.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const u = "u1" as Unit;
const v = "u2" as Unit;
const ELSEWHERE = "elsewhere" as ConditionIdentity;
const s = (n: number): Score => {
  const x = score(n);
  if (isUnknown(x)) throw new Error("setup");
  return x;
};
/** The midpoint of the gap between the populations, when there is one. Test-only; NOT AE-5's answer. */
const midpoint: SeparationRule = {
  separate: (accepted, passedOver) => {
    const low = Math.min(...accepted);
    const high = Math.max(...passedOver);
    return low > high ? { kind: "separated", theta: (low + high) / 2 } : { kind: "no-bar", cause: "overlap", discharge: "populations that separate" };
  },
};
/** The sample SD by pairwise differences - a second method (R-63). */
const pairwiseSd = (xs: readonly number[]): number => {
  let sum = 0;
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) sum += ((xs[i] as number) - (xs[j] as number)) ** 2;
  return Math.sqrt(sum / (xs.length * (xs.length - 1)));
};

type Entry = number | "absent" | "unobserved";

function world() {
  const record = inMemoryRecord();
  const lineage = new LineageReader({ record });
  const invalidations = new InvalidationLedger({ record, scopes: new InvalidationScope({ lineage }), renderer: { present: () => undefined } });
  const w = factWorld({ currencies: ["c0", "c1"], invalidations, record });
  const [c0] = w.order.currencies() as readonly [Currency, Currency];
  const revisions = new RevisionLog({ record });
  const samples = new Samples({ candidates: w.candidates, draws: w.draws, revisions, lineage });
  const observations = new ObservationLedger({ record, components: ["q", "r"] });
  const partition = new PopulationPartition({ lineage, samples, draws: w.draws, declarations: w.declarations, invalidations, observations });
  const bars = { open: new Bar({ populations: partition, separation: AE5_OPEN }), midpoint: new Bar({ populations: partition, separation: midpoint }) };
  const parts = { samples, dispersion: new Dispersion({ samples, observations }), location: new Location({ samples, observations }), observations, bar: bars.open, declarations: w.declarations };
  /** The diagnostic over the shipped rule (AE-5 open), or over a separating one. */
  const diagnostics = { open: new Diagnostic(parts), midpoint: new Diagnostic({ ...parts, bar: bars.midpoint }) };
  const value = (x: number | "absent"): ComponentValue => (x === "absent" ? dischargeable("a later look") : s(x));
  let rounds = 0;
  /** One sample: a draw per entry under `condition` (a fresh one by default), observed with q = entry and r = 0.5. */
  const round = (unit: Unit, entries: readonly Entry[], condition = `round-${(rounds += 1)}`): Candidate[] =>
    entries.map((e) => {
      const k = w.drawAt(unit, c0, condition);
      if (e !== "unobserved") {
        const o = observations.observe(k, { q: { value: value(e), author: "ENGINE" }, r: { value: s(0.5), author: "ENGINE" } }, "ENGINE", record.noise());
        if (isUnknown(o)) throw new Error(`setup: observe answered ${o.kind}`);
      }
      return k;
    });
  /** v's history at level easy: 0.75 committed, 0.25 passed over (and one unobserved) - the midpoint rule's θ is 0.5. */
  const history = (): void => {
    const [a] = round(v, [0.75, 0.25, "unobserved"]) as [Candidate];
    w.commitments.commit(a, "HUMAN");
  };
  const diagnose = (d: Diagnostic = diagnostics.open, unit: Unit = u, component = "q", at: RecordHeight = record.noise()) => d.of(unit, c0, component).compute(at);
  const tuple = (x: DiagnosticValue | UnknownValue): DiagnosticValue => {
    if (isUnknown(x)) throw new Error(`the diagnostic answered ${x.kind}`);
    return x;
  };
  return { ...w, c0, revisions, observations, parts, bars, diagnostics, round, history, diagnose, tuple };
}
const axes = (d: DiagnosticValue) => [d.dispersion.kind, d.location.kind];
const withheldAxes = (d: DiagnosticValue) => d.withheld.map((x) => x.axis);

describe("BC-10-1 - VEC-04: two independently available axes, each withheld with its reason", () => {
  it("test_the_diagnostic_is_two_independent_axes", () => {
    const w = world();
    w.history();
    w.round(u, [0.6, 0.7, 0.8]);
    // (present, present): three scored members, and a bar.
    const both = w.tuple(w.diagnose(w.diagnostics.midpoint));
    expect(axes(both)).toEqual(["dispersion", "location"]);
    expect(both.withheld, "a withheld entry with both axes present").toEqual([]);
    // (present, absent): the same sample, no bar - only location is withheld.
    const noBar = w.tuple(w.diagnose());
    expect(axes(noBar)).toEqual(["dispersion", "withheld"]);
    expect(noBar.dispersion, "dispersion depended on the bar").toEqual(both.dispersion);
    expect(withheldAxes(noBar)).toEqual(["location"]);
    // (absent, present) and (absent, absent): a sample of one.
    w.round(u, [0.6]);
    const one = w.tuple(w.diagnose(w.diagnostics.midpoint));
    expect(axes(one)).toEqual(["withheld", "location"]);
    expect(withheldAxes(one)).toEqual(["dispersion"]);
    const none = w.tuple(w.diagnose());
    expect(axes(none)).toEqual(["withheld", "withheld"]);
    expect(withheldAxes(none)).toEqual(["dispersion", "location"]);
    // Each withheld entry IS the absent slot's reason, with a cause and a discharge - never zero, never a gap.
    for (const d of [noBar, one, none]) {
      for (const entry of d.withheld) {
        expect(entry.axis === "dispersion" ? d.dispersion : d.location).toEqual(entry);
        expect(entry.discharge.length, `${entry.axis} withheld without a discharge`).toBeGreaterThan(0);
      }
    }
  });
});

describe("BC-10-2 - R-73: the dispersion axis is the measured spread and the n behind it", () => {
  it("test_the_dispersion_axis_is_the_measured_spread", () => {
    const w = world();
    w.round(u, [0.42, "unobserved", 0.57, "absent", 0.61]);
    const d = w.tuple(w.diagnose());
    expect(d.dispersion).toMatchObject({ kind: "dispersion", n: 3 });
    expect(d.dispersion.kind === "dispersion" ? d.dispersion.spread : Number.NaN, "not MOD-08's sample SD").toBeCloseTo(pairwiseSd([0.42, 0.57, 0.61]), 14);
    // Below three scored members: withheld, with MOD-08's Undetermined(AE-3) as itself.
    w.round(u, [0.42, 0.57, "absent"]);
    const two = w.tuple(w.diagnose());
    expect(two.dispersion).toMatchObject({ kind: "withheld", axis: "dispersion", cause: undetermined("AE-3") });
    // A sample closed by a revision is void for dispersion (R-65): withheld with NoSubject.
    w.round(u, [0.4, 0.5, 0.6]);
    w.revisions.revise(u, w.c0, ELSEWHERE, "HUMAN");
    expect(w.tuple(w.diagnose()).dispersion).toMatchObject({ kind: "withheld", axis: "dispersion", cause: noSubject() });
  });
});

describe("BC-10-3 - R-74: the location axis meets or falls below θ, and is withheld when θ = ⊥", () => {
  it("test_the_location_axis_meets_or_falls_below_the_bar", () => {
    const w = world();
    w.history();
    const bar = w.bars.midpoint.of("easy", "q").compute(w.record.noise());
    expect(bar, "the bar the location axis must carry whole, its exclusion included (PC-07)").toMatchObject({ kind: "bar", theta: 0.5, excludedPassedOver: 1 });
    w.round(u, [0.5]);
    expect(w.tuple(w.diagnose(w.diagnostics.midpoint)).location, "μ = θ").toEqual({ kind: "location", classification: "meets", centre: 0.5, level: "easy", bar });
    w.round(u, [0.4]);
    expect(w.tuple(w.diagnose(w.diagnostics.midpoint)).location).toMatchObject({ classification: "below", centre: 0.4 });
    w.round(u, [0.5, 0.7]);
    expect(w.tuple(w.diagnose(w.diagnostics.midpoint)).location).toMatchObject({ classification: "meets", centre: 0.6 });
    // θ = ⊥: withheld, the bar's own no-bar as the cause and its discharge - never estimated.
    const noBar = w.bars.open.of("easy", "q").compute(w.record.noise());
    if (isUnknown(noBar) || noBar.kind !== "no-bar") throw new Error("expected no-bar");
    expect(w.tuple(w.diagnose()).location).toEqual({ kind: "withheld", axis: "location", cause: noBar, discharge: noBar.discharge });
  });
});

describe("BC-10-4 - R-72: the latest sample, per component", () => {
  it("test_the_latest_sample_is_read_per_component", () => {
    const w = world();
    expect(w.diagnose(), "a diagnostic of nothing drawn").toEqual(noSubject());
    w.round(u, [0.2, 0.3, 0.4], "first");
    w.round(u, [0.8], "second");
    const latest = w.tuple(w.diagnose());
    expect(latest.condition).toBe("second");
    expect(latest.dispersion.kind, "an older sample was read").toBe("withheld");
    // A later draw under the first condition makes its sample the latest again.
    w.round(u, [0.5], "first");
    const again = w.tuple(w.diagnose());
    expect(again.condition).toBe("first");
    expect(again.dispersion).toMatchObject({ kind: "dispersion", n: 4 });
    // Per component: r is 0.5 on every observed member.
    expect(w.tuple(w.diagnose(w.diagnostics.open, u, "r")).dispersion).toEqual({ kind: "dispersion", spread: 0, n: 4 });
  });
});

describe("BC-10-5 - R-75: the bar is read at the level in force at the height", () => {
  it("test_the_bar_is_read_at_the_level_in_force", () => {
    const w = world();
    w.history();
    w.round(u, [0.6]);
    expect(w.tuple(w.diagnose(w.diagnostics.midpoint)).location).toMatchObject({ kind: "location", level: "easy", classification: "meets" });
    // Re-declared: the diagnostic now reads hard's bar, which has no populations.
    w.declarations.declare(u, "hard", "HUMAN");
    expect(w.tuple(w.diagnose(w.diagnostics.midpoint)).location).toMatchObject({ kind: "withheld", axis: "location", cause: { kind: "no-bar", cause: "both-empty" } });
  });
});

describe("BC-10-6 - REF-06 / SEAM-14 / R-76: the diagnostic proposes and closes nothing", () => {
  it("test_no_act_accepts_a_diagnostic", () => {
    type Finding = { act: string; param: string; path: string; how: string };
    const out = JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/act-signatures.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as {
      src: Finding[];
      fixtures: Record<string, Finding[]>;
    };
    expect(out.src, "an act in src/ can accept a diagnostic").toEqual([]);
    const found = out.fixtures["tests/fixtures/acts/violating-diagnostic.ts"] ?? [];
    expect(found.map((f) => `${f.act} ${f.how}`).sort(), "an act taking a diagnostic was not flagged").toEqual([
      "commitOnDiagnostic diagnostic",
      "commitOnEither diagnostic",
      "commitOnField diagnostic",
      "commitOnList diagnostic",
    ]);
    // MWE step 7: the smallest run commits while its diagnostic carries no axis at all.
    const w = world();
    const [k] = w.round(u, [0.6]) as [Candidate];
    expect(axes(w.tuple(w.diagnose()))).toEqual(["withheld", "withheld"]);
    expect(isUnknown(w.commitments.effectiveCommitment(u, w.c0, w.record.noise())), "a commitment existed before the act").toBe(true);
    w.commitments.commit(k, "HUMAN");
    expect(isUnknown(w.commitments.effectiveCommitment(u, w.c0, w.record.noise())), "the commit did not take").toBe(false);
  });
});

describe("BC-10-7 - an absence withholds its own axis; anything else is the answer", () => {
  it("test_an_unknown_other_than_an_absence_is_the_answer", () => {
    const w = world();
    w.history();
    w.round(u, [0.4, 0.5, 0.6]);
    const answering = (x: UnknownValue) => ({ of: () => asProjection("Dispersion", () => x) });
    expect(w.diagnose(new Diagnostic({ ...w.parts, dispersion: answering(refuse("mixed-conditions")) }))).toEqual(refuse("mixed-conditions"));
    // The centre is read only where θ exists (SEAM-13), so the broken centre is met under a bar.
    expect(w.diagnose(new Diagnostic({ ...w.parts, bar: w.bars.midpoint, location: answering(uncomputable("two-observations")) })), "a broken read became 'withheld'").toEqual(uncomputable("two-observations"));
    const brokenBar = { of: () => asProjection("Bar", () => uncomputable("draw-context")) };
    expect(w.diagnose(new Diagnostic({ ...w.parts, bar: brokenBar }))).toEqual(uncomputable("draw-context"));
    // An absence on one axis leaves the other present.
    const nothingScored = w.tuple(w.diagnose(new Diagnostic({ ...w.parts, dispersion: answering(undetermined("AE-3")) })));
    expect(axes(nothingScored)).toEqual(["withheld", "withheld"]);
    expect(nothingScored.dispersion).toMatchObject({ cause: undetermined("AE-3") });
    expect(nothingScored.location, "the bar's absence was replaced by the dispersion's").toMatchObject({ cause: { kind: "no-bar" } });
    const joins = (JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/projection-joins.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as { joins: string[] }).joins;
    expect(joins.filter((j) => j.startsWith("Diagnostic "))).toEqual(["Diagnostic src/diagnostic/diagnostic.ts"]);
    const mint = (
      JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as {
        mint: { src: unknown[]; fixtures: Record<string, { how: string }[]> };
      }
    ).mint;
    expect(mint.src).toEqual([]);
    expect(mint.fixtures["tests/fixtures/catalog-mint/mint-diagnostic.ts"]?.map((x) => x.how), "a diagnostic minted outside MOD-10").toEqual(["assertion"]);
  });
});

describe("BC-10-8 - VEC-04: computed from MOD-10 and re-derived (R-36)", () => {
  type Vector = { id: string; module: string; input: string; output: string; state: string; impl_sha: string; deferred_rows?: { row: number; discharge: string }[] };
  it("test_vec_04_re_derives_from_mod_10", () => {
    const v4 = JSON.parse(readFileSync(resolve(repo, "vectors/VEC-04.json"), "utf8")) as Vector;
    expect([v4.state, v4.module, v4.deferred_rows?.map((x) => x.row)]).toEqual(["COMPUTED", "MOD-10 · Diagnostic", [1, 3]]);
    for (const d of v4.deferred_rows ?? []) expect(d.discharge, `row ${d.row} deferred without its discharge`).toContain("AE-5");
    const file = join(mkdtempSync(join(tmpdir(), "vec04-")), "in.json");
    writeFileSync(file, v4.input, "utf8");
    const r = spawnSync(process.execPath, ["--import", "tsx", "tools/vectors/run.ts", "VEC-04", "src/diagnostic/diagnostic.ts", file], { cwd: repo, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual(JSON.parse(v4.output));
    expect(v4.impl_sha).toBe(createHash("sha256").update(readFileSync(resolve(repo, "src/diagnostic/diagnostic.ts"))).digest("hex"));
    type Row = { row: number; dispersion: { kind: string; cause?: unknown }; location: { kind: string; cause?: { kind: string; cause?: string } }; withheld: string[]; separation_invoked: boolean };
    const rows = JSON.parse(r.stdout) as Row[];
    expect(rows.map((x) => [x.row, x.dispersion.kind, x.location.kind, x.withheld])).toEqual([
      [2, "dispersion", "withheld", ["location"]],
      [4, "withheld", "withheld", ["dispersion", "location"]],
    ]);
    // Row 4 is MWE step 6: a sample of one, both populations empty, AE-5 never engaged.
    const mwe = rows[1] as Row;
    expect(mwe.dispersion.cause).toEqual(undetermined("AE-3"));
    expect([mwe.location.cause?.kind, mwe.location.cause?.cause, mwe.separation_invoked]).toEqual(["no-bar", "both-empty", false]);
  });
});
