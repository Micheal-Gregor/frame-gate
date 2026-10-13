/**
 * MOD-13 `advisory/` (BC-13-1..BC-13-4). Written before the module and watched failing (R-50).
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { PROJECTION_MEMBERS, isUnknown } from "../../src/kernel/index.js";
import { UnitRegistry, type Unit } from "../../src/catalog/index.js";
import { DifficultyAdvisory, PLAIN_DIFFICULTY, type DifficultyRule } from "../../src/advisory/index.js";
import { contains, resolveSpecifier } from "../../tools/checks/external-isolation.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const units = new UnitRegistry({ units: { u1: { colour: "red", parts: 3, rigged: true } } });
const u1 = units.unit("u1") as Unit;

describe("BC-13-1 - R-82: the injected rule's reading of the unit's features; the plain rule ships", () => {
  it("test_the_advisory_reads_the_units_features", () => {
    const advisory = new DifficultyAdvisory({ units, rule: PLAIN_DIFFICULTY });
    const value = advisory.advisory(u1);
    expect(value).toEqual({ kind: "difficulty-advisory", unit: u1, reading: { colour: "red", parts: 3, rigged: true } });
    if (isUnknown(value)) throw new Error("setup");
    expect(value.reading, "the registry's own features were handed out").not.toBe(units.features(u1));
    // A unit not registered: the registry's Unknown, as itself.
    expect(advisory.advisory("nobody" as Unit)).toEqual(units.features("nobody" as Unit));
  });
});

describe("BC-13-2 - REF-01a / S-17 / DG-F1: nothing reads the advisory", () => {
  it("test_no_write_path_from_difficulty_to_a_gate", () => {
    // Every src file outside src/advisory, its imports RESOLVED (RD-13): none reaches into it.
    const advisory = resolve(repo, "src/advisory");
    const files: string[] = [];
    const walk = (d: string): void => {
      for (const name of readdirSync(d)) {
        const full = join(d, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|mts|cts)$/.test(name) && !contains(advisory, full)) files.push(full);
      }
    };
    walk(resolve(repo, "src"));
    expect(files.length).toBeGreaterThan(0);
    const reaches: string[] = [];
    for (const f of files) {
      const sf = ts.createSourceFile(f, readFileSync(f, "utf8"), ts.ScriptTarget.ES2022, true);
      for (const s of sf.statements) {
        if ((ts.isImportDeclaration(s) || ts.isExportDeclaration(s)) && s.moduleSpecifier && ts.isStringLiteral(s.moduleSpecifier)) {
          const r = resolveSpecifier(f, s.moduleSpecifier.text).resolved;
          if (r !== null && contains(advisory, r)) reaches.push(`${f} -> ${r}`);
        }
      }
    }
    expect(reaches, "a module reads the difficulty advisory").toEqual([]);
  });
});

describe("BC-13-3 - RFD-01 / R-83: OBJ-34 is not a Projection", () => {
  it("test_the_advisory_is_not_a_projection", () => {
    expect(PROJECTION_MEMBERS as readonly string[]).not.toContain("DifficultyAdvisory");
    const joins = (JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/projection-joins.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as { joins: string[] }).joins;
    expect(joins.filter((j) => j.includes("src/advisory/")), "the advisory joined the family").toEqual([]);
    // At parse: no height goes in, and no projection comes out.
    const atParse = (a: DifficultyAdvisory): void => {
      // @ts-expect-error - the advisory takes no height (R-83)
      a.advisory(u1, 7);
      const value = a.advisory(u1);
      // @ts-expect-error - and it is no Projection: there is nothing to compute
      void value.compute;
    };
    void atParse;
  });
});

describe("BC-13-4 - OS-3: the rule is injected", () => {
  it("test_the_rule_is_handed_in", () => {
    const loud: DifficultyRule = { assess: (features) => ({ ...features, assessed: "by a test rule" }) };
    const plain = new DifficultyAdvisory({ units, rule: PLAIN_DIFFICULTY }).advisory(u1);
    const other = new DifficultyAdvisory({ units, rule: loud }).advisory(u1);
    expect(other).not.toEqual(plain);
    expect(other).toMatchObject({ unit: u1, reading: { assessed: "by a test rule" } });
    expect(Object.isFrozen(plain)).toBe(true);
  });
});
