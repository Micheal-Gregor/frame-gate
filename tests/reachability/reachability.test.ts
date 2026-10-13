/**
 * MOD-04 `reachability/` - THE CONCEPT (BC-04-1..BC-04-7). Written before the classes and
 * watched failing. One condition over one currency order:
 *     reachable(u, c)  <=>  for all c' < c : effective_commitment(u, c') IS a commitment
 */
import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { asProjection, isUnknown, noSubject, refuse, uncomputable, type RecordHeight } from "../../src/kernel/index.js";
import { CurrencyOrder, DeclarationLedger, IndependenceLedger, type Currency, type Unit } from "../../src/catalog/index.js";
import { BOTTOM, CandidateLedger, DrawContextLog, type Commitment } from "../../src/facts/index.js";
import {
  REACHABILITY_GATE,
  Reachability,
  ReachabilityGate,
  type ReachabilityEvaluation,
} from "../../src/reachability/index.js";
import { inMemoryRecord } from "../catalog/in-memory-record.js";
import { factWorld } from "../support/fact-world.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const order = new CurrencyOrder({ currencies: ["c1", "c2", "c3"] });
const [c1, c2, c3] = order.currencies() as readonly [Currency, Currency, Currency];
const u = "u1" as Unit;
const v = "u2" as Unit;

/** The real MOD-03 order and MOD-05 fold, and MOD-04 over them. */
function world() {
  // R-41: commitments accept real candidates, drawn through the real path (tests/support). The
  // invalidation set is the test's to fill - a stand-in for MOD-12.
  const invalidated = new Set<number>();
  const f = factWorld({ currencies: ["c1", "c2", "c3"], invalidations: { isInvalidated: (k) => invalidated.has(Number(k.at)) } });
  const reachability = new Reachability({ currencies: order, commitments: f.commitments });
  const gate = new ReachabilityGate({ reachability });
  return { ...f, reachability, gate, invalidate: (k: Commitment) => void invalidated.add(Number(k.at)) };
}
const verdictOf = (e: ReachabilityEvaluation) => (isUnknown(e) ? e : e.verdict);

describe("BC-04-1 - REF-03: a draw with no commitment below it is refused, before anything costs", () => {
  it("test_draw_without_cheaper_commitment_is_refused", () => {
    const { record, gate } = world();
    const h = record.noise();
    expect(gate.admit(u, c2, h), "a draw at c2 with nothing committed at c1 was admitted").toEqual(refuse("unreachable"));
    const e = gate.evaluate(u, c2, h);
    expect(!isUnknown(e) && e.verdict === "unreachable" && e.cheapestUnmet, "the refusal does not name the cheapest unmet currency").toBe(c1);
    // Two unmet (c1 and c2 below c3): the refusal names the CHEAPEST, not the dearest.
    const e3 = gate.evaluate(u, c3, h);
    expect(!isUnknown(e3) && e3.verdict === "unreachable" && e3.cheapestUnmet, "the dearest unmet currency was named").toBe(c1);
    // PC-05 (R-38): attributable by construction - asking again at the refusal's height gives the
    // same evaluation, so a refusal stream re-attributes it with no stored state.
    expect(gate.evaluate(u, c2, h), "re-evaluation at the same height disagreed").toEqual(e);
  });

  it("test_an_unreachable_draw_is_refused_on_the_orchestrated_path", () => {
    // REF-03's row on the path that costs: MOD-05's one append with this gate injected - no
    // candidate created, no cost incurred (no later decider asked), and the refusal attributable.
    const { record, commitments, gate, commitAt } = world();
    const declarations = new DeclarationLedger({ record, levels: ["easy"] });
    declarations.declare(u, "easy", "HUMAN");
    const draws = new DrawContextLog({ record, declarations });
    const asked: string[] = [];
    const ledger = new CandidateLedger({
      record,
      commitments,
      currencies: order,
      independence: new IndependenceLedger({ record }),
      admission: gate,
      signatures: { check: () => (asked.push("signature"), "VERIFIED") },
      ceiling: { admitsDraw: () => (asked.push("ceiling"), "WITHIN") },
    });
    const h0 = record.noise();
    const context = draws.recordDraw(u, { k: "v" }, h0, "cond", h0, "ENGINE");
    if (isUnknown(context)) throw new Error("setup: the draw was refused");
    const h = record.noise();
    expect(ledger.appendCandidate({ context, unit: u, currency: c3, condition: "cond", seed: "s", from: BOTTOM }, "sig", h, "ENGINE")).toEqual(refuse("unreachable"));
    expect(Number(record.noise()), "no candidate created").toBe(Number(h) + 1);
    expect(asked, "no cost incurred").toEqual([]);
    const why = gate.evaluate(u, c3, h);
    expect(!isUnknown(why) && why.verdict === "unreachable" && why.cheapestUnmet, "the refusal is not attributable").toBe(c1);
  });

  it("test_the_candidate_append_asks_the_gate_first_hook_01", () => {
    // HOOK-01 at @before-candidate-append: MOD-05's one append path, with THIS gate as its
    // injected admission (R-18). Unreachable -> refused, nothing appended, nothing else asked.
    const { record, commitments, gate, commitAt } = world();
    const declarations = new DeclarationLedger({ record, levels: ["easy"] });
    declarations.declare(u, "easy", "HUMAN");
    const draws = new DrawContextLog({ record, declarations });
    const asked: string[] = [];
    const ledger = new CandidateLedger({
      record,
      commitments,
      currencies: order,
      independence: new IndependenceLedger({ record }),
      admission: gate,
      signatures: { check: () => (asked.push("signature"), "VERIFIED") },
      ceiling: { admitsDraw: () => (asked.push("ceiling"), "WITHIN") },
    });
    const h0 = record.noise();
    const context = draws.recordDraw(u, { k: "v" }, h0, "cond", h0, "ENGINE");
    if (isUnknown(context)) throw new Error("setup: the draw was refused");
    const h = record.noise();
    expect(ledger.appendCandidate({ context, unit: u, currency: c2, condition: "cond", seed: "s", from: BOTTOM }, "sig", h, "ENGINE")).toEqual(refuse("unreachable"));
    expect(Number(record.noise()), "an unreachable draw appended something").toBe(Number(h) + 1);
    expect(asked, "a decider after the gate was asked: the unreachable draw cost something").toEqual([]);
    // and once c1 is committed, the same draw passes the gate (and goes on to the next guard)
    commitAt(u, c1);
    expect(gate.admit(u, c2, record.noise())).toBe("ADMIT");
  });
});

