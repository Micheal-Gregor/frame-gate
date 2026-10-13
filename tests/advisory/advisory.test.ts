/**
 * MOD-13 `advisory/` (BC-13-1..BC-13-4). Written before the module and watched failing (R-50).
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECTION_MEMBERS, isUnknown, noSubject } from "../../src/kernel/index.js";
import { UnitRegistry, type Unit } from "../../src/catalog/index.js";
import { DifficultyAdvisory, PLAIN_DIFFICULTY, type DifficultyRule } from "../../src/advisory/index.js";
import { reachesInto } from "../../tools/checks/advisory-reach.js";

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
    // ... the very value, not a copy of it (K7 round 20): a fresh NoSubject in its place is a defect.
    const theUnknown = noSubject();
    expect(new DifficultyAdvisory({ units: { features: () => theUnknown }, rule: PLAIN_DIFFICULTY }).advisory(u1)).toBe(theUnknown);
  });
});

describe("BC-13-2 - REF-01a / S-17 / DG-F1: nothing reads the advisory", () => {
  it("test_no_write_path_from_difficulty_to_a_gate", () => {
    // Every LOADABLE source file in src outside src/advisory, every specifier form, RESOLVED (RD-13).
    const advisory = resolve(repo, "src/advisory");
    const loadable = (dir: string): { path: string; text: string }[] => {
      const out: { path: string; text: string }[] = [];
      const walk = (d: string): void => {
        for (const name of readdirSync(d)) {
          const full = join(d, name);
          if (statSync(full).isDirectory()) walk(full);
          else if (/\.(ts|mts|cts|tsx|js|mjs|cjs|jsx)$/.test(name) && !/\.d\.(ts|mts|cts)$/.test(name)) out.push({ path: full, text: readFileSync(full, "utf8") });
        }
      };
      walk(dir);
      return out;
    };
    const src = loadable(resolve(repo, "src"));
    expect(src.length).toBeGreaterThan(0);
    expect(reachesInto(advisory, src), "a module reads the difficulty advisory").toEqual([]);
    // The detector's reach, pinned per form (SCOPE, R-15): each fixture judged as if at the src/ path it mirrors.
    const fixtures = resolve(repo, "tests/fixtures/advisory-reach");
    const all = loadable(fixtures);
    const found = reachesInto(advisory, all, (p) => resolve(repo, relative(fixtures, p)));
    const byFile = (name: string) => found.filter((x) => basename(x.file) === name).map((x) => `${x.form} ${x.reason}`);
    expect(Object.fromEntries(all.map((f) => basename(f.path)).sort().map((n) => [n, byFile(n)]))).toEqual({
      "conforming-elsewhere.ts": [],
      "limit-aliased-require.cjs": [],
      "limit-create-require.mjs": [],
      "limit-module-require.cjs": [],
      "limit-structural-handoff.ts": [],
      "violating-case-variant.mjs": ["declaration reaches-target"],
      "violating-computed.ts": ["dynamic-import unresolvable"],
      "violating-dynamic-import.ts": ["dynamic-import reaches-target"],
      "violating-import-equals.ts": ["import-equals reaches-target"],
      "violating-mjs-import.mjs": ["declaration reaches-target"],
      "violating-reexport.ts": ["declaration reaches-target"],
      "violating-reference.ts": ["reference reaches-target"],
      "violating-require.cjs": ["require reaches-target"],
      "violating-static-import.ts": ["declaration reaches-target"],
      "violating-type-query.ts": ["type-query reaches-target"],
    });
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
