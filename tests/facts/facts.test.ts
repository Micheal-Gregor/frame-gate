/**
 * MOD-05 `facts/` slice 1 - commitments (BC-05-1..BC-05-6). Written before the class
 * and watched failing.
 *
 * The invalidation reader is a stand-in for MOD-12 (R-19), keyed by a commitment's
 * HEIGHT: every fact sits at its own height in an append-only record, so `at` is a
 * commitment's identity (IR-43). The fold mints a fresh frozen value per read, so object
 * identity would be the wrong key.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isUnknown, noSubject, refuse, uncomputable, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import { CurrencyOrder, DeclarationLedger, IndependenceLedger, type Currency, type Unit } from "../../src/catalog/index.js";
import {
  BOTTOM,
  CandidateLedger,
  CommitmentLedger,
  DrawContextLog,
  type Candidate,
  type CandidateProposal,
  type Commitment,
  type DeclarationReader,
  type DrawContext,
  type InvalidationReader,
} from "../../src/facts/index.js";
import { inMemoryRecord } from "../catalog/in-memory-record.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");

const order = new CurrencyOrder({ currencies: ["c0", "c1", "c2"] });
const [c0, c1] = order.currencies() as readonly [Currency, Currency, Currency];
const u = "u1" as Unit;
const v = "u2" as Unit;

/** MOD-12 stand-in: commitment (by height) -> the height from which it is invalidated. */
function invalidations(entries: ReadonlyArray<readonly [RecordHeight, RecordHeight]>): InvalidationReader {
  const from = new Map(entries.map(([of, at]) => [Number(of), Number(at)]));
  return {
    isInvalidated: (commitment: Commitment, at: RecordHeight) => {
      const f = from.get(Number(commitment.at));
      return f !== undefined && Number(at) >= f;
    },
  };
}
const none: InvalidationReader = { isInvalidated: () => false };

const bottom = (x: unknown) => isUnknown(x) && x.kind === "no-subject";

describe("BC-05-1 - the effective commitment is a fold, per (unit, currency), as of a height", () => {
  it("test_no_commitment_folds_to_bottom_never_null", () => {
    const record = inMemoryRecord();
    const ledger = new CommitmentLedger({ record, invalidations: none });
    const h = record.noise();
    const got = ledger.effectiveCommitment(u, c0, h);
    expect(got).not.toBeNull();
    expect(bottom(got), "zero commitments must fold to BOTTOM (NoSubject)").toBe(true);
  });

  it("test_a_commitment_is_in_force_from_its_height_on", () => {
    const record = inMemoryRecord();
    const ledger = new CommitmentLedger({ record, invalidations: none });
    const before = record.noise();
    const k = ledger.commit(u, c0, "HUMAN");
    const later = record.noise();
    expect(bottom(ledger.effectiveCommitment(u, c0, before)), "in force before it was made").toBe(true);
    expect(ledger.effectiveCommitment(u, c0, k.at)).toEqual(k);
    expect(ledger.effectiveCommitment(u, c0, later)).toEqual(k);
  });

  it("test_a_commitment_answers_only_for_its_own_unit_and_currency", () => {
    const record = inMemoryRecord();
    const ledger = new CommitmentLedger({ record, invalidations: none });
    const k = ledger.commit(u, c0, "HUMAN");
    expect(bottom(ledger.effectiveCommitment(v, c0, k.at)), "another unit's commitment counted").toBe(true);
    expect(bottom(ledger.effectiveCommitment(u, c1, k.at)), "another currency's commitment counted").toBe(true);
  });

  it("test_only_the_ledgers_own_human_entries_count", () => {
    const record = inMemoryRecord();
    const ledger = new CommitmentLedger({ record, invalidations: none });
    const forged = record.append({ author: "ENGINE", payload: { kind: "commitment", unit: u, currency: c0 } });
    expect(bottom(ledger.effectiveCommitment(u, c0, forged)), "a non-HUMAN entry was read as a commitment").toBe(true);
  });
});