describe("BC-04-2 - reachable iff every strictly cheaper currency HAS a commitment (IR-42)", () => {
  it("test_reachable_iff_every_cheaper_currency_has_a_commitment", () => {
    const { record, commitments, gate, commitAt } = world();
    const at = () => record.noise();
    const row = () => [c1, c2, c3].map((c) => gate.admit(u, c, at()));
    const A = "ADMIT";
    const R = refuse("unreachable");
    expect(row(), "commitments {}").toEqual([A, R, R]);
    commitAt(u, c1);
    expect(row(), "commitments {c1}").toEqual([A, A, R]);
    commitAt(u, c2);
    expect(row(), "commitments {c1, c2}").toEqual([A, A, A]);
    // another unit's commitments never answer for this one
    expect([c1, c2, c3].map((c) => gate.admit(v, c, at()))).toEqual([A, R, R]);
  });

  it("test_skipping_a_currency_does_not_reach_past_it", () => {
    // c2 in force while c1 is NOT: c3 is still unreachable - EVERY cheaper currency, not the one
    // below. Under R-41 c2 cannot be committed before c1, so the gap is made by invalidating c1.
    const { record, gate, commitAt, invalidate } = world();
    const k1 = commitAt(u, c1);
    commitAt(u, c2);
    invalidate(k1);
    const e = gate.evaluate(u, c3, record.noise());
    expect(!isUnknown(e) && e.verdict === "unreachable" && e.cheapestUnmet).toBe(c1);
  });

  it("test_an_uncomputable_predecessor_is_unmet_not_bottom", () => {
    // R-20 + IR-42: two effective commitments at c1 is neither a commitment nor BOTTOM, and
    // reachability refuses rather than guesses. The witness keeps the uncomputable answer.
    const { record, commitments, gate, commitAt } = world();
    commitAt(u, c1);
    commitAt(u, c1);
    const e = gate.evaluate(u, c2, record.noise());
    expect(verdictOf(e)).toBe("unreachable");
    expect(!isUnknown(e) && e.witnesses[0]?.answer).toEqual(uncomputable("two-effective-commitments"));
  });

  it("test_the_least_currency_is_reachable_by_the_empty_fold", () => {
    const { record, gate } = world();
    const e = gate.evaluate(u, c1, record.noise());
    expect(verdictOf(e)).toBe("reachable");
    expect(!isUnknown(e) && e.witnesses, "the least currency has predecessors").toEqual([]);
  });
});

