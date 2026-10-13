/**
 * MOD-06 `condition/` (BC-06-1..BC-06-7). Written before the classes and watched failing (R-50:
 * sized to the module's claims). Every candidate here is drawn through MOD-05's real path.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compare, isUnknown, noSubject, refuse, uncomputable, type RecordHeight } from "../../src/kernel/index.js";
import type { DigestPort } from "../../src/ports/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import { LineageReader, type Candidate, type CandidateProposal, type Commitment } from "../../src/facts/index.js";
import { Chains, ConditionIdentities, RevisionLog, Samples, conditionOf, type Chain, type ConditionIdentity, type SampleValue } from "../../src/condition/index.js";
import { factWorld } from "../support/fact-world.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const [u, v, x, y, z] = ["u1", "u2", "u3", "u4", "u5"] as unknown as readonly [Unit, Unit, Unit, Unit, Unit];
const sha256: DigestPort = { digest: (bytes) => createHash("sha256").update(bytes).digest("hex") };
const ids = new ConditionIdentities({ digests: sha256 });
const X = ids.identityOf({ prompt: "a red frame", references: ["ref-a"] });
const Y = ids.identityOf({ prompt: "a blue frame", references: ["ref-a"] });

type Out = { codes: number[]; messages: string[] };
const cache: { fixtures?: Record<string, Out> } = {};
const fixtures = (): Record<string, Out> =>
  (cache.fixtures ??= (
    JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as { fixtures: Record<string, Out> }
  ).fixtures);
const joins = (): string[] =>
  (JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/projection-joins.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as { joins: string[] }).joins;

/** The real facts path, with MOD-06 over it; the invalidation set is the test's to fill. */
function world() {
  const invalidated = new Set<number>();
  const w = factWorld({ currencies: ["c0", "c1", "c2"], invalidations: { isInvalidated: (k) => invalidated.has(Number(k.at)) } });
  const [c0, c1, c2] = w.order.currencies() as readonly [Currency, Currency, Currency];
  const lineage = new LineageReader({ record: w.record });
  const revisions = new RevisionLog({ record: w.record });
  const samples = new Samples({ candidates: w.candidates, draws: w.draws, revisions, lineage });
  const chains = new Chains({ lineage, commitments: w.commitments, currencies: w.order });
  /** A candidate for (unit, currency) drawn under `condition`, from `from` - through MOD-05's append. */
  const draw = (unit: Unit, currency: Currency, condition: string, from: CandidateProposal["from"]): Candidate => {
    if (isUnknown(w.declarations.declarationAt(unit, w.record.noise()))) w.declarations.declare(unit, "easy", "HUMAN");
    const h = w.record.noise();
    const context = w.draws.recordDraw(unit, {}, h, condition, h, "ENGINE");
    if (isUnknown(context)) throw new Error(`setup: the draw answered ${context.kind}`);
    const k = w.candidates.appendCandidate({ context, unit, currency, condition, seed: "s", from }, "sig", w.record.noise(), "ENGINE");
    if (isUnknown(k)) throw new Error(`setup: the candidate answered ${k.kind}`);
    return k;
  };
  const sample = (unit: Unit, currency: Currency, condition: ConditionIdentity, at: RecordHeight): SampleValue => {
    const s = samples.of(unit, currency, condition).compute(at);
    if (isUnknown(s)) throw new Error(`the sample answered ${s.kind}`);
    return s;
  };
  const invalidate = (k: Commitment) => void invalidated.add(Number(k.at));
  /** The chains as of `at`, which must be computable here. */
  const chainsAt = (at: RecordHeight): readonly Chain[] => {
    const c = chains.chains().compute(at);
    if (isUnknown(c)) throw new Error(`the chains answered ${c.kind}`);
    return c;
  };
  return { ...w, c0, c1, c2, lineage, revisions, samples, chains, draw, sample, invalidate, chainsAt };
}

