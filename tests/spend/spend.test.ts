/**
 * MOD-11 `spend/` (BC-11-1..BC-11-8), with MOD-05's R-78 work item. Written before the module and
 * watched failing (R-50). The gate is the REAL one: every draw in these worlds is recorded through
 * MOD-05's DrawContextLog, which asks MOD-11's ScopeGate first (HOOK-05).
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isUnknown, noSubject, refuse, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import { LineageReader, type Candidate, type Commitment } from "../../src/facts/index.js";
import { RevisionLog, Samples } from "../../src/condition/index.js";
import { ObservationLedger, score, type Score } from "../../src/observation/index.js";
import { InvalidationLedger, InvalidationScope } from "../../src/lineage/index.js";
import { AE5_OPEN, Bar, PopulationPartition, type SeparationRule } from "../../src/calibration/index.js";
import {
  AuthorizationForms,
  Ratio,
  SCOPE_GATE,
  ScopeGate,
  ScopeLedger,
  ScopeReader,
  type AuthorizationForm,
  type RatioValue,
  type Scope,
  type StopRequest,
} from "../../src/spend/index.js";
import { inMemoryRecord, type TestRecord } from "../catalog/in-memory-record.js";
import { factWorld } from "../support/fact-world.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const u = "u1" as Unit;
const v = "u2" as Unit;
const STOP: StopRequest = { kind: "stop-at-bar", component: "q" };
/** The midpoint of the gap between the populations, when there is one. Test-only; NOT AE-5's answer. */
const midpoint: SeparationRule = {
  separate: (accepted, passedOver) => {
    const low = Math.min(...accepted);
    const high = Math.max(...passedOver);
    return low > high ? { kind: "separated", theta: (low + high) / 2 } : { kind: "no-bar", cause: "overlap", discharge: "populations that separate" };
  },
};
const nothingAppendedSince = (record: TestRecord, h: RecordHeight) => expect(Number(record.noise()), "a refusal appended something").toBe(Number(h) + 1);
const scope = (x: Scope | UnknownValue): Scope => {
  if (isUnknown(x)) throw new Error(`the scope was refused: ${JSON.stringify(x)}`);
  return x;
};

function world({ rule = AE5_OPEN }: { readonly rule?: SeparationRule } = {}) {
  const record = inMemoryRecord();
  const lineage = new LineageReader({ record });
  const reader = new ScopeReader({ record });
  const gate = new ScopeGate({ scopes: reader, charges: lineage });
  const invalidations = new InvalidationLedger({ record, scopes: new InvalidationScope({ lineage }), renderer: { present: () => undefined } });
  // MOD-04's REAL gate at the draw and at the candidate append (R-84), MOD-11's real gate at both (R-78).
  const w = factWorld({ currencies: ["c0", "c1"], invalidations, record, scopes: gate, ceiling: gate, reachable: true });
  const [c0, c1] = w.order.currencies() as readonly [Currency, Currency];
  const samples = new Samples({ candidates: w.candidates, draws: w.draws, revisions: new RevisionLog({ record }), lineage });
  const observations = new ObservationLedger({ record, components: ["q"] });
  const partition = new PopulationPartition({ lineage, samples, draws: w.draws, declarations: w.declarations, invalidations, observations });
  const ledger = new ScopeLedger({ record, bar: new Bar({ populations: partition, separation: rule }), declarations: w.declarations });
  const ratio = new Ratio({ candidates: w.candidates });
  const forms = new AuthorizationForms({ ratio });
  const form = (unit: Unit, currency: Currency, at: RecordHeight): AuthorizationForm => {
    const f = forms.build(unit, currency, at);
    if (isUnknown(f)) throw new Error(`setup: no form (${f.kind})`);
    return f;
  };
  /** Build the form now, then authorize from it now (R-81). */
  const authorize = (unit: Unit, currency: Currency, ceiling = 3, stop: StopRequest = { kind: "none" }, estimate = "about three draws") => {
    if (isUnknown(w.declarations.declarationAt(unit, record.noise()))) w.declarations.declare(unit, "easy", "HUMAN");
    const h = record.noise();
    return ledger.authorize(form(unit, currency, h), ceiling, stop, estimate, "HUMAN", h);
  };
  /** A draw recorded under the scope at `under` - dispatched, whether or not a candidate returns. */
  const dispatch = (unit: Unit, under: RecordHeight, condition = "x") => w.draws.recordDraw(unit, {}, under, condition, record.noise(), "ENGINE");
  /** v at level easy: 0.75 committed and 0.25 passed over, drawn under v's own scope - θ is 0.5 under the midpoint rule. */
  const history = (): void => {
    const s = scope(authorize(v, c0, 5));
    const a = w.drawAt(v, c0, "h", s.at);
    const b = w.drawAt(v, c0, "h", s.at);
    observations.observe(a, { q: { value: score(0.75) as Score, author: "ENGINE" } }, "ENGINE", record.noise());
    observations.observe(b, { q: { value: score(0.25) as Score, author: "ENGINE" } }, "ENGINE", record.noise());
    w.commitments.commit(a, "HUMAN");
  };
  return { ...w, c0, c1, reader, gate, ledger, ratio, forms, form, authorize, dispatch, history };
}

