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
  COMMIT_GATE,
  CandidateLedger,
  CommitmentLedger,
  DrawContextLog,
  LineageReader,
  type Candidate,
  type CandidateProposal,
  type Commitment,
  type DeclarationReader,
  type DrawContext,
  type InvalidationReader,
} from "../../src/facts/index.js";
import { inMemoryRecord } from "../catalog/in-memory-record.js";
import { factWorld } from "../support/fact-world.js";

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

/** R-41: every commitment accepts a real candidate, drawn through the real path. */
const world = (reader: InvalidationReader = none) => factWorld({ currencies: ["c0", "c1", "c2"], invalidations: reader });

describe("BC-05-1 - the effective commitment is a fold, per (unit, currency), as of a height", () => {
  it("test_no_commitment_folds_to_bottom_never_null", () => {
    const w = world();
    const h = w.record.noise();
    const got = w.commitments.effectiveCommitment(u, c0, h);
    expect(got).not.toBeNull();
    expect(bottom(got), "zero commitments must fold to BOTTOM (NoSubject)").toBe(true);
  });

  it("test_a_commitment_is_in_force_from_its_height_on", () => {
    const w = world();
    const before = w.record.noise();
    const k = w.commitAt(u, c0);
    const later = w.record.noise();
    expect(bottom(w.commitments.effectiveCommitment(u, c0, before)), "in force before it was made").toBe(true);
    expect(w.commitments.effectiveCommitment(u, c0, k.at)).toEqual(k);
    expect(w.commitments.effectiveCommitment(u, c0, later)).toEqual(k);
  });

  it("test_a_commitment_answers_only_for_its_own_unit_and_currency", () => {
    const w = world();
    const k = w.commitAt(u, c0);
    expect(bottom(w.commitments.effectiveCommitment(v, c0, k.at)), "another unit's commitment counted").toBe(true);
    expect(bottom(w.commitments.effectiveCommitment(u, c1, k.at)), "another currency's commitment counted").toBe(true);
  });

  it("test_only_the_ledgers_own_human_entries_count", () => {
    const w = world();
    const k = w.drawAt(u, c0);
    const forged = w.record.append({ author: "ENGINE", payload: { kind: "commitment", unit: u, currency: c0, candidate: k.at } });
    expect(bottom(w.commitments.effectiveCommitment(u, c0, forged)), "a non-HUMAN entry was read as a commitment").toBe(true);
    // R-41: every commitment names its candidate, so an entry naming none was not appended by
    // this ledger (pinned with the change).
    const bare = w.record.append({ author: "HUMAN", payload: { kind: "commitment", unit: u, currency: c0 } });
    expect(bottom(w.commitments.effectiveCommitment(u, c0, bare)), "a commitment naming no candidate was read").toBe(true);
  });
});

describe("BC-05-2 - supersession is read through the declared invalidation reader (R-19)", () => {
  it("test_an_invalidated_commitment_is_not_in_force", () => {
    const w = world();
    const first = w.commitAt(u, c0);
    const invalidatedAt = w.record.noise();
    const ledger = new CommitmentLedger({ record: w.record, invalidations: invalidations([[first.at, invalidatedAt]]) });
    expect(ledger.effectiveCommitment(u, c0, first.at)).toEqual(first); // before the invalidation
    expect(bottom(ledger.effectiveCommitment(u, c0, invalidatedAt)), "an invalidated commitment counted").toBe(true);
  });

  it("test_supersession_answers_the_successor_and_keeps_history", () => {
    const w = world();
    const first = w.commitAt(u, c0);
    const invalidatedAt = w.record.noise();
    const ledger = new CommitmentLedger({ record: w.record, invalidations: invalidations([[first.at, invalidatedAt]]) });
    const second = ledger.commit(w.drawAt(u, c0), "HUMAN");
    expect(ledger.effectiveCommitment(u, c0, second.at)).toEqual(second);
    expect(ledger.effectiveCommitment(u, c0, first.at)).toEqual(first); // the past is not rewritten
  });
});

describe("BC-05-3 - two effective commitments is uncomputable (R-20)", () => {
  it("test_two_effective_commitments_are_uncomputable_not_chosen", () => {
    const w = world();
    w.commitAt(u, c0);
    const second = w.commitAt(u, c0);
    const got = w.commitments.effectiveCommitment(u, c0, second.at);
    expect(isUnknown(got) && got.kind === "uncomputable", "a second commitment was chosen or ignored").toBe(true);
    expect(isUnknown(got) && got.kind === "uncomputable" && got.boundary).toBe("two-effective-commitments");
  });
});