describe("BC-06-1 - OBJ-07: a condition identity is the digest of the WHOLE draw-input set (R-52)", () => {
  it("test_a_condition_identity_is_the_digest_of_the_whole_input_set", () => {
    const inputs = { prompt: "a red frame", references: ["ref-a", "ref-b"], style: { palette: "warm", strength: 7 } };
    const id = ids.identityOf(inputs);
    expect(ids.identityOf({ style: { strength: 7, palette: "warm" }, references: ["ref-a", "ref-b"], prompt: "a red frame" }), "key order changed the identity").toBe(id);
    expect(ids.sameCondition(id, ids.identityOf(inputs))).toBe(true);
    // Every component counts, and nothing is normalized away: a changed cited reference IS a
    // condition change (J2), and so is anything added later.
    const variants: Readonly<Record<string, typeof inputs | Record<string, unknown>>> = {
      prompt: { ...inputs, prompt: "a red frame." },
      reference: { ...inputs, references: ["ref-a", "ref-c"] },
      "reference order": { ...inputs, references: ["ref-b", "ref-a"] },
      nested: { ...inputs, style: { ...inputs.style, strength: 8 } },
      added: { ...inputs, seedPolicy: "fixed" },
      removed: { prompt: inputs.prompt, references: inputs.references },
    };
    for (const [what, changed] of Object.entries(variants)) {
      expect(ids.sameCondition(ids.identityOf(changed as typeof inputs), id), `a ${what} change kept the identity`).toBe(false);
    }
    // Numbers are kept EXACTLY (DR-43, R-61): none of these collapse, as JSON would collapse them.
    const numbers = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -0, 1];
    expect(new Set(numbers.map((n) => ids.identityOf({ strength: n }))).size, "two numbers gave one identity").toBe(numbers.length);
    expect(ids.identityOf({ strength: 1 }), "a number and its text gave one identity").not.toBe(ids.identityOf({ strength: "1" }));
    // The digest is the PORT's (OBJ-39): MOD-06 chooses none.
    const other = new ConditionIdentities({ digests: { digest: (b) => `other:${sha256.digest(b)}` } });
    expect(other.identityOf(inputs)).toBe(`other:${id}`);
    // A candidate carries the identity it was drawn under.
    const w = world();
    const k0 = w.commitAt(u, w.c0);
    expect(conditionOf(w.draw(u, w.c1, X, k0))).toBe(X);
  });
});

describe("BC-06-2 - OBJ-17: a revision is one HUMAN append; it sets the condition in force (IR-88)", () => {
  it("test_a_revision_sets_the_condition_in_force", () => {
    expect(fixtures()["tests/fixtures/condition/revise-as-engine.ts"]?.codes, "a non-HUMAN author revised").toEqual([2345]);
    const w = world();
    const before = w.record.noise();
    const none = w.revisions.conditionInForce(u, w.c1, before);
    expect(isUnknown(none) && none.kind, "no revision is not NoSubject").toBe("no-subject");
    const r1 = w.revisions.revise(u, w.c1, X, "HUMAN");
    expect([Number(r1.at), r1.author, r1.payload]).toEqual([Number(before) + 1, "HUMAN", { kind: "prompt-revision", unit: u, currency: w.c1, condition: X }]);
    const r2 = w.revisions.revise(u, w.c1, Y, "HUMAN");
    expect([w.revisions.conditionInForce(u, w.c1, r1.at), w.revisions.conditionInForce(u, w.c1, r2.at)]).toEqual([X, Y]);
    expect(isUnknown(w.revisions.conditionInForce(v, w.c1, r2.at)), "another unit's revision counted").toBe(true);
    expect(isUnknown(w.revisions.conditionInForce(u, w.c2, r2.at)), "another currency's revision counted").toBe(true);
    expect(w.revisions.revisions(u, w.c1, r2.at)).toEqual([r1, r2]);
    expect(w.revisions.revisions(u, w.c1, r1.at)).toEqual([r1]);
    // Only this ledger's HUMAN entries count.
    const forged = w.record.append({ author: "ENGINE", payload: { kind: "prompt-revision", unit: u, currency: w.c1, condition: X } });
    expect(w.revisions.conditionInForce(u, w.c1, forged), "a non-HUMAN revision was read").toBe(Y);
  });
});