describe("BC-05-2 - supersession is read through the declared invalidation reader (R-19)", () => {
  it("test_an_invalidated_commitment_is_not_in_force", () => {
    const record = inMemoryRecord();
    const first = new CommitmentLedger({ record, invalidations: none }).commit(u, c0, "HUMAN");
    const invalidatedAt = record.noise();
    const ledger = new CommitmentLedger({ record, invalidations: invalidations([[first.at, invalidatedAt]]) });
    expect(ledger.effectiveCommitment(u, c0, first.at)).toEqual(first); // before the invalidation
    expect(bottom(ledger.effectiveCommitment(u, c0, invalidatedAt)), "an invalidated commitment counted").toBe(true);
  });

  it("test_supersession_answers_the_successor_and_keeps_history", () => {
    const record = inMemoryRecord();
    const plain = new CommitmentLedger({ record, invalidations: none });
    const first = plain.commit(u, c0, "HUMAN");
    const invalidatedAt = record.noise();
    const reader = invalidations([[first.at, invalidatedAt]]);
    const second = new CommitmentLedger({ record, invalidations: reader }).commit(u, c0, "HUMAN");
    const ledger = new CommitmentLedger({ record, invalidations: reader });
    expect(ledger.effectiveCommitment(u, c0, second.at)).toEqual(second);
    expect(ledger.effectiveCommitment(u, c0, first.at)).toEqual(first); // the past is not rewritten
  });
});

describe("BC-05-3 - two effective commitments is uncomputable (R-20)", () => {
  it("test_two_effective_commitments_are_uncomputable_not_chosen", () => {
    const record = inMemoryRecord();
    const ledger = new CommitmentLedger({ record, invalidations: none });
    ledger.commit(u, c0, "HUMAN");
    const second = ledger.commit(u, c0, "HUMAN");
    const got = ledger.effectiveCommitment(u, c0, second.at);
    expect(isUnknown(got) && got.kind === "uncomputable", "a second commitment was chosen or ignored").toBe(true);
    expect(isUnknown(got) && got.kind === "uncomputable" && got.boundary).toBe("two-effective-commitments");
  });
});

describe("BC-05-4 - commit is a HUMAN act", () => {
  it("test_each_commit_appends_exactly_one_entry", () => {
    const record = inMemoryRecord();
    const ledger = new CommitmentLedger({ record, invalidations: none });
    const before = record.noise();
    const k = ledger.commit(u, c0, "HUMAN");
    expect(Number(k.at)).toBe(Number(before) + 1);
    expect(k.author).toBe("HUMAN");
    expect(k.payload).toEqual({ kind: "commitment", unit: u, currency: c0 });
  });

  it("test_a_non_human_author_cannot_commit", () => {
    // OBJ-31 closed_by HUMAN_ACT, at parse: TS2345 for ENGINE; a mayDecide-narrowed
    // author compiles (positive control). Compiled by the ledger checker.
    const out = JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as { fixtures: Record<string, { codes: number[]; messages: string[] }> };
    expect(out.fixtures["tests/fixtures/facts/commit-as-engine.ts"]?.codes).toEqual([2345]);
    expect(out.fixtures["tests/fixtures/facts/commit-after-narrowing.ts"]?.codes).toEqual([]);
  });
});

describe("BC-05-6 - every ledger is listed, so every ledger rule reaches it (RD-12)", () => {
  it("test_every_appended_fact_kind_is_a_listed_ledger", () => {
    type Fact = { file: string; kind: string; brand: string | null };
    const out = JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as { ledgers: { discovered: Fact[]; unlisted: Fact[]; misowned: Fact[]; unbranded: Fact[]; fixtures: Record<string, Record<string, Fact[]>> } };
    // Discovered from every AppendedFact<_, P> alias in src/, never listed here; these are
    // only kinds that must be among them, so a discovery that finds none fails.
    expect(out.ledgers.discovered.map((x) => x.kind)).toEqual(expect.arrayContaining(["declaration", "commitment", "draw-context", "resolution-label", "candidate"]));
    expect(out.ledgers.unlisted, "a ledger kind no rule protects").toEqual([]);
    expect(out.ledgers.misowned, "a ledger kind owned by another root").toEqual([]);
    expect(out.ledgers.unbranded, "a ledger fact whose brand no mint rule knows").toEqual([]);
    // Each verdict is pinned NON-empty as well, judged at the src/ path each fixture mirrors -
    // a discovery that silently answers "nothing" fails here, not only in src/.
    const kinds = (v: Record<string, Fact[]>) => Object.fromEntries(Object.entries(v).map(([k, f]) => [k, f.map((x) => x.kind)]));
    expect(Object.fromEntries(Object.entries(out.ledgers.fixtures).map(([k, v]) => [k, kinds(v)]))).toEqual({
      "src/catalog/violating-misowned-kind.ts": { unlisted: [], misowned: ["commitment"], unbranded: ["commitment"] },
      "src/facts/violating-unlisted-kind.ts": { unlisted: ["ghost"], misowned: [], unbranded: ["ghost"] },
    });
  });
});

