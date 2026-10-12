/**
 * MOD-03 `catalog/` base cases (BC-03-1..6) and the S3 section 5 refusal rows it owns
 * (REF-01, REF-01a, REF-01+). Written before the classes and watched failing.
 *
 * RD-12: the sizes of the currency order are a sample of the rule, never the pair
 * the concept happened to be described with; the parse-level rules are decided by
 * the type checker over fixtures with pinned diagnostics (tools/checks/catalog-checks.mjs).
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { height, isUnknown } from "../../src/kernel/index.js";
import {
  CurrencyOrder,
  DeclarationLedger,
  IndependenceLedger,
  UnitRegistry,
  type Currency,
  type Unit,
} from "../../src/catalog/index.js";
import { contains, resolveSpecifier } from "../../tools/checks/external-isolation.js";
import { inMemoryRecord } from "./in-memory-record.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");

interface CatalogChecks {
  fixtures: Record<string, { codes: number[]; messages: string[] }>;
  assertions: { file: string; line: number; type: string }[];
  surface: { operation: string; returns: string[]; asOf: boolean; humanAppend: boolean; ok: boolean }[];
}
let checked: CatalogChecks | undefined;
function catalogChecks(): CatalogChecks {
  if (checked === undefined) {
    const raw = execFileSync(process.execPath, [resolve(repo, "tools/checks/catalog-checks.mjs")], {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    checked = JSON.parse(raw) as CatalogChecks;
  }
  return checked;
}
const fixture = (name: string) => {
  const f = catalogChecks().fixtures[`tests/fixtures/catalog/${name}`];
  if (f === undefined) throw new Error(`fixture ${name} was not compiled`);
  return f;
};

const names = (n: number): string[] => Array.from({ length: n }, (_, i) => `c${i}`);
const unitsOf = (ids: readonly string[]) =>
  new UnitRegistry({ units: Object.fromEntries(ids.map((id) => [id, { difficulty: id.length }])) });
const unitIn = (registry: UnitRegistry, id: string): Unit => {
  const u = registry.unit(id);
  if (isUnknown(u)) throw new Error(`no unit ${id}`);
  return u;
};

describe("BC-03-1 - the currency order is total, finite and has a least element, for any size", () => {
  it("test_currency_order_answers_for_every_size", () => {
    // A sample of sizes, never the pair the concept was described with (SC-3).
    for (const n of [1, 3, 5]) {
      const order = new CurrencyOrder({ currencies: names(n) });
      const all = order.currencies();
      expect(all).toHaveLength(n);
      expect(order.least()).toBe(all[0]);
      all.forEach((c, i) => {
        expect(order.predecessors(c), `predecessors of the ${i}th of ${n}`).toEqual(all.slice(0, i));
      });
    }
  });

  it("test_currency_order_refuses_an_empty_or_tied_order", () => {
    expect(() => new CurrencyOrder({ currencies: [] }), "no least element").toThrow(RangeError);
    expect(() => new CurrencyOrder({ currencies: ["a", "b", "a"] }), "a tie").toThrow(RangeError);
  });

  it("test_a_currency_from_another_order_is_refused_not_answered", () => {
    const mine = new CurrencyOrder({ currencies: names(3) });
    const theirs = new CurrencyOrder({ currencies: ["x", "y"] });
    const foreign = theirs.least();
    const answer = mine.predecessors(foreign as Currency);
    expect(isUnknown(answer) && answer.kind === "refuse").toBe(true);
  });
});

describe("BC-03-2 - REF-01: a derivation producing a Declaration is malformed at parse", () => {
  it("test_declaration_from_derivation_is_malformed", () => {
    // TS2322: the computed object is not assignable to the nominal Declaration -
    // its brand cannot be written outside the ledger (R-11).
    const d = fixture("derive-declaration.ts");
    expect(d.codes, "a derivation returned a Declaration and compiled").toEqual([2322]);
    expect(d.messages[0]).toContain("Declaration");
    // The one escape from a brand is an explicit assertion. Outside the ledger that
    // owns the type, there must be none (IR-30) - resolved by the brand's symbol.
    expect(catalogChecks().assertions).toEqual([]);
  });
});

describe("BC-03-3 - HOOK-07 (author half): only a HUMAN author can declare", () => {
  it("test_a_non_human_author_cannot_declare", () => {
    for (const f of ["declare-as-engine.ts", "declare-as-any-author.ts", "independence-as-engine.ts"]) {
      const d = fixture(f);
      expect(d.codes, `${f}: a non-HUMAN author reached a declaration`).toEqual([2345]);
      expect(d.messages[0]).toContain('"HUMAN"');
    }
  });

  it("test_a_caller_narrowed_through_may_decide_can_declare", () => {
    // Positive control: without it, a check refusing every call passes the above.
    expect(fixture("declare-after-narrowing.ts").codes).toEqual([]);
  });
});

describe("BC-03-4 - REF-01+: a HUMAN declaration is appended and read as of a height", () => {
  it("test_human_authored_declaration_append_succeeds", () => {
    const record = inMemoryRecord();
    const ledger = new DeclarationLedger({ record, levels: ["L1", "L2"] });
    const u = unitIn(unitsOf(["u1"]), "u1");

    const before = record.noise();
    const d = ledger.declare(u, "L1", "HUMAN");
    if (isUnknown(d)) throw new Error("a HUMAN declaration of a configured level was refused");
    const after = [record.noise(), record.noise()];

    const atBefore = ledger.declarationAt(u, before);
    expect(isUnknown(atBefore) && atBefore.kind === "no-subject", "in force before it was made").toBe(true);
    for (const h of [d.at, ...after]) {
      const got = ledger.declarationAt(u, h);
      expect(got, `not in force at height ${h}`).toEqual(d);
    }
  });

  it("test_redeclaration_never_rewrites_history", () => {
    const record = inMemoryRecord();
    const ledger = new DeclarationLedger({ record, levels: ["L1", "L2"] });
    const u = unitIn(unitsOf(["u1"]), "u1");
    const first = ledger.declare(u, "L1", "HUMAN");
    const between = record.noise();
    const second = ledger.declare(u, "L2", "HUMAN");
    if (isUnknown(first) || isUnknown(second)) throw new Error("declaration refused");

    expect(ledger.declarationAt(u, between)).toEqual(first); // the past still says L1
    expect(ledger.declarationAt(u, second.at)).toEqual(second);
    expect((ledger.declarationAt(u, first.at) as { payload: { level: string } }).payload.level).toBe("L1");
  });

  it("test_a_declaration_answers_only_for_its_own_unit", () => {
    // Battery round 7, R9: with one unit in every test, an as-of read that ignored
    // WHICH unit it was asked about still passed.
    const record = inMemoryRecord();
    const ledger = new DeclarationLedger({ record, levels: ["L1", "L2"] });
    const units = unitsOf(["u1", "u2"]);
    const [u1, u2] = [unitIn(units, "u1"), unitIn(units, "u2")];
    const d1 = ledger.declare(u1, "L1", "HUMAN");
    const d2 = ledger.declare(u2, "L2", "HUMAN");
    if (isUnknown(d1) || isUnknown(d2)) throw new Error("declaration refused");
    expect(ledger.declarationAt(u1, d2.at)).toEqual(d1); // u2's later act is not u1's
    expect(ledger.declarationAt(u2, d2.at)).toEqual(d2);
    const u2Early = ledger.declarationAt(u2, d1.at);
    expect(isUnknown(u2Early) && u2Early.kind === "no-subject").toBe(true);
  });

  it("test_an_entry_not_authored_by_a_human_is_never_read_as_a_declaration", () => {
    // Battery round 7, R10: the record is SHARED - any module can append to it. An
    // entry shaped like a declaration but authored by the ENGINE must never come back
    // as a Declaration: that would be INV-PROV broken at runtime, with HOOK-07 green.
    const record = inMemoryRecord();
    const ledger = new DeclarationLedger({ record, levels: ["L1"] });
    const u = unitIn(unitsOf(["u1"]), "u1");
    const forged = record.append({ author: "ENGINE", payload: { kind: "declaration", unit: u, level: "L1" } });
    const got = ledger.declarationAt(u, forged);
    expect(isUnknown(got) && got.kind === "no-subject", "a forged ENGINE entry was read as a HUMAN declaration").toBe(true);
  });

  it("test_an_unconfigured_level_is_refused_not_appended", () => {
    const record = inMemoryRecord();
    const ledger = new DeclarationLedger({ record, levels: ["L1"] });
    const u = unitIn(unitsOf(["u1"]), "u1");
    const r = ledger.declare(u, "nonsense", "HUMAN");
    expect(isUnknown(r) && r.kind === "refuse").toBe(true);
    expect(record.readAsOf(height(1))).toEqual([]); // nothing was appended
  });

  it("test_no_operation_answers_the_current_declaration", () => {
    // Every exported operation returning a declaration is an as-of read or the
    // HUMAN-only append. Decided over the exported classes by the type checker.
    const surface = catalogChecks().surface;
    expect(surface.length, "the surface check found no declaration-returning operation").toBeGreaterThan(0);
    for (const s of surface) expect(s.ok, `${s.operation} reads "now"`).toBe(true);
  });
});

describe("BC-03-5 - R-10: independence is a HUMAN act read as of a height", () => {
  it("test_independence_is_a_human_act_in_force_as_of_a_height", () => {
    const record = inMemoryRecord();
    const ledger = new IndependenceLedger({ record });
    const u = unitIn(unitsOf(["u1"]), "u1");

    const none = record.noise();
    const nothing = ledger.independenceAt(u, none);
    expect(isUnknown(nothing) && nothing.kind === "no-subject", "no act means not licensed").toBe(true);

    const granted = ledger.declareIndependence(u, true, "HUMAN");
    const mid = record.noise();
    const withdrawn = ledger.declareIndependence(u, false, "HUMAN");

    expect(ledger.independenceAt(u, mid)).toEqual(granted);
    expect(ledger.independenceAt(u, withdrawn.at)).toEqual(withdrawn);
    expect(withdrawn.payload.independent).toBe(false);
    expect(ledger.independenceAt(u, granted.at)).toEqual(granted); // history kept
  });

  it("test_independence_answers_only_for_a_human_act_on_its_own_unit", () => {
    // Battery round 7, R11 (and R9's shape): another unit's act, or a forged ENGINE
    // entry, never licenses a null lineage.
    const record = inMemoryRecord();
    const ledger = new IndependenceLedger({ record });
    const units = unitsOf(["u1", "u2"]);
    const [u1, u2] = [unitIn(units, "u1"), unitIn(units, "u2")];
    const forged = record.append({ author: "ENGINE", payload: { kind: "independence", unit: u1, independent: true } });
    const viaForgery = ledger.independenceAt(u1, forged);
    expect(isUnknown(viaForgery) && viaForgery.kind === "no-subject", "a forged ENGINE act licensed a unit").toBe(true);
    const other = ledger.declareIndependence(u2, true, "HUMAN");
    const viaOther = ledger.independenceAt(u1, other.at);
    expect(isUnknown(viaOther) && viaOther.kind === "no-subject", "u2's act licensed u1").toBe(true);
  });
});

describe("OBJ-06 - unit features are read-only", () => {
  it("test_unit_features_are_read_only", () => {
    // Battery round 7, R14: "read-only" was a comment. A caller - MOD-13 included -
    // must not be able to change what the catalog answers for anyone else, and the
    // configuration object handed in must not be a live window into the registry.
    const config = { u1: { difficulty: 1 } };
    const registry = new UnitRegistry({ units: config });
    const u = unitIn(registry, "u1");
    const f = registry.features(u);
    if (isUnknown(f)) throw new Error("no features");
    expect(Object.isFrozen(f)).toBe(true);
    expect(() => {
      (f as { difficulty: number }).difficulty = 9;
    }).toThrow(TypeError);
    config.u1.difficulty = 7; // mutating the input after construction changes nothing
    expect(registry.features(u)).toEqual({ difficulty: 1 });
  });
});

describe("BC-03-6 - SC-3: the number two appears nowhere", () => {
  it("test_the_number_two_appears_nowhere", () => {
    // OI-4's mechanical check, over the AST of every source file - so 2, 2.0, 0x2,
    // 0b10 and 2n are all the same number, whatever the spelling.
    const files: string[] = [];
    const walk = (d: string): void => {
      for (const name of readdirSync(d)) {
        const full = join(d, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (name.endsWith(".ts")) files.push(full);
      }
    };
    walk(resolve(repo, "src"));
    expect(files.length).toBeGreaterThan(0);
    const twos: string[] = [];
    for (const f of files) {
      const sf = ts.createSourceFile(f, readFileSync(f, "utf8"), ts.ScriptTarget.ES2022, true);
      const visit = (n: ts.Node): void => {
        if ((ts.isNumericLiteral(n) && Number(n.text) === 2) ||
            (ts.isBigIntLiteral(n) && Number(n.text.slice(0, -1)) === 2)) {
          twos.push(`${f}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    expect(twos).toEqual([]);
  });
});

describe("REF-01a - no write path from difficulty into a declaration", () => {
  it("test_no_write_path_from_difficulty_to_declaration_or_gate_condition", () => {
    // S-17 is one-directional: MOD-13 reads unit features from here and returns
    // nothing here. The catalog's half, decided by RESOLVING every import (RD-13):
    // no catalog file reaches into src/advisory/. The gate-condition half is owned
    // by the modules that hold gate conditions and discharges as each is built.
    const dir = resolve(repo, "src/catalog");
    const advisory = resolve(repo, "src/advisory");
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => resolve(dir, f));
    expect(files.length).toBeGreaterThan(0);
    const reaches: string[] = [];
    for (const f of files) {
      const sf = ts.createSourceFile(f, readFileSync(f, "utf8"), ts.ScriptTarget.ES2022, true);
      for (const s of sf.statements) {
        if ((ts.isImportDeclaration(s) || ts.isExportDeclaration(s)) &&
            s.moduleSpecifier && ts.isStringLiteral(s.moduleSpecifier)) {
          const r = resolveSpecifier(f, s.moduleSpecifier.text).resolved;
          if (r !== null && contains(advisory, r)) reaches.push(`${f} -> ${r}`);
        }
      }
    }
    expect(reaches).toEqual([]);
  });
});