describe("BC-11-1 - REF-16 / HOOK-05 / R-77 / R-78: the draw itself is gated, and charged by dispatch", () => {
  it("test_draw_beyond_scope_ceiling_is_refused", () => {
    const w = world();
    const s = scope(w.authorize(u, w.c0, 3));
    w.drawAt(u, w.c0, "x", s.at);
    w.drawAt(u, w.c0, "x", s.at);
    // Dispatched, and no candidate ever returns: it is charged all the same (DG-F3).
    expect(isUnknown(w.dispatch(u, s.at)), "the Nth draw was refused").toBe(false);
    expect(w.gate.remaining(u, w.c0, w.record.noise())).toBe(0);
    const h = w.record.noise();
    expect(w.draws.recordDraw(u, {}, s.at, "x", h, "ENGINE"), "the (N+1)th draw").toEqual(refuse("scope-exceeded"));
    nothingAppendedSince(w.record, h);
    // A later Scope supersedes (R-77): the old one admits nothing, the new one starts afresh.
    const s2 = scope(w.authorize(u, w.c0, 1));
    expect(w.dispatch(u, s.at), "a superseded scope admitted a draw").toEqual(refuse("scope-exceeded"));
    expect(w.gate.remaining(u, w.c0, w.record.noise()), "a remainder carried over").toBe(1);
    // Superseded with something LEFT: still no draw - expiry is supersession, not exhaustion (battery 28, H2).
    const s3 = scope(w.authorize(u, w.c0, 4));
    expect(w.dispatch(u, s2.at), "a superseded scope with remaining admitted a draw").toEqual(refuse("scope-exceeded"));
    expect(isUnknown(w.dispatch(u, s3.at))).toBe(false);
    expect(w.gate.remaining(u, w.c0, w.record.noise())).toBe(3);
    // No draw without a governing scope of THIS unit.
    w.declarations.declare(v, "easy", "HUMAN");
    expect(w.dispatch(v, s3.at), "a draw charged to another unit's scope").toEqual(refuse("scope-exceeded"));
  });
});

describe("BC-11-9 - REF-03 against HOOK-05 (R-84): an unreachable draw is refused before it is charged", () => {
  it("test_an_unreachable_draw_costs_nothing", () => {
    const w = world();
    const s1 = scope(w.authorize(u, w.c1, 2)); // nothing is committed at c0 yet
    const h = w.record.noise();
    expect(w.draws.recordDraw(u, {}, s1.at, "x", h, "ENGINE"), "an unreachable draw was not refused").toEqual(refuse("unreachable"));
    nothingAppendedSince(w.record, h);
    expect(w.gate.remaining(u, w.c1, w.record.noise()), "an unreachable draw cost a unit of the scope").toBe(2);
    // Committed at c0, under its own scope: c1 is reachable, and its first draw is charged.
    const s0 = scope(w.authorize(u, w.c0, 1));
    w.commitments.commit(w.drawAt(u, w.c0, "x", s0.at), "HUMAN");
    expect(isUnknown(w.dispatch(u, s1.at))).toBe(false);
    expect(w.gate.remaining(u, w.c1, w.record.noise())).toBe(1);
  });
});

describe("BC-11-2 - R-78 (R-25 amended): a candidate is its draw's scope's unit and currency", () => {
  it("test_a_candidate_is_its_draws_scopes", () => {
    const w = world();
    const s0 = scope(w.authorize(u, w.c0, 3));
    const k: Commitment = w.commitments.commit(w.drawAt(u, w.c0, "x", s0.at), "HUMAN");
    const context = w.dispatch(u, s0.at, "y");
    if (isUnknown(context)) throw new Error("setup: the draw was refused");
    const h = w.record.noise();
    // Drawn under the c0 scope, returned as a c1 candidate: refused.
    expect(w.candidates.appendCandidate({ context, unit: u, currency: w.c1, condition: "y", seed: "s", from: k }, "sig", h, "ENGINE")).toEqual(refuse("scope-mismatch"));
    nothingAppendedSince(w.record, h);
    // Superseded between draw and return: the draw was charged already, so its candidate is admitted.
    const late = w.dispatch(u, s0.at, "z");
    if (isUnknown(late)) throw new Error("setup: the draw was refused");
    scope(w.authorize(u, w.c0, 1));
    const returned = w.candidates.appendCandidate({ context: late, unit: u, currency: w.c0, condition: "z", seed: "s", from: { kind: "no-subject" } }, "sig", w.record.noise(), "ENGINE");
    expect(isUnknown(returned), "a dispatched draw's candidate was refused on return").toBe(false);
  });
});

