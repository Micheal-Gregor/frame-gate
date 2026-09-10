/**
 * REF-02 / REF-02+ - ER-5 external isolation (BC-02-1).
 *
 * The refusal is the point: a module other than MOD-02 naming an external is
 * malformed at parse, caught at build and never at runtime. The positive case
 * exists so the guard cannot pass by refusing everything.
 */
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  findExternalIsolationViolations,
  resolveSpecifier,
} from "../../tools/checks/external-isolation.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const fixture = (name: string) =>
  ({
    srcRoot: resolve(repo, "tests/fixtures/external-isolation", name, "src"),
    portsRoot: resolve(repo, "tests/fixtures/external-isolation", name, "src/ports"),
  }) as const;

describe("REF-02 - external isolation", () => {
  it("test_external_import_outside_ports_is_malformed", () => {
    const violations = findExternalIsolationViolations(fixture("violating"));
    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.file.endsWith("src/facts/index.ts")).toBe(true);
    expect(v.specifier).toBe("node:crypto");
    expect(v.reason).toBe("unresolved-builtin");
  });

  it("test_external_reached_through_ports_module_succeeds", () => {
    expect(findExternalIsolationViolations(fixture("conforming"))).toEqual([]);
  });

  it("test_sibling_specifier_spellings_resolve_to_one_file", () => {
    // RD-13: a detector that scans specifier text sees two names here.
    // A detector that resolves sees one file, and neither spelling is external.
    const facts = resolve(repo, "tests/fixtures/external-isolation/siblings/src/facts");
    const viaParent = resolveSpecifier(resolve(facts, "index.ts"), "../ports/index.js");
    const viaDotParent = resolveSpecifier(resolve(facts, "other.ts"), "./../ports/index.js");

    expect(viaParent.kind).toBe("internal");
    expect(viaDotParent.kind).toBe("internal");
    expect(viaParent.resolved).not.toBeNull();
    expect(viaParent.resolved).toBe(viaDotParent.resolved);
    expect(findExternalIsolationViolations(fixture("siblings"))).toEqual([]);
  });

  it("test_lookalike_directory_is_not_exempted_by_name", () => {
    // The mutation this kills: replacing containment with a name scan
    // (`file.includes("ports")`). src/portsmith/ contains the substring and is
    // not the ports module. A name scan exempts it and misses the violation.
    const violations = findExternalIsolationViolations(fixture("lookalike"));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.file.endsWith("src/portsmith/index.ts")).toBe(true);
    expect(violations[0]!.specifier).toBe("node:crypto");
  });

  it("test_import_resolving_outside_src_is_a_violation", () => {
    // Kills the mutation that removes the resolves-outside-src arm. An installed
    // package RESOLVES - unlike a builtin - so the unresolved-builtin arm alone
    // would let every node_modules dependency through.
    const violations = findExternalIsolationViolations(fixture("package"));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.specifier).toBe("typescript");
    expect(violations[0]!.reason).toBe("resolves-outside-src");
  });

  it("test_reexport_and_dynamic_import_are_scanned", () => {
    // Kills the mutation that scans only static import declarations.
    // `export { x } from "external"` and `await import("external")` are both
    // ways to name an external, and a detector that sees neither is a detector
    // with two doors left open.
    const violations = findExternalIsolationViolations(fixture("reexport"));
    expect(violations).toHaveLength(2);
    const files = violations.map((v) => v.file).sort();
    expect(files[0]!.endsWith("src/facts/dynamic.ts")).toBe(true);
    expect(files[1]!.endsWith("src/facts/index.ts")).toBe(true);
    expect(violations.every((v) => v.specifier === "node:crypto")).toBe(true);
  });

  it("test_the_real_src_tree_has_no_external_isolation_violation", () => {
    expect(
      findExternalIsolationViolations({
        srcRoot: resolve(repo, "src"),
        portsRoot: resolve(repo, "src/ports"),
      }),
    ).toEqual([]);
  });
});