describe("BC-05-5 - REF-06: no act signature accepts a diagnostic", () => {
  it("test_no_act_signature_accepts_diagnostic", () => {
    type Finding = { file: string; line: number; act: string; param: string; path: string; how: string };
    const out = JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/act-signatures.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as { acts: { src: string[] }; src: Finding[]; fixtures: Record<string, Finding[]> };
    // Acts are FOUND - anything that appends, to a fixed point - never listed. These are
    // only acts that must be among those found, so a detector that finds none fails.
    expect(out.acts.src).toEqual(expect.arrayContaining([
      "src/catalog/declaration-ledger.ts:DeclarationLedger.declare",
      "src/catalog/independence-ledger.ts:IndependenceLedger.declareIndependence",
      "src/facts/candidate-ledger.ts:CandidateLedger.appendCandidate",
      "src/facts/commitment-ledger.ts:CommitmentLedger.commit",
      "src/facts/draw-context-log.ts:DrawContextLog.label",
      "src/facts/draw-context-log.ts:DrawContextLog.recordDraw",
    ]));
    expect(out.src, "an act in src/ accepts an open type, so it can accept a diagnostic").toEqual([]);
    // Every fixture is pinned, so a new one without an expectation fails too.
    const show = (f: Finding) => `${f.act} ${f.param}${f.path} ${f.how}`;
    const got = Object.fromEntries(Object.entries(out.fixtures).map(([k, v]) => [k.split("/").pop(), v.map(show).sort()]));
    expect(got).toEqual({
      "conforming-acts.ts": [],
      "limit-call-through-port.ts": [],
      "limit-indirect-call.ts": [],
      "violating-any.ts": ["actOnAny proposal any"],
      "violating-class-field.ts": ["FieldActs.act proposal unknown"],
      "violating-closure.ts": ["ClosureAct.act proposal unknown"],
      "violating-empty-object.ts": ["actOnEmpty proposal empty-object", "actOnEmptyInterface proposal empty-object"],
      "violating-nested.ts": [
        "actOnArray p[] unknown",
        "actOnField p.basis unknown",
        "actOnIndex p[key] unknown",
        "actOnMap p<1> object",
        "actOnSource source() unknown",
        "actOnUnion p object",
      ],
      "violating-object.ts": ["actOnObject proposal object", "actOnObjectInterface proposal Object"],
      "violating-through-commit.ts": ["commitBecause because unknown"],
      "violating-type-parameter.ts": ["actOnObjectT proposal type-parameter", "actOnT proposal type-parameter", "actOnUnknownT proposal type-parameter"],
      "violating-unknown.ts": ["actOnUnknown proposal unknown"],
      "violating-wrapper.ts": ["Wrapped.act proposal unknown", "propose proposal unknown"],
    });
  });
});

// ---- slice 2: the draw context (OBJ-16), under R-21..R-24 ------------------------------

/** The catalog's real DeclarationLedger satisfies the declared reader (SEAM-05, R-21). */
function drawWorld() {
  const record = inMemoryRecord();
  const declarations = new DeclarationLedger({ record, levels: ["easy", "hard"] });
  const draws = new DrawContextLog({ record, declarations });
  const scope = record.noise(); // some appended fact; MOD-05 never looks at it (R-23)
  return { record, declarations, draws, scope };
}
const features = { colour: "red", size: 3, lit: true };
const drawn = (x: DrawContext | UnknownValue): DrawContext => {
  if (isUnknown(x)) throw new Error(`setup: the draw answered ${x.kind}`);
  return x;
};
const isRefusal = (x: unknown, guard: string) => isUnknown(x) && x.kind === "refuse" && x.guard === guard;

describe("BC-05-8 - REF-05: a draw with no declaration in force is refused (R-21)", () => {
  it("test_draw_without_declaration_is_refused", () => {
    const { record, declarations, draws, scope } = drawWorld();
    const h = record.noise();
    expect(isRefusal(draws.recordDraw(u, features, scope, "cond", h, "ENGINE"), "no-declaration"), "no declaration at all").toBe(true);
    expect(Number(record.noise()), "a refused draw appended something").toBe(Number(h) + 1);
    // another unit's declaration is not this unit's
    const other = declarations.declare(v, "easy", "HUMAN");
    if (isUnknown(other)) throw new Error("setup");
    expect(isRefusal(draws.recordDraw(u, features, scope, "cond", other.at, "ENGINE"), "no-declaration"), "another unit's declaration counted").toBe(true);
    // a declaration made AFTER the draw height is not in force at it
    const before = record.noise();
    declarations.declare(u, "easy", "HUMAN");
    expect(isRefusal(draws.recordDraw(u, features, scope, "cond", before, "ENGINE"), "no-declaration"), "a later declaration counted").toBe(true);
  });

  it("test_another_unknown_from_the_reader_is_passed_through_not_collapsed", () => {
    const record = inMemoryRecord();
    const odd = uncomputable("reader-boundary");
    const reader: DeclarationReader = { declarationAt: () => odd };
    const h = record.noise();
    const got = new DrawContextLog({ record, declarations: reader }).recordDraw(u, features, h, "cond", h, "ENGINE");
    expect(got, "an Unknown from the reader was collapsed into the refusal").toEqual(odd);
    expect(Number(record.noise()), "an unanswerable draw appended something").toBe(Number(h) + 1);
  });
});