describe("BC-06-3 - REF-10 (INV-SAMPLE): membership is identity, never a union (IR-87)", () => {
  it("test_cross_condition_sample_query_is_empty", () => {
    // At parse: a sample is asked for ONE identity; two do not compile.
    expect(fixtures()["tests/fixtures/condition/sample-of-two-conditions.ts"]?.codes, "two identities were queried as one sample").toEqual([2345]);
    expect(fixtures()["tests/fixtures/condition/sample-of-one-condition.ts"]?.codes, "the positive control no longer compiles").toEqual([]);
    const w = world();
    const k0 = w.commitAt(u, w.c0);
    const x1 = w.draw(u, w.c1, X, k0);
    const y1 = w.draw(u, w.c1, Y, k0);
    const x2 = w.draw(u, w.c1, X, k0);
    const h = w.record.noise();
    const sx = w.sample(u, w.c1, X, h);
    const sy = w.sample(u, w.c1, Y, h);
    expect(sx.members.map((m) => m.at)).toEqual([x1.at, x2.at]);
    expect(sy.members.map((m) => m.at)).toEqual([y1.at]);
    expect(sx.members.filter((m) => sy.members.some((n) => n.at === m.at)), "two conditions' samples intersect").toEqual([]);
    // samplesFor: disjoint and exhaustive over the (unit, currency)'s candidates.
    const all = w.samples.samplesFor(u, w.c1, h);
    if (isUnknown(all)) throw new Error("samplesFor answered Unknown");
    expect(all.map((s) => s.condition)).toEqual([X, Y]);
    expect(all.flatMap((s) => s.members.map((m) => m.at)).sort(compare)).toEqual([x1.at, y1.at, x2.at]);
    // OBJ-19 joins the family once, in MOD-06 (R-35, the S3 partition).
    expect(joins().filter((j) => j.startsWith("Sample "))).toEqual(["Sample src/condition/samples.ts"]);
  });

  it("test_same_condition_draws_form_one_sample", () => {
    const w = world();
    const k0 = w.commitAt(u, w.c0);
    const a = w.draw(u, w.c1, X, k0);
    const b = w.draw(u, w.c1, X, k0);
    const s = w.sample(u, w.c1, X, w.record.noise());
    expect(s).toEqual({ unit: u, currency: w.c1, condition: X, members: [a, b], cardinality: 2, closure: { kind: "open" }, heldBehind: "AE-3" });
    // As of a height: nothing above it.
    expect(w.sample(u, w.c1, X, a.at).members).toEqual([a]);
  });
});

describe("BC-06-4 - closure: the first revision away, or the first acceptance (R-53, R-55)", () => {
  it("test_a_sample_closes_by_a_revision_or_a_commitment_whichever_is_first", () => {
    const w = world();
    const k0 = w.commitAt(u, w.c0);
    // By a revision to ANOTHER condition, after the sample's first member.
    w.draw(u, w.c1, X, k0);
    const beforeRev = w.record.noise();
    const rev = w.revisions.revise(u, w.c1, Y, "HUMAN");
    expect(w.sample(u, w.c1, X, beforeRev).closure).toEqual({ kind: "open" });
    expect(w.sample(u, w.c1, X, rev.at).closure).toEqual({ kind: "closed-by-revision", revision: rev.at });
    // R-55: a draw under X after the revision joins X's own sample, which stays closed.
    const late = w.draw(u, w.c1, X, k0);
    const sx = w.sample(u, w.c1, X, w.record.noise());
    expect([sx.members.at(-1)?.at, sx.closure]).toEqual([late.at, { kind: "closed-by-revision", revision: rev.at }]);
    // By a commitment accepting a member; the earliest event wins, and an invalidation does not reopen it.
    const y1 = w.draw(u, w.c1, Y, k0);
    const ky = w.commitments.commit(y1, "HUMAN");
    const after = w.revisions.revise(u, w.c1, X, "HUMAN");
    expect(w.sample(u, w.c1, Y, after.at).closure).toEqual({ kind: "closed-by-commitment", commitment: ky.at });
    w.invalidate(ky);
    expect(w.sample(u, w.c1, Y, w.record.noise()).closure, "an invalidation reopened the sample").toEqual({ kind: "closed-by-commitment", commitment: ky.at });
    // Neither a revision BEFORE the first member, nor one naming the SAME condition, closes it.
    const kv = w.commitAt(v, w.c0);
    w.revisions.revise(v, w.c1, Y, "HUMAN");
    w.draw(v, w.c1, X, kv);
    w.revisions.revise(v, w.c1, X, "HUMAN");
    expect(w.sample(v, w.c1, X, w.record.noise()).closure).toEqual({ kind: "open" });
  });
});

describe("BC-06-5 - HOOK-06: an assembly whose members do not share the identity is rejected", () => {
  it("test_an_assembly_of_mixed_conditions_is_rejected_hook_06", () => {
    const w = world();
    const k0 = w.commitAt(u, w.c0);
    const x1 = w.draw(u, w.c1, X, k0);
    const y1 = w.draw(u, w.c1, Y, k0);
    const h = w.record.noise();
    // Divergence injected (CC-6): a candidate source that answers a member of another condition.
    const lying = new Samples({ candidates: { candidatesAsOf: () => [x1, y1] }, draws: w.draws, revisions: w.revisions, lineage: w.lineage });
    expect(lying.of(u, w.c1, X).compute(h)).toEqual(refuse("mixed-conditions"));
    expect(lying.samplesFor(u, w.c1, h), "samplesFor collapsed the refusal").toEqual(refuse("mixed-conditions"));
    expect(w.sample(u, w.c1, X, h).members).toEqual([x1]);
  });
});