describe("BC-04-3 - one evaluation, with its witnesses (R-34)", () => {
  it("test_one_evaluation_answers_the_verdict_and_its_witnesses", () => {
    const { record, commitments, gate, commitAt } = world();
    const k1 = commitAt(u, c1);
    const h = record.noise();
    expect(gate.evaluate(u, c3, h)).toEqual({
      verdict: "unreachable",
      unit: u,
      currency: c3,
      at: h,
      witnesses: [
        { currency: c1, answer: k1 },
        { currency: c2, answer: noSubject() },
      ],
      cheapestUnmet: c2,
    });
  });

  it("test_admit_derives_from_one_evaluation_never_a_second", () => {
    let computed = 0;
    const evaluation: ReachabilityEvaluation = { verdict: "reachable", unit: u, currency: c2, at: inMemoryRecord().noise(), witnesses: [] };
    const gate = new ReachabilityGate({
      reachability: { of: () => asProjection("Reachability", () => ((computed += 1), evaluation)) },
    });
    expect(gate.admit(u, c2, evaluation.at as RecordHeight)).toBe("ADMIT");
    expect(computed, "admit evaluated reachability more than once").toBe(1);
  });
});

describe("BC-04-4 - as of a height, recomputed per call (a Projection, R-35)", () => {
  it("test_reachability_is_as_of_a_height", () => {
    const { record, commitments, reachability, commitAt } = world();
    const before = record.noise();
    const k1 = commitAt(u, c1);
    const projection = reachability.of(u, c2);
    expect(verdictOf(projection.compute(before)), "a later commitment reached back in time").toBe("unreachable");
    expect(verdictOf(projection.compute(k1.at))).toBe("reachable");
    expect(verdictOf(projection.compute(before)), "the projection stored its last answer").toBe("unreachable");
  });

  it("test_reachability_joins_the_family_once_through_the_kernel", () => {
    const out = JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/projection-joins.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as { joins: string[]; src: unknown[] };
    // Its OWN join (OBJ-28 joins too, in MOD-12): once, in the fold's file.
    expect(out.joins.filter((j) => j.startsWith("Reachability "))).toEqual(["Reachability src/reachability/reachability.ts"]);
    expect(out.src).toEqual([]);
  });
});

describe("BC-04-5 - a currency outside the order is not 'unreachable'", () => {
  it("test_a_currency_outside_the_order_is_passed_through", () => {
    const { record, gate } = world();
    const stranger = "zz" as Currency;
    const h = record.noise();
    expect(gate.evaluate(u, stranger, h)).toEqual(refuse("currency-not-in-this-order"));
    expect(gate.admit(u, stranger, h), "an unknown currency was reported as unreachable").toEqual(refuse("currency-not-in-this-order"));
  });
});

describe("BC-04-6 - OBJ-29 as a value", () => {
  it("test_reachability_gate_states_obj_29", () => {
    expect(REACHABILITY_GATE).toEqual({
      condition: "reachable(u, c) = true",
      closedBy: "DERIVATION",
      proposalsIn: [],
      records: "Candidate",
      onFail: { kind: "refuse", guard: "unreachable" },
    });
    expect(Object.isFrozen(REACHABILITY_GATE) && Object.isFrozen(REACHABILITY_GATE.proposalsIn) && Object.isFrozen(REACHABILITY_GATE.onFail)).toBe(true);
    const { record, gate } = world();
    expect(gate.admit(u, c2, record.noise()), "the gate refuses with something other than its ON_FAIL").toEqual(REACHABILITY_GATE.onFail);
  });
});