describe("BC-05-9 - the recorded declaration is the one in force at the draw height (R-21, S-08)", () => {
  it("test_the_recorded_declaration_is_the_one_in_force_at_draw_time", () => {
    const { record, declarations, draws, scope } = drawWorld();
    const d1 = declarations.declare(u, "easy", "HUMAN");
    const h1 = record.noise();
    const d2 = declarations.declare(u, "hard", "HUMAN");
    const h2 = record.noise();
    if (isUnknown(d1) || isUnknown(d2)) throw new Error("setup");
    // Drawn strictly ABOVE each declaration, so the draw height and the declaration's height
    // differ: recording the one for the other is visible (battery 11, D4 survived without it).
    expect(drawn(draws.recordDraw(u, features, scope, "cond", h1, "ENGINE")).payload.declaration).toBe(d1.at);
    expect(drawn(draws.recordDraw(u, features, scope, "cond", h2, "ENGINE")).payload.declaration).toBe(d2.at);
  });

  it("test_a_redeclaration_does_not_rewrite_a_recorded_draw", () => {
    const { record, declarations, draws, scope } = drawWorld();
    const d1 = declarations.declare(u, "easy", "HUMAN");
    if (isUnknown(d1)) throw new Error("setup");
    const k = drawn(draws.recordDraw(u, features, scope, "cond", d1.at, "ENGINE"));
    declarations.declare(u, "hard", "HUMAN");
    const later = record.noise();
    const [read] = draws.drawsAsOf(u, later);
    expect(read, "the recorded draw changed after a re-declaration").toEqual(k);
    expect(read?.payload.declaration).toBe(d1.at);
  });
});

describe("BC-05-10 - draw-time features are given and recorded as given (R-22)", () => {
  it("test_features_are_recorded_as_given_and_frozen", () => {
    const { declarations, draws, scope } = drawWorld();
    const d = declarations.declare(u, "easy", "HUMAN");
    if (isUnknown(d)) throw new Error("setup");
    const given: Record<string, string | number | boolean> = { colour: "red", size: 3 };
    const k = drawn(draws.recordDraw(u, given, scope, "cond", d.at, "ENGINE"));
    given["colour"] = "blue";
    expect(k.payload.features).toEqual({ colour: "red", size: 3 });
    expect(draws.drawsAsOf(u, k.at)[0]?.payload.features, "the caller's later change reached the record").toEqual({ colour: "red", size: 3 });
  });

  it("test_no_module_but_advisory_reads_unit_features", () => {
    // F1: features(unit) is MOD-13's alone (SEAM-27). Decided by resolution; each fixture
    // is judged at the src/ path it mirrors.
    type Finding = { file: string; line: number; how: string };
    const out = JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as { reach: { src: Finding[]; fixtures: Record<string, Finding[]> } };
    expect(out.reach.src, "a module other than MOD-13 reads unit features").toEqual([]);
    expect(Object.fromEntries(Object.entries(out.reach.fixtures).map(([k, f]) => [k, f.map((x) => x.how).sort()]))).toEqual({
      "src/advisory/conforming-reads-features.ts": [],
      "src/facts/conforming-features-given.ts": [],
      "src/facts/limit-cast-member.ts": [],
      "src/facts/violating-destructures-features.ts": ["features-reference"],
      "src/facts/violating-reads-features-by-key.ts": ["features-read"],
      "src/facts/violating-reads-features.ts": ["features-read"],
      "src/facts/violating-references-features-by-key.ts": ["features-reference"],
      "src/facts/violating-references-features.ts": ["features-reference"],
    });
  });
});

describe("BC-05-11 - scope and condition are carried, not interpreted (R-23)", () => {
  it("test_scope_and_condition_are_carried_as_given", () => {
    const { record, declarations, draws } = drawWorld();
    const d = declarations.declare(u, "easy", "HUMAN");
    if (isUnknown(d)) throw new Error("setup");
    const notAScope = record.noise(); // MOD-05 cannot tell, and must not try
    const k = drawn(draws.recordDraw(u, features, notAScope, "condition-7f3a", d.at, "ENGINE"));
    expect(k.payload.scope).toBe(notAScope);
    expect(k.payload.condition).toBe("condition-7f3a");
  });
});

