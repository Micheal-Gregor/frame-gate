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
import { isUnknown, type RecordHeight } from "../../src/kernel/index.js";
import { CurrencyOrder, type Currency, type Unit } from "../../src/catalog/index.js";
import { CommitmentLedger, type Commitment, type InvalidationReader } from "../../src/facts/index.js";
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