describe("BC-04-7 - one reachability site, and no per-currency branch", () => {
  type Finding = { file: string; line: number; how: string };
  const reach = () =>
    JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/reach-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as { soleSite: { src: Finding[]; fixtures: Record<string, string[]> }; branch: { src: Finding[]; fixtures: Record<string, string[]> } };

  it("test_reachability_is_decided_in_one_place", () => {
    const out = reach();
    expect(out.soleSite.src, "a second reachability check in src/").toEqual([]);
    expect(out.soleSite.fixtures).toEqual({
      "src/facts/conforming-commits-in-a-loop.ts": [],
      "src/facts/conforming-one-fold-read.ts": [],
      "src/facts/limit-helper-verdict.ts": [],
      "src/facts/limit-recursive-fold.ts": [],
      "src/facts/limit-user-iteration-helper.ts": [],
      "src/facts/violating-bound-reader.ts": ["second-reachability-check"],
      "src/facts/violating-factory-reader.ts": ["second-reachability-check"],
      "src/facts/violating-method-reference.ts": ["second-reachability-check"],
      "src/facts/violating-nullable-helper.ts": ["second-reachability-check"],
      "src/facts/violating-closure-reader.ts": ["second-reachability-check"],
      "src/facts/violating-every-callback.ts": ["second-reachability-check"],
      "src/facts/violating-helper-by-reference.ts": ["second-reachability-check"],
      "src/facts/violating-helper-fold.ts": ["second-reachability-check"],
      "src/reachability/conforming-the-one-check.ts": [],
      "src/spend/violating-array-from.ts": ["second-reachability-check"],
      "src/spend/violating-classic-for.ts": ["second-reachability-check"],
      "src/spend/violating-for-loop.ts": ["second-reachability-check"],
      "src/spend/violating-map-foreach.ts": ["second-reachability-check"],
      "src/spend/violating-set-foreach.ts": ["second-reachability-check"],
    });
  });

  it("test_no_code_branches_on_a_particular_currency", () => {
    const out = reach();
    expect(out.branch.src, "a branch on a particular currency in src/").toEqual([]);
    expect(out.branch.fixtures).toEqual({
      "src/reachability/conforming-destructured-data.ts": [],
      "src/reachability/conforming-lookup-equality.ts": [],
      "src/reachability/conforming-widened-data.ts": [],
      "src/reachability/limit-class-field-least.ts": [],
      "src/reachability/limit-rest-then-index.ts": [],
      "src/reachability/limit-set-membership.ts": [],
      "src/reachability/violating-at-member.ts": ["currency-branch"],
      "src/reachability/violating-binding-hop.ts": ["currency-branch"],
      "src/reachability/violating-computed-key.ts": ["currency-branch"],
      "src/reachability/violating-const-key.ts": ["currency-branch"],
      "src/reachability/violating-destructured-hop.ts": ["currency-branch"],
      "src/reachability/violating-destructured-least.ts": ["currency-branch"],
      "src/reachability/violating-destructured-object-key.ts": ["currency-branch"],
      "src/reachability/violating-indexed-member.ts": ["currency-branch"],
      "src/reachability/violating-least-branch.ts": ["currency-branch"],
      "src/reachability/violating-literal-branch.ts": ["currency-branch"],
      "src/reachability/violating-one-hop.ts": ["currency-branch"],
      "src/reachability/violating-string-key.ts": ["currency-branch"],
      "src/reachability/violating-switch.ts": ["currency-branch"],
      "src/reachability/violating-widened.ts": Array.from({ length: 8 }, () => "currency-branch"),
    });
  });
});

describe("BC-04-9 - VEC-01, computed from MOD-04 and re-derived (R-36)", () => {
  type Vector = { id: string; module: string; input: string; output: string; state: string; impl_sha: string };
  const vec = () => JSON.parse(readFileSync(resolve(repo, "vectors/VEC-01.json"), "utf8")) as Vector;
  const harness = (entry: string, input: string) => {
    const file = join(mkdtempSync(join(tmpdir(), "vec01-")), "in.json");
    writeFileSync(file, input, "utf8");
    return spawnSync(process.execPath, ["--import", "tsx", "tools/vectors/run.ts", "VEC-01", entry, file], { cwd: repo, encoding: "utf8" });
  };

  it("test_vec_01_re_derives_from_the_fold", () => {
    const v = vec();
    expect(v.state).toBe("COMPUTED");
    expect(v.module, "the vector is not bound to the fold's object-model row").toBe("MOD-04 · Reachability");
    const r = harness("src/reachability/reachability.ts", v.input);
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout), "VEC-01 does not re-derive from the current fold").toEqual(JSON.parse(v.output));
    const sha = createHash("sha256").update(readFileSync(resolve(repo, "src/reachability/reachability.ts"))).digest("hex");
    expect(v.impl_sha, "VEC-01's impl_sha does not pin the current fold").toBe(sha);
    // The rule, read off the computed value - every cheaper currency committed, vacuous at the least.
    const R = "Refuse(unreachable)";
    expect(JSON.parse(v.output)).toEqual({
      "{}": { c1: "ADMIT", c2: R, c3: R },
      "{c1}": { c1: "ADMIT", c2: "ADMIT", c3: R },
      "{c1,c2}": { c1: "ADMIT", c2: "ADMIT", c3: "ADMIT" },
    });
  });

  it("test_the_harness_refuses_a_wrong_entry", () => {
    const r = harness("src/reachability/index.ts", vec().input);
    expect(r.status, "the harness computed a vector whose impl_sha would pin another file").toBe(2);
  });
});

