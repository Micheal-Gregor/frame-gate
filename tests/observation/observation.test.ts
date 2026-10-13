/**
 * MOD-07 `observation/` (BC-07-1..BC-07-5). Written before the module and watched failing (R-50:
 * sized to its claims). Every observation is about a candidate drawn through MOD-05's real path.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isUnknown, noSubject, refuse } from "../../src/kernel/index.js";
import type { Author } from "../../src/ports/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import {
  ObservationLedger,
  authorOf,
  component,
  dischargeCondition,
  dischargeable,
  isAbsent,
  isAllAbsent,
  score,
  scoredComponents,
  undischargeable,
  type ComponentValue,
  type Observation,
  type Score,
} from "../../src/observation/index.js";
import { factWorld, never } from "../support/fact-world.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const u = "u1" as Unit;
const c0 = "c0" as Currency;
const COMPONENTS = ["composition", "motion", "colour"] as const;

type Out = { codes: number[]; messages: string[] };
const cache: { fixtures?: Record<string, Out> } = {};
const fixtures = (): Record<string, Out> =>
  (cache.fixtures ??= (
    JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as { fixtures: Record<string, Out> }
  ).fixtures);

const s = (n: number): Score => {
  const v = score(n);
  if (isUnknown(v)) throw new Error(`setup: score(${n}) answered ${v.kind}`);
  return v;
};
const entry = (value: ComponentValue, author: Author) => ({ value, author });
/** Every configured component: composition and colour scored, `motion` as given. */
const vector = (motion: ComponentValue) => ({ composition: entry(s(0.8), "ENGINE"), motion: entry(motion, "HUMAN"), colour: entry(s(0.6), "DIRECTOR") });

function world() {
  const w = factWorld({ currencies: ["c0", "c1"], invalidations: never });
  const ledger = new ObservationLedger({ record: w.record, components: COMPONENTS });
  const k = w.drawAt(u, c0);
  const observe = (values: Parameters<ObservationLedger["observe"]>[1]): Observation => {
    const o = ledger.observe(k, values, "ENGINE", w.record.noise());
    if (isUnknown(o)) throw new Error(`setup: the observation answered ${o.kind}`);
    return o;
  };
  return { ...w, ledger, k, observe };
}

describe("BC-07-1 - OBJ-08: a Score is a finite number, with no scale imposed (R-58)", () => {
  it("test_a_score_is_any_finite_number", () => {
    expect([0, 0.5, -3, 1e6].map((n) => s(n))).toEqual([0, 0.5, -3, 1e6]);
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(score(n), `${n} became a Score`).toEqual(refuse("not-finite"));
    }
  });
});

describe("BC-07-2 - REF-09 (INV-ABSENT, HOOK-02): ABSENT never enters an expression", () => {
  it("test_arithmetic_on_absent_component_is_malformed", () => {
    // At parse: every spelling that combines a possibly-ABSENT component with a value is malformed.
    for (const f of ["arithmetic-on-absent", "max-over-absent", "compare-absent"]) {
      expect(fixtures()[`tests/fixtures/observation/${f}.ts`]?.codes.length, `${f} compiled`).toBeGreaterThan(0);
    }
    // REGISTERED LIMIT (IR-94): a coercion (unary minus here) compiles - pinned, so closing it shows.
    expect(fixtures()["tests/fixtures/observation/limit-negate-absent.ts"]?.codes, "the registered limit closed silently").toEqual([]);
    // Positive: arithmetic over the SCORED components alone compiles.
    expect(fixtures()["tests/fixtures/observation/sum-of-scores.ts"]?.codes, "the positive control no longer compiles").toEqual([]);
  });

  it("test_all_absent_vector_is_accepted_and_stored", () => {
    const w = world();
    const o = w.observe({ composition: entry(dischargeable("score it"), "HUMAN"), motion: entry(undischargeable("a still has no motion"), "HUMAN"), colour: entry(dischargeable("score it"), "ENGINE") });
    expect(isAllAbsent(o)).toBe(true);
    expect(scoredComponents(o), "an ABSENT component was coerced").toEqual([]);
    expect(w.ledger.observationOf(w.k, o.at)).toEqual(o);
  });
});

describe("BC-07-3 - every configured component, and only those (R-59)", () => {
  it("test_an_observation_states_every_configured_component", () => {
    const w = world();
    const h = w.record.noise();
    const { motion: _dropped, ...missing } = vector(s(0.4));
    expect(w.ledger.observe(w.k, missing, "ENGINE", h)).toEqual(refuse("missing-component"));
    expect(w.ledger.observe(w.k, { ...vector(s(0.4)), sound: entry(s(0.1), "ENGINE") }, "ENGINE", h)).toEqual(refuse("unknown-component"));
    expect(Number(w.record.noise()), "a refused observation appended something").toBe(Number(h) + 1);
    // Recorded in the configured order, whatever order it was given in, each with its own author.
    const given = vector(s(0.4));
    const o = w.observe({ colour: given.colour, motion: given.motion, composition: given.composition });
    expect(o.payload.components.map((c) => [c.name, c.author])).toEqual([["composition", "ENGINE"], ["motion", "HUMAN"], ["colour", "DIRECTOR"]]);
    expect(o.payload.candidate).toBe(w.k.at);
    // ABSENT is kept as a fresh value, never the caller's object.
    const mine: { kind: "absent"; discharge: { kind: "dischargeable"; task: string } } = { kind: "absent", discharge: { kind: "dischargeable", task: "later" } };
    const kept = w.observe(vector(mine));
    mine.discharge.task = "changed";
    expect(component(kept, "motion"), "the caller's later change reached the record").toEqual({ kind: "absent", discharge: { kind: "dischargeable", task: "later" } });
  });
});