describe("BC-05-12 - the resolution label is a later append, read as of a height (R-24)", () => {
  function oneDraw() {
    const w = drawWorld();
    const d = w.declarations.declare(u, "easy", "HUMAN");
    if (isUnknown(d)) throw new Error("setup");
    return { ...w, k: drawn(w.draws.recordDraw(u, features, w.scope, "cond", d.at, "ENGINE")) };
  }

  it("test_an_unlabelled_draw_has_no_resolution_yet", () => {
    const { record, draws, k } = oneDraw();
    expect(bottom(draws.resolutionAt(k, k.at))).toBe(true);
    expect(bottom(draws.resolutionAt(k, record.noise())), "an unlabelled draw answered something other than NoSubject").toBe(true);
  });

  it("test_a_label_answers_from_its_own_height_on", () => {
    const { record, draws, k } = oneDraw();
    const before = record.noise();
    const l = draws.label(k, "REVISION", "HUMAN");
    expect(l.payload).toEqual({ kind: "resolution-label", context: k.at, resolution: "REVISION" });
    expect(bottom(draws.resolutionAt(k, before)), "the label was in force before it was made").toBe(true);
    expect(draws.resolutionAt(k, l.at)).toBe("REVISION");
  });

  it("test_two_labels_are_uncomputable_not_chosen", () => {
    const { draws, k } = oneDraw();
    draws.label(k, "DRAW", "HUMAN");
    const second = draws.label(k, "REVISION", "HUMAN");
    const got = draws.resolutionAt(k, second.at);
    expect(isUnknown(got) && got.kind === "uncomputable" && got.boundary, "a label was chosen").toBe("two-resolution-labels");
  });

  it("test_a_label_for_another_draw_does_not_count", () => {
    const { declarations, draws, scope, k } = oneDraw();
    const d = declarations.declare(u, "easy", "HUMAN");
    if (isUnknown(d)) throw new Error("setup");
    const other = drawn(draws.recordDraw(u, features, scope, "cond", d.at, "ENGINE"));
    const l = draws.label(other, "DRAW", "HUMAN");
    expect(bottom(draws.resolutionAt(k, l.at)), "another draw's label counted").toBe(true);
  });
});

describe("BC-05-13 - draws are read as of a height, per unit", () => {
  it("test_draws_are_read_per_unit_as_of_a_height", () => {
    const { record, declarations, draws, scope } = drawWorld();
    const du = declarations.declare(u, "easy", "HUMAN");
    const dv = declarations.declare(v, "easy", "HUMAN");
    if (isUnknown(du) || isUnknown(dv)) throw new Error("setup");
    const k1 = drawn(draws.recordDraw(u, features, scope, "a", dv.at, "ENGINE"));
    drawn(draws.recordDraw(v, features, scope, "b", dv.at, "ENGINE"));
    record.noise();
    const k2 = drawn(draws.recordDraw(u, features, scope, "c", dv.at, "DIRECTOR"));
    expect(draws.drawsAsOf(u, k2.at)).toEqual([k1, k2]);
    expect(draws.drawsAsOf(u, k1.at), "a later draw was visible before its height").toEqual([k1]);
    expect(draws.drawsAsOf(u, du.at), "a draw was visible before it was made").toEqual([]);
  });
});

// ---- slice 3: candidates (OBJ-11), under R-18 and R-25..R-28 -------------------------------

const [, , c2] = order.currencies() as readonly [Currency, Currency, Currency];
type Answers = {
  readonly admission?: "ADMIT" | UnknownValue;
  readonly signature?: "VERIFIED" | UnknownValue;
  readonly ceiling?: "WITHIN" | UnknownValue;
};
/** Real MOD-03/MOD-05 collaborators; stand-ins for MOD-04, MOD-12 and MOD-11 that log being asked. */
function candidateWorld(answers: Answers = {}) {
  const record = inMemoryRecord();
  const commitments = new CommitmentLedger({ record, invalidations: none });
  const independence = new IndependenceLedger({ record });
  const asked: string[] = [];
  const seen: { proposal?: CandidateProposal; signature?: string } = {};
  const ledger = new CandidateLedger({
    record,
    commitments,
    currencies: order,
    independence,
    admission: { admit: () => (asked.push("admission"), answers.admission ?? "ADMIT") },
    signatures: {
      check: (proposal, signature) => {
        asked.push("signature");
        seen.proposal = proposal;
        seen.signature = signature;
        return answers.signature ?? "VERIFIED";
      },
    },
    ceiling: { admitsDraw: () => (asked.push("ceiling"), answers.ceiling ?? "WITHIN") },
  });
  return { record, commitments, independence, ledger, asked, seen };
}
const proposal = (currency: Currency, from: CandidateProposal["from"], condition = "cond", unit = u): CandidateProposal =>
  ({ unit, currency, condition, seed: "seed-1", from });