describe("BC-11-3 - REF-15 / R-79: a stop condition exists only where θ does", () => {
  it("test_stop_condition_without_bar_is_refused", () => {
    const open = world();
    open.history();
    const h = open.record.noise();
    expect(open.authorize(u, open.c0, 3, STOP), "AE-5 open: θ = ⊥").toEqual(refuse("no-bar"));
    expect(open.reader.governing(u, open.c0, open.record.noise()), "a refused scope was appended").toEqual(noSubject());
    void h;
    // θ exists: the member exists, and records the component only - no θ is stored.
    const w = world({ rule: midpoint });
    w.history();
    const s = scope(w.authorize(u, w.c0, 3, STOP));
    expect(w.reader.hasStopCondition(s)).toBe(true);
    expect(s.payload).toEqual({ kind: "scope", unit: u, currency: w.c0, ceiling: 3, estimate: "about three draws", stop: { kind: "stop-at-bar", component: "q" } });
    // None requested: the member does not exist - absent, not null.
    const plain = scope(w.authorize(u, w.c0, 3));
    expect([w.reader.hasStopCondition(plain), "stop" in plain.payload]).toEqual([false, false]);
  });
});

describe("BC-11-4 - REF-17: a Scope is spent, never edited", () => {
  it("test_no_mutating_signature_on_scope", () => {
    const w = world();
    const s = scope(w.authorize(u, w.c0, 3));
    expect([Object.isFrozen(s), Object.isFrozen(s.payload)]).toEqual([true, true]);
    // The ledger's one operation is the append, and it takes a form, never a Scope.
    expect(Object.getOwnPropertyNames(ScopeLedger.prototype).filter((n) => n !== "constructor")).toEqual(["authorize"]);
    const atParse = (): void => {
      // @ts-expect-error - a Scope is not a form: there is no path that takes one back in
      w.ledger.authorize(s, 5, { kind: "none" }, "more", "HUMAN", w.record.noise());
    };
    void atParse;
    // More permission is a SECOND Scope: accepted, and it governs.
    const more = scope(w.authorize(u, w.c0, 8));
    expect(w.reader.governing(u, w.c0, w.record.noise())).toEqual(more);
  });
});

describe("BC-11-5 - REF-18: the ratio is a vector over the currency order", () => {
  it("test_ratio_as_quotient_is_malformed", () => {
    const w = world();
    const s = scope(w.authorize(u, w.c0, 3));
    w.drawAt(u, w.c0, "x", s.at);
    w.drawAt(u, w.c0, "x", s.at);
    const ratio = w.ratio.of(u).compute(w.record.noise());
    expect(ratio, "zeros included, in currency order").toEqual({ unit: u, counts: [{ currency: w.c0, count: 2 }, { currency: w.c1, count: 0 }] });
    if (isUnknown(ratio)) throw new Error("setup");
    // At parse: the ratio is no number, so a quotient cannot stand in for it.
    const atParse = (r: RatioValue): void => {
      // @ts-expect-error - the ratio is not a number
      const quotient: number = r;
      // @ts-expect-error - and arithmetic on it does not compile
      const divided = r.counts / 1;
      void [quotient, divided];
    };
    void atParse;
    expect(Object.getOwnPropertyNames(Ratio.prototype).filter((n) => n !== "constructor"), "Ratio offers a scalar").toEqual(["of"]);
    // Per read: another draw, another vector.
    w.drawAt(u, w.c0, "x", s.at);
    expect(w.ratio.of(u).compute(w.record.noise())).toMatchObject({ counts: [{ count: 3 }, { count: 0 }] });
  });
});