describe("BC-05-4 / BC-05-31 - commit is a HUMAN act, and names the candidate it accepts (R-41)", () => {
  it("test_each_commit_appends_exactly_one_entry", () => {
    const w = world();
    const accepted = w.drawAt(u, c0);
    const before = w.record.noise();
    const k = w.commitments.commit(accepted, "HUMAN");
    expect(Number(k.at)).toBe(Number(before) + 1);
    expect(k.author).toBe("HUMAN");
    expect(k.payload).toEqual({ kind: "commitment", unit: u, currency: c0, candidate: accepted.at });
  });

  it("test_a_commitment_names_the_candidate_it_accepts", () => {
    // R-41 (F4 Accepted; S-07; SEAM-11): unit and currency come FROM the candidate; it is
    // recorded by height, so Accepted is read by key, never inferred.
    const w = world();
    w.commitAt(v, c0);
    const accepted = w.drawAt(v, c1);
    const k = w.commitments.commit(accepted, "HUMAN");
    expect([k.payload.unit, k.payload.currency, k.payload.candidate]).toEqual([v, c1, accepted.at]);
    expect(w.commitments.effectiveCommitment(v, c1, k.at)).toEqual(k);
  });

  it("test_a_commitment_accepts_only_a_minted_candidate", () => {
    // R-41 at parse: a look-alike with every field but the brand does not compile (pinned
    // before battery 18). Compiled by the ledger checker.
    const out = JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as { fixtures: Record<string, { codes: number[]; messages: string[] }> };
    expect(out.fixtures["tests/fixtures/facts/commit-a-look-alike.ts"]?.codes, "a look-alike candidate was committed").toEqual([2345]);
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
      "limit-library-member.ts": [],
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

// ---- slice 3: candidates (OBJ-11), under R-18, R-25..R-28 and R-31 ---------------------------

const [, , c2] = order.currencies() as readonly [Currency, Currency, Currency];
type Answers = {
  readonly admission?: "ADMIT" | UnknownValue;
  readonly signature?: "VERIFIED" | UnknownValue;
  readonly ceiling?: "WITHIN" | UnknownValue;
};
const candidate = (x: Candidate | UnknownValue): Candidate => {
  if (isUnknown(x)) throw new Error(`setup: the candidate answered ${x.kind}`);
  return x;
};
/**
 * Real MOD-03/MOD-05 collaborators - a declaration for u and for v, a draw-context log over the
 * same record - and stand-ins for MOD-04, MOD-12 and MOD-11 that log being asked.
 */
function candidateWorld(answers: Answers = {}) {
  const record = inMemoryRecord();
  const declarations = new DeclarationLedger({ record, levels: ["easy", "hard"] });
  declarations.declare(u, "easy", "HUMAN");
  declarations.declare(v, "easy", "HUMAN");
  const draws = new DrawContextLog({ record, declarations });
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
  // SETUP commitments (R-41) are drawn through a second ledger over the same record whose deciders
  // always pass, under condition `setup`: they are never what a test asks about, and they never
  // appear in `asked`.
  const setup = new CandidateLedger({
    record,
    commitments,
    currencies: order,
    independence,
    admission: { admit: () => "ADMIT" },
    signatures: { check: () => "VERIFIED" },
    ceiling: { admitsDraw: () => "WITHIN" },
  });
  const drawAt = (unit: Unit, currency: Currency): Candidate => {
    const below = order.predecessors(currency);
    if (isUnknown(below)) throw new Error("setup");
    const immediate = below.at(-1);
    let from: CandidateProposal["from"] = BOTTOM;
    if (immediate === undefined) {
      const license = independence.independenceAt(unit, record.noise());
      if (isUnknown(license) || !license.payload.independent) independence.declareIndependence(unit, true, "HUMAN");
    } else {
      const k = commitments.effectiveCommitment(unit, immediate, record.noise());
      if (isUnknown(k)) throw new Error(`setup: nothing committed for ${unit} at ${immediate}`);
      from = k;
    }
    const h0 = record.noise();
    const ctx = drawn(draws.recordDraw(unit, features, h0, "setup", h0, "ENGINE"));
    return candidate(setup.appendCandidate({ context: ctx, unit, currency, condition: "setup", seed: "setup", from }, "sig", record.noise(), "ENGINE"));
  };
  const commitAt = (unit: Unit, currency: Currency): Commitment => commitments.commit(drawAt(unit, currency), "HUMAN");
  /** Records a draw context for (unit, condition) now: the draw a candidate is drawn under. */
  const draw = (unit: Unit = u, condition = "cond"): DrawContext =>
    drawn(draws.recordDraw(unit, features, record.noise(), condition, record.noise(), "ENGINE"));
  /** A proposal drawn under a fresh context. Build proposals BEFORE taking the append height. */
  const propose = (currency: Currency, from: CandidateProposal["from"], condition = "cond", unit: Unit = u): CandidateProposal =>
    ({ context: draw(unit, condition), unit, currency, condition, seed: "seed-1", from });
  return { record, declarations, draws, commitments, independence, ledger, asked, seen, draw, propose, drawAt, commitAt };
}
/** Asserts nothing was appended since `h`: the next append lands at h + 1. */
const nothingAppendedSince = (record: ReturnType<typeof inMemoryRecord>, h: RecordHeight) =>
  expect(Number(record.noise()), "a refused candidate appended something").toBe(Number(h) + 1);

describe("BC-05-15 - one guarded append; an unreachable draw costs nothing (S-01, REF-03)", () => {
  it("test_an_unreachable_draw_appends_nothing_and_asks_no_one_else", () => {
    const unreachable = refuse("unreachable");
    const { record, commitments, ledger, asked, propose, commitAt } = candidateWorld({ admission: unreachable });
    const k0 = commitAt(u, c0);
    const p = propose(c1, k0);
    const h = record.noise();
    expect(ledger.appendCandidate(p, "sig", h, "ENGINE"), "MOD-04's refusal was not passed through").toEqual(unreachable);
    nothingAppendedSince(record, h);
    expect(asked, "a decider after admission was asked: the draw cost something").toEqual(["admission"]);
  });

  it("test_each_ledger_kind_has_exactly_one_append_path", () => {
    // S-01: "exactly one such entry point; no alternate, bulk, administrative, backfill or
    // test path". Resolved by TYPE: every function in src/ whose RecordPort.append carries a
    // ledger kind - directly or through generic relays (R-31) - mapped kind -> appenders.
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
      "src/facts/limit-destructured-relay.ts": [],
      "src/facts/limit-indirect-relay.ts": [],
      "src/facts/limit-typed-helper.ts": ["candidate TypedHelper.#write"],
      "src/facts/limit-untyped-entry.ts": [],
      "src/facts/violating-backfill-path.ts": ["candidate CandidateBackfill.backfill", "candidate CandidateBackfill.replay"],
      "src/facts/violating-generic-relay.ts": ["candidate RelayBackfill.backfill", "candidate RelayBackfill.viaTwoRelays"],
      "src/facts/violating-wrapped-relay.ts": ["candidate WrappedBackfill.backfill", "candidate WrappedBackfill.frozen"],
    });
  });
});

describe("BC-05-23 - REF-05 on the path that costs: no candidate without a declaration in force (R-31)", () => {
  it("test_no_candidate_without_a_declaration_in_force", () => {
    // With a real DeclarationLedger holding NOTHING for the unit, the draw is refused and no
    // DrawContext exists; a proposal without one does not compile, and none can be minted
    // outside DrawContextLog (BC-05-6). So no candidate can be appended for that draw.
    const record = inMemoryRecord();
    const draws = new DrawContextLog({ record, declarations: new DeclarationLedger({ record, levels: ["easy"] }) });
    const h = record.noise();
    expect(isRefusal(draws.recordDraw(u, features, h, "cond", h, "ENGINE"), "no-declaration"), "a draw context was minted with no declaration").toBe(true);
    const out = JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as { fixtures: Record<string, { codes: number[]; messages: string[] }> };
    const without = out.fixtures["tests/fixtures/facts/candidate-without-context.ts"];
    expect(without?.codes, "a candidate proposal without a draw context compiled").toEqual([2345]);
    expect(without?.messages.join(" "), "the refusal at parse is not about the missing context").toContain("context");
    expect(out.fixtures["tests/fixtures/facts/candidate-with-context.ts"]?.codes).toEqual([]);
  });
});

describe("SEAM-19 - omitting the commitment a candidate binds is malformed at parse (clause map)", () => {
  it("test_a_candidate_without_from_is_malformed_at_parse", () => {
    const out = JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as { fixtures: Record<string, { codes: number[]; messages: string[] }> };
    const without = out.fixtures["tests/fixtures/facts/candidate-without-from.ts"];
    expect(without?.codes, "a candidate proposal without `from` compiled").toEqual([2345]);
    expect(without?.messages.join(" "), "the refusal at parse is not about the missing from").toContain("'from'");
    expect(out.fixtures["tests/fixtures/facts/candidate-with-context.ts"]?.codes, "the positive control no longer compiles").toEqual([]);
  });
});

describe("BC-05-24 - the bound context must be this draw's (R-31)", () => {
  const mismatch = (x: unknown) => isRefusal(x, "context-mismatch");

  it("test_the_bound_context_must_be_this_draws", () => {
    const { record, commitments, ledger, draw, propose, commitAt } = candidateWorld();
    const k0 = commitAt(u, c0);
    const good = propose(c1, k0, "cond");
    const otherUnit = { ...good, context: draw(v, "cond") };
    const otherCondition = { ...good, context: draw(u, "elsewhere") };
    const h = record.noise();
    const late = { ...good, context: draw(u, "cond") }; // recorded ABOVE h
    const h2 = record.noise();
    expect(mismatch(ledger.appendCandidate(otherUnit, "sig", h, "ENGINE")), "another unit's draw context was bound").toBe(true);
    expect(mismatch(ledger.appendCandidate(otherCondition, "sig", h, "ENGINE")), "another condition's draw context was bound").toBe(true);
    expect(mismatch(ledger.appendCandidate(late, "sig", h, "ENGINE")), "a context recorded above the append height was bound").toBe(true);
    nothingAppendedSince(record, h2);
    const k = candidate(ledger.appendCandidate(good, "sig", record.noise(), "ENGINE"));
    expect(k.payload.context).toBe(good.context.at);
    // "Newer than the append height" is the refusal; a context AT the append height is this
    // draw's (succeeds is strict, R-09) - pinned before battery 13.
    const exact = propose(c1, k0, "cond");
    expect(candidate(ledger.appendCandidate(exact, "sig", exact.context.at, "ENGINE")).payload.context).toBe(exact.context.at);
  });
});

describe("BC-05-29 - one draw, one candidate (WI-08, R-33)", () => {
  it("test_a_draw_context_binds_one_candidate", () => {
    const { record, commitments, ledger, draw, propose, commitAt } = candidateWorld();
    const k0 = commitAt(u, c0);
    const p = propose(c1, k0);
    const first = candidate(ledger.appendCandidate(p, "sig", record.noise(), "ENGINE"));
    const h = record.noise();
    expect(isRefusal(ledger.appendCandidate(p, "sig", h, "ENGINE"), "context-spent"), "a draw context bound a second candidate").toBe(true);
    nothingAppendedSince(record, h);
    // context checks run in order: a mismatched context answers mismatch, even when spent
    const spentElsewhere = { ...p, unit: v };
    expect(isRefusal(ledger.appendCandidate(spentElsewhere, "sig", record.noise(), "ENGINE"), "context-mismatch")).toBe(true);
    // and spent is checked before `from`: a spent context with a bad from answers spent
    expect(isRefusal(ledger.appendCandidate({ ...p, from: BOTTOM }, "sig", record.noise(), "ENGINE"), "context-spent")).toBe(true);
    // an unused OLDER context still binds - its declaration is its own draw's
    const older = draw(u, "cond");
    record.noise();
    const fresh = { ...p, context: older };
    expect(candidate(ledger.appendCandidate(fresh, "sig", record.noise(), "ENGINE")).payload.context).toBe(older.at);
    expect(first.payload.context).toBe(p.context.at);
  });
});

describe("BC-05-25 - the record says which declaration a candidate was drawn under (DR-28, SEAM-10)", () => {
  it("test_a_candidate_identifies_the_declaration_it_was_drawn_under", () => {
    const { record, declarations, draws, commitments, ledger, draw, commitAt } = candidateWorld();
    const k0 = commitAt(u, c0);
    const d1 = declarations.declare(u, "easy", "HUMAN");
    const first = draw(u, "cond");
    const d2 = declarations.declare(u, "hard", "HUMAN");
    const second = draw(u, "cond");
    if (isUnknown(d1) || isUnknown(d2)) throw new Error("setup");
    expect(first.payload.declaration).toBe(d1.at);
    const k = candidate(ledger.appendCandidate({ context: second, unit: u, currency: c1, condition: "cond", seed: "s", from: k0 }, "sig", record.noise(), "ENGINE"));
    const boundTo = draws.drawsAsOf(u, k.at).find((c) => c.at === k.payload.context);
    expect(boundTo?.payload.declaration, "the candidate's declaration is not recoverable by key").toBe(d2.at);
  });
});

describe("BC-05-16 - from is the effective commitment immediately below, as of the append height (R-26)", () => {
  const malformed = (x: unknown) => isRefusal(x, "malformed-from");

  it("test_from_must_be_the_effective_commitment_immediately_below", () => {
    const { record, commitments, ledger, propose, commitAt } = candidateWorld();
    const k0 = commitAt(u, c0);
    const other = commitAt(v, c0);
    const k1 = commitAt(u, c1);
    const bottomAbove = propose(c1, BOTTOM);
    const othersFrom = propose(c1, other);
    const twoBelow = propose(c2, k0);
    const h = record.noise();
    expect(malformed(ledger.appendCandidate(bottomAbove, "sig", h, "ENGINE")), "BOTTOM above the least currency").toBe(true);
    expect(malformed(ledger.appendCandidate(othersFrom, "sig", h, "ENGINE")), "another unit's commitment").toBe(true);
    expect(malformed(ledger.appendCandidate(twoBelow, "sig", h, "ENGINE")), "a commitment two currencies below").toBe(true);
    nothingAppendedSince(record, h);
    const atC1 = propose(c1, k0);
    const atC2 = propose(c2, k1);
    const h2 = record.noise();
    expect(candidate(ledger.appendCandidate(atC1, "sig", h2, "ENGINE")).payload.from).toBe(k0.at);
    expect(candidate(ledger.appendCandidate(atC2, "sig", h2, "ENGINE")).payload.from).toBe(k1.at);
  });

  it("test_a_superseded_commitment_is_not_a_from", () => {
    const w = candidateWorld();
    const a = w.commitAt(u, c0);
    const cut = w.record.noise();
    const later = new CommitmentLedger({ record: w.record, invalidations: invalidations([[a.at, cut]]) });
    const b = later.commit(w.drawAt(u, c0), "HUMAN");
    const ledger = new CandidateLedger({
      record: w.record,
      commitments: later,
      currencies: order,
      independence: w.independence,
      admission: { admit: () => "ADMIT" },
      signatures: { check: () => "VERIFIED" },
      ceiling: { admitsDraw: () => "WITHIN" },
    });
    const fromA = w.propose(c1, a);
    const fromB = w.propose(c1, b);
    const h = w.record.noise();
    expect(malformed(ledger.appendCandidate(fromA, "sig", h, "ENGINE")), "a superseded commitment was a from").toBe(true);
    expect(candidate(ledger.appendCandidate(fromB, "sig", h, "ENGINE")).payload.from).toBe(b.at);
  });

  it("test_bottom_from_needs_an_independence_license_at_the_least_currency", () => {
    const { record, commitments, independence, ledger, propose, commitAt } = candidateWorld();
    const atLeast = propose(c0, BOTTOM);
    const h = record.noise();
    expect(malformed(ledger.appendCandidate(atLeast, "sig", h, "ENGINE")), "BOTTOM with no independence act").toBe(true);
    const licensed = independence.declareIndependence(u, true, "HUMAN");
    expect(malformed(ledger.appendCandidate(atLeast, "sig", h, "ENGINE")), "a license made after the height counted").toBe(true);
    expect(candidate(ledger.appendCandidate(atLeast, "sig", licensed.at, "ENGINE")).payload.from).toEqual(noSubject());
    // While LICENSED: a Commitment is still no `from` at the least currency - nothing lies below
    // it, and the license must not mask that (battery 12, before the run).
    const k0 = commitAt(u, c0);
    const commitmentAtLeast = propose(c0, k0);
    expect(malformed(ledger.appendCandidate(commitmentAtLeast, "sig", record.noise(), "ENGINE")), "a commitment as from at the least currency, licensed").toBe(true);
    const withdrawn = independence.declareIndependence(u, false, "HUMAN");
    const afterWithdrawal = propose(c0, BOTTOM); // a fresh draw: atLeast's context is bound (R-33)
    expect(malformed(ledger.appendCandidate(afterWithdrawal, "sig", record.noise(), "ENGINE")), "a withdrawn license counted").toBe(true);
    expect(Number(withdrawn.at)).toBeLessThan(Number(record.noise()));
  });

  it("test_a_least_currency_candidate_may_inherit_from_another_units_commitment", () => {
    // R-40 (F3 OBJ-27): u is NOT licensed independent; its least-currency candidate inherits from
    // v's commitment in force - at any of v's currencies.
    const { record, ledger, propose, commitAt } = candidateWorld();
    const kv0 = commitAt(v, c0);
    const kv1 = commitAt(v, c1);
    const fromV0 = propose(c0, kv0);
    const fromV1 = propose(c0, kv1);
    const h = record.noise();
    expect(candidate(ledger.appendCandidate(fromV0, "sig", h, "ENGINE")).payload.from).toBe(kv0.at);
    expect(candidate(ledger.appendCandidate(fromV1, "sig", h, "ENGINE")).payload.from).toBe(kv1.at);
  });

  it("test_an_inherited_from_must_be_another_units_commitment_in_force", () => {
    // R-40: a SUPERSEDED commitment of another unit is no inheritance; neither is a commitment
    // above the append height. (The unit's OWN commitment at the least currency is refused by
    // test_bottom_from_needs_an_independence_license_at_the_least_currency.)
    const w = candidateWorld();
    const kv = w.commitAt(v, c0);
    const cut = w.record.noise();
    const later = new CommitmentLedger({ record: w.record, invalidations: invalidations([[kv.at, cut]]) });
    const ledger = new CandidateLedger({
      record: w.record,
      commitments: later,
      currencies: order,
      independence: w.independence,
      admission: { admit: () => "ADMIT" },
      signatures: { check: () => "VERIFIED" },
      ceiling: { admitsDraw: () => "WITHIN" },
    });
    const p = w.propose(c0, kv);
    expect(malformed(ledger.appendCandidate(p, "sig", w.record.noise(), "ENGINE")), "a superseded commitment of another unit was inherited").toBe(true);
    // The context is drawn BEFORE `early`, so the from-check - not the context check - answers.
    const context = w.draw(u, "cond");
    const early = w.record.noise();
    const kv2 = w.commitAt(v, c0); // made AFTER `early`
    const q = { ...w.propose(c0, kv2), context };
    expect(malformed(ledger.appendCandidate(q, "sig", early, "ENGINE")), "a commitment not yet in force was inherited").toBe(true);
    // ANOTHER unit's: u's own commitment at a HIGHER currency is no inheritance either - the
    // unit decides, not the (unit, currency) pair.
    w.commitAt(u, c0);
    const ku1 = w.commitAt(u, c1);
    expect(malformed(ledger.appendCandidate(w.propose(c0, ku1), "sig", w.record.noise(), "ENGINE")), "the unit's own commitment above was inherited").toBe(true);
    // In force BY HEIGHT: kv2 is now in force for (v, c0), and kv - superseded - is still no
    // inheritance, though v HAS a commitment in force there (pinned before battery 18).
    expect(malformed(ledger.appendCandidate(w.propose(c0, kv), "sig", w.record.noise(), "ENGINE")), "a superseded commitment was inherited while its successor was in force").toBe(true);
    expect(candidate(ledger.appendCandidate(w.propose(c0, kv2), "sig", w.record.noise(), "ENGINE")).payload.from).toBe(kv2.at);
  });

  it("test_an_unanswerable_from_check_passes_the_unknown_through", () => {
    // IR-55: only "none" is the malformation; R-20's uncomputable is passed through, not
    // collapsed into malformed-from.
    const { record, commitments, ledger, propose, commitAt } = candidateWorld();
    const k0 = commitAt(u, c0);
    commitAt(u, c0);
    const p = propose(c1, k0);
    const h = record.noise();
    expect(ledger.appendCandidate(p, "sig", h, "ENGINE")).toEqual(uncomputable("two-effective-commitments"));
    nothingAppendedSince(record, h);
    // ...and on the inheritance branch (R-40): another unit with two in force at the least
    // currency (pinned before battery 18).
    const kv = commitAt(v, c0);
    commitAt(v, c0);
    const q = propose(c0, kv);
    const h2 = record.noise();
    expect(ledger.appendCandidate(q, "sig", h2, "ENGINE")).toEqual(uncomputable("two-effective-commitments"));
    nothingAppendedSince(record, h2);
  });

  it("test_a_bottom_from_is_recorded_as_a_fresh_value", () => {
    const { record, independence, ledger, propose } = candidateWorld();
    independence.declareIndependence(u, true, "HUMAN");
    const mine: { kind: "no-subject" } = { kind: "no-subject" };
    const p = propose(c0, mine);
    const k = candidate(ledger.appendCandidate(p, "sig", record.noise(), "ENGINE"));
    (mine as { kind: string }).kind = "latent";
    expect(ledger.candidatesAsOf(u, c0, "cond", k.at)[0]?.payload.from, "the caller's later change reached the record").toEqual(noSubject());
  });
});

describe("BC-05-17/18 - the signature and the ceiling are asked on the same path (R-25, R-27)", () => {
  it("test_the_signature_check_sees_the_whole_proposal_and_its_refusal_passes_through", () => {
    const bad = refuse("malformed-signature");
    const { record, commitments, ledger, seen, propose, commitAt } = candidateWorld({ signature: bad });
    const k0 = commitAt(u, c0);
    const p = propose(c1, k0);
    const h = record.noise();
    expect(ledger.appendCandidate(p, "sig-7", h, "ENGINE")).toEqual(bad);
    nothingAppendedSince(record, h);
    expect(seen.proposal, "MOD-12 did not see the whole proposal, from and context included").toEqual(p);
    expect(seen.signature).toBe("sig-7");
  });

  it("test_draw_beyond_the_scope_ceiling_is_refused_on_the_append_path", () => {
    const exceeded = refuse("scope-exceeded");
    const { record, commitments, ledger, propose, commitAt } = candidateWorld({ ceiling: exceeded });
    const k0 = commitAt(u, c0);
    const p = propose(c1, k0);
    const h = record.noise();
    expect(ledger.appendCandidate(p, "sig", h, "ENGINE")).toEqual(exceeded);
    nothingAppendedSince(record, h);
  });
});

describe("BC-05-26 - refusal order: admission, context, from, signature, ceiling (R-31 amends R-28)", () => {
  it("test_refusals_answer_in_order_and_later_deciders_are_not_asked", () => {
    const A = refuse("unreachable");
    const S = refuse("malformed-signature");
    const C = refuse("scope-exceeded");
    type Bad = "none" | "from" | "context-and-from";
    const cases: ReadonlyArray<readonly [Answers, Bad, UnknownValue, readonly string[]]> = [
      [{ admission: A, signature: S, ceiling: C }, "context-and-from", A, ["admission"]],
      [{ signature: S, ceiling: C }, "context-and-from", refuse("context-mismatch"), ["admission"]],
      [{ signature: S, ceiling: C }, "from", refuse("malformed-from"), ["admission"]],
      [{ signature: S, ceiling: C }, "none", S, ["admission", "signature"]],
      [{ ceiling: C }, "none", C, ["admission", "signature", "ceiling"]],
    ];
    for (const [answers, bad, expected, order_] of cases) {
      const { record, commitments, ledger, asked, draw, propose, commitAt } = candidateWorld(answers);
      const k0 = commitAt(u, c0);
      const base = propose(c1, bad === "none" ? k0 : BOTTOM);
      const p = bad === "context-and-from" ? { ...base, context: draw(v, "cond") } : base;
      const h = record.noise();
      expect(ledger.appendCandidate(p, "sig", h, "ENGINE")).toEqual(expected);
      expect(asked, `asked out of order for ${JSON.stringify(expected)}`).toEqual(order_);
      nothingAppendedSince(record, h);
    }
  });
});

describe("BC-05-20 - a good candidate is appended once, carrying its lineage and its draw", () => {
  it("test_a_good_candidate_is_appended_once_with_its_lineage", () => {
    const { record, commitments, ledger, asked, propose, commitAt } = candidateWorld();
    const k0 = commitAt(u, c0);
    const p = propose(c1, k0, "cond-9");
    const h = record.noise();
    const k = candidate(ledger.appendCandidate(p, "sig-1", h, "DIRECTOR"));
    expect(Number(k.at)).toBe(Number(h) + 1);
    expect(k.author).toBe("DIRECTOR");
    expect(k.payload).toEqual({ kind: "candidate", context: p.context.at, unit: u, currency: c1, condition: "cond-9", seed: "seed-1", from: k0.at, signature: "sig-1" });
    expect(asked).toEqual(["admission", "signature", "ceiling"]);
  });
});

describe("BC-05-21 - candidates are read as of a height (S-09, SEAM-22, lineage)", () => {
  function three() {
    const w = candidateWorld();
    w.independence.declareIndependence(u, true, "HUMAN");
    w.independence.declareIndependence(v, true, "HUMAN");
    const k0 = w.commitAt(u, c0);
    const pa = w.propose(c1, k0, "x");
    const pb = w.propose(c1, k0, "y");
    const pc = w.propose(c0, BOTTOM, "x");
    const pd = w.propose(c0, BOTTOM, "x", v);
    const pe = w.propose(c1, k0, "x");
    const h = w.record.noise();
    const a = candidate(w.ledger.appendCandidate(pa, "s", h, "ENGINE"));
    const b = candidate(w.ledger.appendCandidate(pb, "s", h, "ENGINE"));
    const c = candidate(w.ledger.appendCandidate(pc, "s", h, "ENGINE"));
    const d = candidate(w.ledger.appendCandidate(pd, "s", h, "ENGINE"));
    const e = candidate(w.ledger.appendCandidate(pe, "s", h, "ENGINE"));
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
      { currency: c0, count: 2 }, // the drawn one, and the setup candidate k0 accepted (R-41)
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

describe("BC-05-32 - the lineage reader, record-only (R-41)", () => {
  it("test_the_lineage_reader_walks_derived_from_and_accepted_by", () => {
    const w = factWorld({ currencies: ["c0", "c1", "c2"], invalidations: none });
    const k0 = w.commitAt(u, c0);
    const a = w.drawAt(u, c1);
    const b = w.drawAt(u, c1);
    const before = w.record.noise();
    const k1 = w.commitments.commit(a, "HUMAN");
    const h = w.record.noise();
    const lineage = new LineageReader({ record: w.record });
    expect(lineage.derivedFrom(k0.at, h).map((x) => x.at), "the candidates derived from k0").toEqual([a.at, b.at]);
    expect(lineage.derivedFrom(k0.at, h)[0]).toEqual({ at: a.at, unit: u, currency: c1, from: k0.at });
    expect(lineage.acceptedBy(a.at, h)).toEqual([{ at: k1.at, unit: u, currency: c1, candidate: a.at }]);
    expect(lineage.acceptedBy(b.at, h), "a candidate nobody accepted").toEqual([]);
    expect(lineage.acceptedBy(a.at, before), "an acceptance visible before it was made").toEqual([]);
    expect(lineage.derivedFrom(k1.at, h), "nothing derives from k1 yet").toEqual([]);
    // The reader reads what the fold reads (IR-76): a non-HUMAN commitment-kind entry naming b
    // accepts nothing (pinned before battery 18).
    const forged = w.record.append({ author: "ENGINE", payload: { kind: "commitment", unit: u, currency: c1, candidate: b.at } });
    expect(lineage.acceptedBy(b.at, forged), "a forged acceptance was read").toEqual([]);
  });
});

describe("BC-05-27 - OBJ-31 as a value (WI-06)", () => {
  it("test_commit_gate_states_obj_31", () => {
    expect(COMMIT_GATE).toEqual({
      condition: "a human act is present for (unit, currency)",
      closedBy: "HUMAN_ACT",
      proposalsIn: ["Diagnostic", "Observation"],
      records: "Commitment",
      onFail: { kind: "refuse", guard: "commit-gate" },
    });
    expect(Object.isFrozen(COMMIT_GATE) && Object.isFrozen(COMMIT_GATE.proposalsIn) && Object.isFrozen(COMMIT_GATE.onFail), "OBJ-31's descriptor can be edited").toBe(true);
  });
});