const candidate = (x: Candidate | UnknownValue): Candidate => {
  if (isUnknown(x)) throw new Error(`setup: the candidate answered ${x.kind}`);
  return x;
};
/** Asserts nothing was appended since `h`: the next append lands at h + 1. */
const nothingAppendedSince = (record: ReturnType<typeof inMemoryRecord>, h: RecordHeight) =>
  expect(Number(record.noise()), "a refused candidate appended something").toBe(Number(h) + 1);

describe("BC-05-15 - one guarded append; an unreachable draw costs nothing (S-01, REF-03)", () => {
  it("test_an_unreachable_draw_appends_nothing_and_asks_no_one_else", () => {
    const unreachable = refuse("unreachable");
    const { record, commitments, ledger, asked } = candidateWorld({ admission: unreachable });
    const k0 = commitments.commit(u, c0, "HUMAN");
    const h = record.noise();
    expect(ledger.appendCandidate(proposal(c1, k0), "sig", h, "ENGINE"), "MOD-04's refusal was not passed through").toEqual(unreachable);
    nothingAppendedSince(record, h);
    expect(asked, "a decider after admission was asked: the draw cost something").toEqual(["admission"]);
  });

  it("test_each_ledger_kind_has_exactly_one_append_path", () => {
    // S-01: "exactly one such entry point; no alternate, bulk, administrative, backfill or
    // test path". Resolved by TYPE: every function in src/ whose RecordPort.append carries a
    // ledger kind, mapped kind -> appenders. One each, for every ledger, not only candidates.
    type Path = { kind: string; fn: string; file: string };
    const out = JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as { paths: { src: Record<string, string[]>; fixtures: Record<string, Path[]> } };
    expect(out.paths.src).toEqual({
      candidate: ["CandidateLedger.appendCandidate"],
      commitment: ["CommitmentLedger.commit"],
      declaration: ["DeclarationLedger.declare"],
      "draw-context": ["DrawContextLog.recordDraw"],
      independence: ["IndependenceLedger.declareIndependence"],
      "resolution-label": ["DrawContextLog.label"],
    });
    expect(Object.fromEntries(Object.entries(out.paths.fixtures).map(([k, v]) => [k, v.map((x) => `${x.kind} ${x.fn}`).sort()]))).toEqual({
      "src/facts/limit-untyped-entry.ts": [],
      "src/facts/violating-backfill-path.ts": ["candidate CandidateBackfill.backfill", "candidate CandidateBackfill.replay"],
    });
  });
});