describe("BC-11-6 - REF-19 / HOOK-09 / R-81: the form carries its ratio, and a Scope is authorized from it", () => {
  it("test_authorization_without_ratio_is_refused", () => {
    const w = world();
    w.declarations.declare(u, "easy", "HUMAN");
    const h = w.record.noise();
    // Every form carries the ratio, at every currency: no branch on the least.
    for (const currency of [w.c0, w.c1]) {
      const f = w.form(u, currency, h);
      expect([f.unit, f.currency, f.at, f.ratio]).toEqual([u, currency, h, w.ratio.of(u).compute(h)]);
    }
    const f = w.form(u, w.c1, h);
    const atParse = (): void => {
      const copied: AuthorizationForm = { ...f };
      // @ts-expect-error - a form without its ratio is not a form
      const stripped: AuthorizationForm = { ...f, ratio: undefined };
      void [copied, stripped];
    };
    void atParse;
    // Display before act: a form from another height is refused, and nothing is appended.
    const later = w.record.noise();
    expect(w.ledger.authorize(f, 3, { kind: "none" }, "e", "HUMAN", later)).toEqual(refuse("form-before-act"));
    nothingAppendedSince(w.record, later);
    // The decision stays the human's: authorizing from a current form is admitted; declining appends nothing.
    const now = w.record.noise();
    expect(isUnknown(w.ledger.authorize(w.form(u, w.c1, now), 3, { kind: "none" }, "e", "HUMAN", now))).toBe(false);
    const declined = w.record.noise();
    w.form(u, w.c1, declined);
    nothingAppendedSince(w.record, declined);
  });
});

describe("BC-11-7 - I-2 / I-3 / R-80: the governing scope and what remains of it, as of a height", () => {
  it("test_governing_scope_and_remaining", () => {
    const w = world();
    expect(w.reader.governing(u, w.c0, w.record.noise())).toEqual(noSubject());
    expect(w.gate.remaining(u, w.c0, w.record.noise())).toEqual(noSubject());
    const s1 = scope(w.authorize(u, w.c0, 3, { kind: "none" }, "≈ $4.20 (vendor quote)"));
    expect(s1.payload.estimate, "the estimate was interpreted").toBe("≈ $4.20 (vendor quote)");
    w.drawAt(u, w.c0, "x", s1.at);
    const before = w.record.noise();
    expect(w.gate.remaining(u, w.c0, before)).toBe(2);
    const s2 = scope(w.authorize(u, w.c0, 5));
    expect(w.reader.governing(u, w.c0, w.record.noise())).toEqual(s2);
    expect(w.reader.governing(u, w.c0, before), "an earlier height read a later scope").toEqual(s1);
    expect(w.reader.scopeAt(s1.at, w.record.noise())).toEqual(s1);
    expect(w.reader.scopeAt(before, w.record.noise()), "a height with no scope").toEqual(noSubject());
    for (const ceiling of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const h = w.record.noise();
      expect(w.ledger.authorize(w.form(u, w.c0, h), ceiling, { kind: "none" }, "e", "HUMAN", h), `ceiling ${ceiling}`).toEqual(refuse("malformed-ceiling"));
    }
  });
});

describe("BC-11-8 - the module's registrations: Ratio's join, the scope kind's one path, the brands", () => {
  it("test_spend_is_registered", () => {
    const joins = (JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/projection-joins.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as { joins: string[] }).joins;
    expect(joins.filter((j) => j.startsWith("Ratio "))).toEqual(["Ratio src/spend/ratio.ts"]);
    // OBJ-30's descriptor in the S3 section 7 wording: no expiry is proven and none is claimed (R-77; round 18).
    expect(SCOPE_GATE).toEqual({ condition: "a scope exists with remaining greater than zero", closedBy: "DERIVATION", proposalsIn: [], records: "DrawContext", onFail: refuse("scope-exceeded") });
    const out = JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as {
      paths: { src: Record<string, string[]> };
      mint: { src: unknown[]; fixtures: Record<string, { how: string }[]> };
      forge: { owners: Record<string, { how: string }[]> };
      ledgers: { unlisted: unknown[]; misowned: unknown[]; unbranded: unknown[] };
    };
    expect(out.paths.src["scope"], "S-01: the scope kind's append paths").toEqual(["ScopeLedger.authorize"]);
    expect([out.ledgers.unlisted, out.ledgers.misowned, out.ledgers.unbranded]).toEqual([[], [], []]);
    expect(out.mint.src).toEqual([]);
    for (const f of ["mint-scope.ts", "mint-authorization-form.ts"]) {
      expect(out.mint.fixtures[`tests/fixtures/catalog-mint/${f}`]?.map((x) => x.how), f).toEqual(["assertion"]);
    }
    expect(out.forge.owners["src/spend/conforming-builds-scope.ts"]).toEqual([]);
    expect(out.forge.owners["src/spend/violating-builds-commitment.ts"]?.map((x) => x.how)).toEqual(["catalog-kind-literal"]);
  });
});
