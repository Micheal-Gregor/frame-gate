/**
 * The spawn-portability rule (K7 round 3, CC-4).
 *
 * The positive case is not decoration: a checker that reports every spawn as a
 * defect would pass the two violating fixtures and prove nothing. `conforming/`
 * is what stops this suite from passing by refusing everything - the same shape
 * the REF-02 suite uses.
 */
import { describe, expect, it } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findSpawnPortabilityViolations } from "../../tools/checks/spawn-portability.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const fixture = (name: string) =>
  ({
    roots: [resolve(repo, "tests/fixtures/spawn-portability", name)],
    exclude: [] as string[],
  }) as const;

describe("spawn portability", () => {
  it("test_spawning_a_command_name_is_a_portability_defect", () => {
    const v = findSpawnPortabilityViolations(fixture("violating"));
    expect(v).toHaveLength(1);
    expect(v[0]!.callee).toBe("execFileSync");
    expect(v[0]!.defect).toBe("command-is-not-the-node-binary");
    expect(v[0]!.file.endsWith("spawn-portability/violating/run.ts")).toBe(true);
  });

  it("test_any_command_name_is_a_defect_not_just_the_one_that_broke", () => {
    // RD-13 in miniature: a checker that scanned for "npx" would pass this file
    // and the tree would be just as unportable. The rule is about the ARGUMENT.
    const v = findSpawnPortabilityViolations(fixture("other-name"));
    expect(v).toHaveLength(1);
    expect(v[0]!.callee).toBe("spawnSync");
    expect(v[0]!.defect).toBe("command-is-not-the-node-binary");
  });

  it("test_handing_a_command_string_to_a_shell_is_a_portability_defect", () => {
    const v = findSpawnPortabilityViolations(fixture("shell"));
    expect(v).toHaveLength(1);
    expect(v[0]!.callee).toBe("execSync");
    expect(v[0]!.defect).toBe("shell-command-string");
  });

  it("test_spawning_the_node_binary_or_forking_is_admitted", () => {
    expect(findSpawnPortabilityViolations(fixture("conforming"))).toEqual([]);
  });

  it("test_the_real_tools_and_tests_trees_spawn_only_node", () => {
    // The tree that actually runs. tests/fixtures/ is subject matter, not code.
    expect(
      findSpawnPortabilityViolations({
        roots: [resolve(repo, "tools"), resolve(repo, "tests"), resolve(repo, "src")],
        exclude: [resolve(repo, "tests/fixtures")],
      }),
    ).toEqual([]);
  });
});