describe("BC-06-6 - OBJ-27: chains are maximal paths of inheriting units (R-54)", () => {
  it("test_chains_are_maximal_paths_of_inheriting_units", () => {
    const w = world();
    /** `unit` inherits at the least currency from `donor`, and commits to it (R-40, R-41). */
    const inherit = (unit: Unit, donor: Commitment): Commitment => w.commitments.commit(w.draw(unit, w.c0, "inherit", donor), "HUMAN");
    const ku = w.commitAt(u, w.c0); // u is independent: a head
    const kv = inherit(v, ku);
    const kx = inherit(x, ku);
    const beforeY = w.record.noise();
    const ky = inherit(y, kv);
    w.commitAt(z, w.c0); // independent, and nobody inherits from it: in no chain
    const h = w.record.noise();
    const now = w.chainsAt(h);
    expect(now.map((c) => c.units), "the maximal paths").toEqual([[u, v, y], [u, x]]);
    expect(now[0]?.edges).toEqual([
      { from: u, to: v, donor: ku.at, candidate: kv.payload.candidate, commitment: kv.at },
      { from: v, to: y, donor: kv.at, candidate: ky.payload.candidate, commitment: ky.at },
    ]);
    expect(w.chainsAt(beforeY).map((c) => c.units), "a chain was read above its height").toEqual([[u, v], [u, x]]);
    // Only a commitment IN FORCE makes an edge: x's, once invalidated, does not.
    w.invalidate(kx);
    expect(w.chainsAt(w.record.noise()).map((c) => c.units)).toEqual([[u, v, y]]);
    // An inheritance from another of the donor's currencies counts too (R-40).
    const ku1 = w.commitAt(u, w.c1);
    inherit(x, ku1);
    expect(w.chainsAt(w.record.noise()).map((c) => c.units)).toEqual([[u, v, y], [u, x]]);
    // OBJ-27 joins the family once, in MOD-06.
    expect(joins().filter((j) => j.startsWith("Chain "))).toEqual(["Chain src/condition/chains.ts"]);
  });
});

describe("DR-42 - Chains surface the fold's Unknown as itself (R-61; RC-1, IR-42)", () => {
  it("test_chains_surface_the_folds_unknown", () => {
    const w = world();
    const ku = w.commitAt(u, w.c0);
    // v holds TWO least-currency commitments in force: the fold answers uncomputable (R-20), and
    // so must the chains - never "no edge".
    w.commitments.commit(w.draw(v, w.c0, "inherit", ku), "HUMAN");
    w.commitments.commit(w.draw(v, w.c0, "inherit", ku), "HUMAN");
    expect(w.chains.chains().compute(w.record.noise())).toEqual(uncomputable("two-effective-commitments"));
    // The order's own refusal passes through too.
    const refusing = new Chains({ lineage: w.lineage, commitments: w.commitments, currencies: { predecessors: () => refuse("not-in-order") } });
    expect(refusing.chains().compute(w.record.noise())).toEqual(refuse("not-in-order"));
  });
});

describe("BC-06-7 - MOD-05's lineage reader reads whole (IR-90)", () => {
  it("test_the_lineage_reader_reads_every_candidate_and_commitment", () => {
    const w = world();
    const k0 = w.commitAt(u, w.c0);
    const before = w.record.noise();
    const a = w.drawAt(u, w.c1);
    const h = w.record.noise();
    expect(w.lineage.candidatesAsOf(h)).toEqual([
      { at: k0.payload.candidate, unit: u, currency: w.c0, from: noSubject() },
      { at: a.at, unit: u, currency: w.c1, from: k0.at },
    ]);
    expect(w.lineage.candidatesAsOf(before).map((c) => c.at)).toEqual([k0.payload.candidate]);
    expect(w.lineage.commitmentsAsOf(h)).toEqual([{ at: k0.at, unit: u, currency: w.c0, candidate: k0.payload.candidate }]);
    const forged = w.record.append({ author: "ENGINE", payload: { kind: "commitment", unit: u, currency: w.c1, candidate: a.at } });
    expect(w.lineage.commitmentsAsOf(forged), "a non-HUMAN commitment was read").toHaveLength(1);
  });
});