describe("BC-07-4 - the latest observation is in force; undischargeable stays so (R-60)", () => {
  it("test_the_latest_observation_is_in_force", () => {
    const w = world();
    const before = w.record.noise();
    expect(w.ledger.observationOf(w.k, before), "no observation is not NoSubject").toEqual(noSubject());
    const first = w.observe(vector(dischargeable("score the motion")));
    const second = w.observe(vector(s(0.4))); // the task discharged
    expect(w.ledger.observationOf(w.k, first.at)).toEqual(first);
    expect(w.ledger.observationOf(w.k, second.at)).toEqual(second);
    expect(w.ledger.observationOf(w.drawAt(u, c0), second.at), "another candidate's observation was read").toEqual(noSubject());
    // Undischargeable is permanent: a later vector may not score it.
    const w2 = world();
    w2.observe(vector(undischargeable("a still has no motion")));
    const h = w2.record.noise();
    expect(w2.ledger.observe(w2.k, vector(s(0.9)), "ENGINE", h)).toEqual(refuse("undischargeable"));
    expect(Number(w2.record.noise()), "a refused observation appended something").toBe(Number(h) + 1);
    expect(isUnknown(w2.ledger.observe(w2.k, vector(undischargeable("still none")), "ENGINE", w2.record.noise())), "an ABSENT restated was refused").toBe(false);
    // Only well-formed observation entries are read.
    const forged = w2.record.append({ author: "ENGINE", payload: { kind: "observation", candidate: w2.k.at } });
    const read = w2.ledger.observationOf(w2.k, forged);
    expect(isUnknown(read) ? read : read.at, "an entry with no components was read").not.toBe(forged);
  });
});

describe("DR-46 - the read seam honours R-58..R-60 for what it READS (R-67)", () => {
  it("test_only_complete_well_formed_vectors_are_read", () => {
    const w = world();
    const ok = w.observe(vector(s(0.5)));
    const good = ok.payload.components;
    const forge = (components: readonly unknown[]) => w.record.append({ author: "ENGINE", payload: { kind: "observation", candidate: w.k.at, components } });
    const first = (value: unknown) => good.map((c, i) => (i === 0 ? { ...c, value } : c));
    const cases: Readonly<Record<string, readonly unknown[]>> = {
      "a component missing": good.slice(1),
      "the last component missing": good.slice(0, -1),
      "an unknown component": [...good, { name: "sound", value: 0.1, author: "ENGINE" }],
      "the configured order broken": [good[1], good[0], good[2]],
      "a NaN score": first(Number.NaN),
      "an infinite score": first(Number.POSITIVE_INFINITY),
      "a null value": first(null),
      "a text value": first("high"),
      "an ABSENT with no discharge": first({ kind: "absent" }),
      "a malformed discharge": first({ kind: "absent", discharge: { kind: "later" } }),
      "a component with no author": good.map((c, i) => (i === 0 ? { name: c.name, value: c.value } : c)),
    };
    for (const [what, components] of Object.entries(cases)) {
      const at = forge(components);
      expect(w.ledger.observationOf(w.k, at), `${what}: read as the observation in force`).toEqual(ok);
    }
    // A malformed Undischargeable mark is no mark: the component may still be scored.
    forge(good.map((c) => (c.name === "motion" ? { ...c, value: { kind: "absent", discharge: { kind: "undischargeable" } } } : c)));
    expect(isUnknown(w.ledger.observe(w.k, vector(s(0.7)), "ENGINE", w.record.noise())), "a forged mark blocked a score").toBe(false);
  });
});

describe("BC-07-5 - an observation is read component by component", () => {
  it("test_an_observation_is_read_component_by_component", () => {
    const w = world();
    const motion = undischargeable("a still has no motion");
    const o = w.observe(vector(motion));
    expect(component(o, "motion")).toEqual(motion);
    expect(component(o, "sound"), "an unconfigured name answered a value").toEqual(noSubject());
    const m = component(o, "motion");
    const c = component(o, "composition");
    if (isUnknown(m) || isUnknown(c)) throw new Error("setup");
    expect([isAbsent(m), isAbsent(c)]).toEqual([true, false]);
    if (!isAbsent(m)) throw new Error("setup");
    expect(dischargeCondition(m)).toEqual({ kind: "undischargeable", reason: "a still has no motion" });
    expect([authorOf(o, "composition"), authorOf(o, "motion"), authorOf(o, "colour")]).toEqual(["ENGINE", "HUMAN", "DIRECTOR"]);
    expect(scoredComponents(o), "ABSENT was not omitted, or the order changed").toEqual([{ name: "composition", score: 0.8 }, { name: "colour", score: 0.6 }]);
    expect(isAllAbsent(o)).toBe(false);
  });
});