describe("BC-05-16 - from is the effective commitment immediately below, as of the append height (R-26)", () => {
  const malformed = (x: unknown) => isRefusal(x, "malformed-from");

  it("test_from_must_be_the_effective_commitment_immediately_below", () => {
    const { record, commitments, ledger } = candidateWorld();
    const k0 = commitments.commit(u, c0, "HUMAN");
    const other = commitments.commit(v, c0, "HUMAN");
    const k1 = commitments.commit(u, c1, "HUMAN");
    const h = record.noise();
    expect(malformed(ledger.appendCandidate(proposal(c1, BOTTOM), "sig", h, "ENGINE")), "BOTTOM above the least currency").toBe(true);
    expect(malformed(ledger.appendCandidate(proposal(c1, other), "sig", h, "ENGINE")), "another unit's commitment").toBe(true);
    expect(malformed(ledger.appendCandidate(proposal(c2, k0), "sig", h, "ENGINE")), "a commitment two currencies below").toBe(true);
    nothingAppendedSince(record, h);
    const h2 = record.noise();
    expect(candidate(ledger.appendCandidate(proposal(c1, k0), "sig", h2, "ENGINE")).payload.from).toBe(k0.at);
    expect(candidate(ledger.appendCandidate(proposal(c2, k1), "sig", h2, "ENGINE")).payload.from).toBe(k1.at);
  });

  it("test_a_superseded_commitment_is_not_a_from", () => {
    const w = candidateWorld();
    const a = w.commitments.commit(u, c0, "HUMAN");
    const cut = w.record.noise();
    const later = new CommitmentLedger({ record: w.record, invalidations: invalidations([[a.at, cut]]) });
    const b = later.commit(u, c0, "HUMAN");
    const ledger = new CandidateLedger({
      record: w.record,
      commitments: later,
      currencies: order,
      independence: w.independence,
      admission: { admit: () => "ADMIT" },
      signatures: { check: () => "VERIFIED" },
      ceiling: { admitsDraw: () => "WITHIN" },
    });
    const h = w.record.noise();
    expect(malformed(ledger.appendCandidate(proposal(c1, a), "sig", h, "ENGINE")), "a superseded commitment was a from").toBe(true);
    expect(candidate(ledger.appendCandidate(proposal(c1, b), "sig", h, "ENGINE")).payload.from).toBe(b.at);
  });

  it("test_bottom_from_needs_an_independence_license_at_the_least_currency", () => {
    const { record, commitments, independence, ledger } = candidateWorld();
    const h = record.noise();
    expect(malformed(ledger.appendCandidate(proposal(c0, BOTTOM), "sig", h, "ENGINE")), "BOTTOM with no independence act").toBe(true);
    const licensed = independence.declareIndependence(u, true, "HUMAN");
    expect(malformed(ledger.appendCandidate(proposal(c0, BOTTOM), "sig", h, "ENGINE")), "a license made after the height counted").toBe(true);
    expect(candidate(ledger.appendCandidate(proposal(c0, BOTTOM), "sig", licensed.at, "ENGINE")).payload.from).toEqual(noSubject());
    // While LICENSED: a Commitment is still no `from` at the least currency - nothing lies below
    // it, and the license must not mask that (battery 12, before the run).
    const k0 = commitments.commit(u, c0, "HUMAN");
    expect(malformed(ledger.appendCandidate(proposal(c0, k0), "sig", k0.at, "ENGINE")), "a commitment as from at the least currency, licensed").toBe(true);
    const withdrawn = independence.declareIndependence(u, false, "HUMAN");
    expect(malformed(ledger.appendCandidate(proposal(c0, BOTTOM), "sig", withdrawn.at, "ENGINE")), "a withdrawn license counted").toBe(true);
  });

  it("test_an_unanswerable_from_check_passes_the_unknown_through", () => {
    // IR-55: only "none" is the malformation; R-20's uncomputable is passed through, not
    // collapsed into malformed-from.
    const { record, commitments, ledger } = candidateWorld();
    const k0 = commitments.commit(u, c0, "HUMAN");
    commitments.commit(u, c0, "HUMAN");
    const h = record.noise();
    expect(ledger.appendCandidate(proposal(c1, k0), "sig", h, "ENGINE")).toEqual(uncomputable("two-effective-commitments"));
    nothingAppendedSince(record, h);
  });

  it("test_a_bottom_from_is_recorded_as_a_fresh_value", () => {
    const { independence, ledger } = candidateWorld();
    const licensed = independence.declareIndependence(u, true, "HUMAN");
    const mine: { kind: "no-subject" } = { kind: "no-subject" };
    const k = candidate(ledger.appendCandidate(proposal(c0, mine), "sig", licensed.at, "ENGINE"));
    (mine as { kind: string }).kind = "latent";
    expect(ledger.candidatesAsOf(u, c0, "cond", k.at)[0]?.payload.from, "the caller's later change reached the record").toEqual(noSubject());
  });
});

describe("BC-05-17/18 - the signature and the ceiling are asked on the same path (R-25, R-27)", () => {
  it("test_the_signature_check_sees_the_whole_proposal_and_its_refusal_passes_through", () => {
    const bad = refuse("malformed-signature");
    const { record, commitments, ledger, seen } = candidateWorld({ signature: bad });
    const k0 = commitments.commit(u, c0, "HUMAN");
    const h = record.noise();
    const p = proposal(c1, k0);
    expect(ledger.appendCandidate(p, "sig-7", h, "ENGINE")).toEqual(bad);
    nothingAppendedSince(record, h);
    expect(seen.proposal, "MOD-12 did not see the whole proposal, from included").toEqual(p);
    expect(seen.signature).toBe("sig-7");
  });

  it("test_draw_beyond_the_scope_ceiling_is_refused_on_the_append_path", () => {
    const exceeded = refuse("scope-exceeded");
    const { record, commitments, ledger } = candidateWorld({ ceiling: exceeded });
    const k0 = commitments.commit(u, c0, "HUMAN");
    const h = record.noise();
    expect(ledger.appendCandidate(proposal(c1, k0), "sig", h, "ENGINE")).toEqual(exceeded);
    nothingAppendedSince(record, h);
  });
});

