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
import { isUnknown, uncomputable, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import { CurrencyOrder, DeclarationLedger, type Currency, type Unit } from "../../src/catalog/index.js";
import {
  CommitmentLedger,
  DrawContextLog,
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
    expect(out.ledgers.discovered.map((x) => x.kind)).toEqual(expect.arrayContaining(["declaration", "commitment", "draw-context", "resolution-label"]));
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
    const { declarations, draws, scope } = drawWorld();
    const d1 = declarations.declare(u, "easy", "HUMAN");
    const d2 = declarations.declare(u, "hard", "HUMAN");
    if (isUnknown(d1) || isUnknown(d2)) throw new Error("setup");
    expect(drawn(draws.recordDraw(u, features, scope, "cond", d1.at, "ENGINE")).payload.declaration).toBe(d1.at);
    expect(drawn(draws.recordDraw(u, features, scope, "cond", d2.at, "ENGINE")).payload.declaration).toBe(d2.at);
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
