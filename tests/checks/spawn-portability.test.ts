/**
 * The spawn-portability rule (K7 round 3, CC-4; widened at K7 round 4, CC-6 / DR-07).
 *
 * The positive cases are not decoration: a checker that reports every spawn as a
 * defect would pass the violating fixtures and prove nothing. `conforming/` and
 * `process-module/` are what stop this suite from passing by refusing everything.
 * The evasion fixtures (`aliased/`, `element-access/`, `destructured/`) are what
 * stop it from passing by reading names.
 */
import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findPythonSpawnViolations,
  findSpawnPortabilityViolationsIn,
  type SpawnScope,
  type SpawnViolation,
} from "../../tools/checks/spawn-portability.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const tsFixtures = resolve(repo, "tests/fixtures/spawn-portability");
const pyFixtures = resolve(repo, "tests/fixtures/spawn-portability-py");

const FIXTURES = [
  "violating", "other-name", "shell", "conforming",
  "aliased", "element-access", "destructured", "process-module",
] as const;
const realTree: SpawnScope = {
  roots: [resolve(repo, "tools"), resolve(repo, "tests"), resolve(repo, "src")],
  exclude: [resolve(repo, "tests/fixtures")],
};

/** One resolver process for every scope this file asks about. */
let results: Map<string, readonly SpawnViolation[]> | undefined;
function violationsIn(name: (typeof FIXTURES)[number] | "real-tree"): readonly SpawnViolation[] {
  if (results === undefined) {
    const scopes: SpawnScope[] = [
      ...FIXTURES.map((f) => ({ roots: [resolve(tsFixtures, f)], exclude: [] })),
      realTree,
    ];
    const answered = findSpawnPortabilityViolationsIn(scopes);
    results = new Map([...FIXTURES, "real-tree"].map((n, i) => [n, answered[i] ?? []]));
  }
  return results.get(name) ?? [];
}

describe("spawn portability", () => {
  it("test_spawning_a_command_name_is_a_portability_defect", () => {
    const v = violationsIn("violating");
    expect(v).toHaveLength(1);
    expect(v[0]!.callee).toBe("execFileSync");
    expect(v[0]!.defect).toBe("command-is-not-the-node-binary");
    expect(v[0]!.file.endsWith("spawn-portability/violating/run.ts")).toBe(true);
  });

  it("test_any_command_name_is_a_defect_not_just_the_one_that_broke", () => {
    // RD-13 in miniature: a checker that scanned for "npx" would pass this file
    // and the tree would be just as unportable. The rule is about the ARGUMENT.
    const v = violationsIn("other-name");
    expect(v).toHaveLength(1);
    expect(v[0]!.callee).toBe("spawnSync");
    expect(v[0]!.defect).toBe("command-is-not-the-node-binary");
  });

  it("test_handing_a_command_string_to_a_shell_is_a_portability_defect", () => {
    const v = violationsIn("shell");
    expect(v).toHaveLength(1);
    expect(v[0]!.callee).toBe("execSync");
    expect(v[0]!.defect).toBe("shell-command-string");
  });

  it("test_spawning_the_node_binary_or_forking_is_admitted", () => {
    expect(violationsIn("conforming")).toEqual([]);
  });

  it("test_a_renamed_import_does_not_hide_a_spawn", () => {
    // K7 round 4: `import { execFileSync as run }`. The callee reported is the
    // function the call resolves to, not the local name it was given.
    const v = violationsIn("aliased");
    expect(v).toHaveLength(1);
    expect(v[0]!.callee).toBe("execFileSync");
    expect(v[0]!.defect).toBe("command-is-not-the-node-binary");
  });

  it("test_an_element_access_does_not_hide_a_spawn", () => {
    // K7 round 4: `cp["execFileSync"](...)` has no callee name for a scan to read.
    const v = violationsIn("element-access");
    expect(v).toHaveLength(1);
    expect(v[0]!.callee).toBe("execFileSync");
  });

  it("test_a_destructured_rename_does_not_hide_a_spawn", () => {
    const v = violationsIn("destructured");
    expect(v).toHaveLength(1);
    expect(v[0]!.callee).toBe("spawnSync");
  });

  it("test_the_node_binary_is_recognised_by_symbol_not_spelling", () => {
    // `import { execPath } from "node:process"` and a const bound to
    // process.execPath are the Node binary; refusing them would make the rule
    // pass by refusing everything that does not match one spelling.
    expect(violationsIn("process-module")).toEqual([]);
  });

  it("test_the_real_tools_and_tests_trees_spawn_only_node", () => {
    // The tree that actually runs. tests/fixtures/ is subject matter, not code.
    // The one registered exception (IR-25) is admitted by the resolver itself.
    expect(violationsIn("real-tree")).toEqual([]);
  });
});

describe("spawn portability - the Python the declared commands reach", () => {
  it("test_python_launches_are_resolved_through_bindings", () => {
    // RD-12: the cases are the fixture files, discovered, not listed here.
    const files = readdirSync(pyFixtures).filter((f) => f.endsWith(".py")).sort();
    const { violations } = findPythonSpawnViolations([pyFixtures]);
    const flagged = new Set(violations.map((v) => v.file.slice(v.file.lastIndexOf("/") + 1)));
    const violating = files.filter((f) => f.startsWith("violating-"));
    expect(violating.length, "no violating Python fixtures discovered").toBeGreaterThan(0);
    for (const f of violating) expect(flagged.has(f), `${f} launched past the sweep`).toBe(true);
    for (const f of files.filter((x) => x.startsWith("conforming"))) {
      expect(flagged.has(f), `${f} must not be flagged`).toBe(false);
    }
  });

  it("test_the_python_the_declared_commands_reach_spawns_only_node", () => {
    // tools/rederive.py launched `npx tsx` by name (K7 round 4, DR-07). The files
    // are discovered from .metaframework/project.json, so an empty list would mean
    // the sweep looked at nothing - that is a failure, not a pass.
    const { files, violations } = findPythonSpawnViolations("declared");
    expect(files.some((f) => f.endsWith("/tools/rederive.py"))).toBe(true);
    expect(violations).toEqual([]);
  });
});