describe("BC-05-19 - refusal order: admission, from, signature, ceiling (R-28)", () => {
  it("test_refusals_answer_in_order_and_later_deciders_are_not_asked", () => {
    const A = refuse("unreachable");
    const S = refuse("malformed-signature");
    const C = refuse("scope-exceeded");
    const cases: ReadonlyArray<readonly [Answers, boolean, UnknownValue, readonly string[]]> = [
      [{ admission: A, signature: S, ceiling: C }, true, A, ["admission"]],
      [{ signature: S, ceiling: C }, true, refuse("malformed-from"), ["admission"]],
      [{ signature: S, ceiling: C }, false, S, ["admission", "signature"]],
      [{ ceiling: C }, false, C, ["admission", "signature", "ceiling"]],
    ];
    for (const [answers, badFrom, expected, order_] of cases) {
      const { record, commitments, ledger, asked } = candidateWorld(answers);
      const k0 = commitments.commit(u, c0, "HUMAN");
      const h = record.noise();
      expect(ledger.appendCandidate(proposal(c1, badFrom ? BOTTOM : k0), "sig", h, "ENGINE")).toEqual(expected);
      expect(asked, `asked out of order for ${JSON.stringify(expected)}`).toEqual(order_);
      nothingAppendedSince(record, h);
    }
  });
});

describe("BC-05-20 - a good candidate is appended once, carrying its lineage", () => {
  it("test_a_good_candidate_is_appended_once_with_its_lineage", () => {
    const { record, commitments, ledger, asked } = candidateWorld();
    const k0 = commitments.commit(u, c0, "HUMAN");
    const h = record.noise();
    const k = candidate(ledger.appendCandidate(proposal(c1, k0, "cond-9"), "sig-1", h, "DIRECTOR"));
    expect(Number(k.at)).toBe(Number(h) + 1);
    expect(k.author).toBe("DIRECTOR");
    expect(k.payload).toEqual({ kind: "candidate", unit: u, currency: c1, condition: "cond-9", seed: "seed-1", from: k0.at, signature: "sig-1" });
    expect(asked).toEqual(["admission", "signature", "ceiling"]);
  });
});

describe("BC-05-21 - candidates are read as of a height (S-09, SEAM-22, lineage)", () => {
  function three() {
    const w = candidateWorld();
    w.independence.declareIndependence(u, true, "HUMAN");
    w.independence.declareIndependence(v, true, "HUMAN");
    const k0 = w.commitments.commit(u, c0, "HUMAN");
    const h = w.record.noise();
    const a = candidate(w.ledger.appendCandidate(proposal(c1, k0, "x"), "s", h, "ENGINE"));
    const b = candidate(w.ledger.appendCandidate(proposal(c1, k0, "y"), "s", h, "ENGINE"));
    const c = candidate(w.ledger.appendCandidate(proposal(c0, BOTTOM, "x"), "s", h, "ENGINE"));
    const d = candidate(w.ledger.appendCandidate(proposal(c0, BOTTOM, "x", v), "s", h, "ENGINE"));
    const e = candidate(w.ledger.appendCandidate(proposal(c1, k0, "x"), "s", h, "ENGINE"));
    return { ...w, k0, a, b, c, d, e };
  }

  it("test_candidates_are_read_by_condition_identity_as_of_a_height", () => {
    const { ledger, a, e } = three();
    expect(ledger.candidatesAsOf(u, c1, "x", e.at)).toEqual([a, e]);
    expect(ledger.candidatesAsOf(u, c1, "x", a.at), "a later candidate was visible before its height").toEqual([a]);
    expect(ledger.candidatesAsOf(u, c1, "z", e.at), "a condition with no draws is not empty").toEqual([]);
  });

  it("test_derived_from_answers_the_lineage", () => {
    const { ledger, k0, a, b, e } = three();
    expect(ledger.derivedFrom(k0, e.at)).toEqual([a, b, e]);
    expect(ledger.derivedFrom(k0, b.at)).toEqual([a, b]);
  });

  it("test_counts_are_per_currency_in_order_never_summed", () => {
    const { ledger, e } = three();
    expect(ledger.countsAsOf(u, e.at)).toEqual([
      { currency: c0, count: 1 },
      { currency: c1, count: 3 },
      { currency: c2, count: 0 },
    ]);
    expect(ledger.countsAsOf(v, e.at)).toEqual([
      { currency: c0, count: 1 },
      { currency: c1, count: 0 },
      { currency: c2, count: 0 },
    ]);
  });
});

