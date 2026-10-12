/**
 * BC-01-1..5. MOD-01 carries no S3 section 5 refusal row (CT-4 N/A-by-absence),
 * but its stated job is to make three violations unwritable, so the base cases
 * pin those directly. RD-12: the checks discover from source and reject a
 * hard-coded expectation that would pass without looking.
 */
import { describe, expect, it } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import {
  PROJECTION_MEMBERS,
  compare,
  height,
  isUnknown,
  succeeds,
} from "../../src/kernel/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const kernelPath = resolve(repo, "src/kernel/index.ts");

function kernelSource(): ts.SourceFile {
  return ts.createSourceFile(
    kernelPath,
    readFileSync(kernelPath, "utf8"),
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
}

/**
 * The fixture compile runs in its OWN PROCESS, not in this worker.
 *
 * TypeScript builds the 61-file type graph in ~370ms standalone and exhausts the
 * heap inside a vitest worker - the work is identical, the host is not. Spawning
 * the checker keeps it inside `test_command` (so it remains a gate) without
 * putting the checker in the worker.
 *
 * It spawns the NODE BINARY at an absolute script path, never a command name
 * (K7 round 3, CC-4). The previous form reached a `.cmd` shim through `npx`, and
 * Node refuses to spawn one without a shell - so this threw EINVAL on Windows and
 * BC-01-3 / BC-01-4 were red on a clean tree. tests/checks/spawn-portability
 * now holds that rule for the whole tree.
 */
interface Diagnostics {
  count: number;
  codes: number[];
  messages: string[];
}
let compiled: Record<string, Diagnostics> | undefined;
function fixtures(): Record<string, Diagnostics> {
  if (compiled === undefined) {
    const raw = execFileSync(
      process.execPath,
      [resolve(repo, "tools/checks/fixture-compiles.mjs")],
      { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    compiled = JSON.parse(raw) as Record<string, Diagnostics>;
  }
  return compiled;
}
const diagnosticsFor = (f: string): Diagnostics =>
  fixtures()[f] ?? { count: -1, codes: [], messages: ["fixture not compiled"] };

/**
 * What the kernel's exports - and each detector fixture's - can answer, decided by
 * the type checker in its own process (tools/checks/kernel-exports.mjs; K7 round 4,
 * DR-06). One spawn covers the kernel and every fixture, for the same heap reason
 * as the fixture compile above.
 */
interface ExportAnswers {
  membership: string[];
  heightArithmetic: string[];
}
const exportFixtureDir = resolve(repo, "tests/fixtures/kernel-exports");
const exportFixtures = readdirSync(exportFixtureDir).filter((f) => f.endsWith(".ts")).sort();
let answered: Record<string, ExportAnswers> | undefined;
function exportsOf(file: string): ExportAnswers {
  if (answered === undefined) {
    const files = [kernelPath, ...exportFixtures.map((f) => resolve(exportFixtureDir, f))];
    const raw = execFileSync(
      process.execPath,
      [resolve(repo, "tools/checks/kernel-exports.mjs"), ...files],
      { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    answered = JSON.parse(raw) as Record<string, ExportAnswers>;
  }
  const a = answered[file];
  if (a === undefined) throw new Error(`kernel-exports did not report ${file}`);
  return a;
}

describe("BC-01-1 - the Unknown family is closed at five", () => {
  it("test_unknown_family_is_closed_at_five_by_source", () => {
    // Discovered from source, not asserted against a list we also wrote.
    // A test that counts a hard-coded five passes when a sixth is added,
    // because it never looked at the declaration.
    const sf = kernelSource();
    let members: string[] | null = null;
    const visit = (n: ts.Node): void => {
      if (
        ts.isTypeAliasDeclaration(n) &&
        n.name.text === "UnknownValue" &&
        ts.isUnionTypeNode(n.type)
      ) {
        members = n.type.types.map((m) => {
          const lit = m.getText().match(/kind:\s*"([a-z-]+)"/);
          return lit?.[1] ?? "<unparsed>";
        });
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);

    expect(members, "UnknownValue must be a union type alias in the kernel").not.toBeNull();
    expect(new Set(members!)).toEqual(
      new Set(["refuse", "no-subject", "uncomputable", "undetermined", "latent"]),
    );
    expect(members!).toHaveLength(5);
  });

  it("test_is_unknown_answers_whether_not_which", () => {
    expect(isUnknown({ kind: "latent" })).toBe(true);
    expect(isUnknown({ kind: "undetermined", ae: "AE-3" })).toBe(true);
    expect(isUnknown(null)).toBe(false);
    expect(isUnknown(0)).toBe(false);
    expect(isUnknown({ kind: "absent", discharge: "x" })).toBe(false); // OBJ-09 is not a member
  });
});

describe("BC-01-2 - no Projection membership predicate", () => {
  it("test_kernel_exports_no_projection_membership_predicate", () => {
    // RD-13: resolved by the type checker, never by text. Any exported callable -
    // in any declaration form, under any name, asserting the family through any
    // alias - whose type predicate asserts a Projection lets a caller ask "is this
    // a Projection?" and get an answer from shape, which readmits OBJ-34 and
    // defeats DG-F1.
    expect(exportsOf(kernelPath).membership).toEqual([]);
  });

  it("test_the_membership_detector_sees_every_export_form", () => {
    // RD-12: the forms are discovered from the fixture directory, not listed here.
    // An empty answer for the kernel above is only evidence if the same detector
    // answers non-empty for every form that could carry a predicate out.
    const forms = exportFixtures.filter((f) => f.startsWith("membership-"));
    expect(forms.length, "no membership fixtures discovered").toBeGreaterThan(0);
    for (const f of forms) {
      const a = exportsOf(resolve(exportFixtureDir, f));
      expect(a.membership, `${f} carries a membership predicate the detector missed`).not.toEqual([]);
      expect(a.heightArithmetic, `${f} is not height arithmetic`).toEqual([]);
    }
    for (const f of exportFixtures.filter((x) => x.startsWith("conforming-"))) {
      expect(exportsOf(resolve(exportFixtureDir, f)), `${f} must not be flagged`).toEqual({
        membership: [],
        heightArithmetic: [],
      });
    }
  });

  it("test_projection_family_is_the_ten_named_members", () => {
    expect(PROJECTION_MEMBERS).toHaveLength(10);
    expect(new Set(PROJECTION_MEMBERS)).toEqual(
      new Set([
        "Sample", "Dispersion", "Location", "Bar", "PopulationPartition",
        "Reachability", "Diagnostic", "Ratio", "Chain", "InvalidationScope",
      ]),
    );
    expect(PROJECTION_MEMBERS).not.toContain("DifficultyAdvisory");
  });
});

/*
 * BC-01-3 and BC-01-4 pin the ONE diagnostic each fixture exists to produce
 * (K7 round 4, CC-6 / DR-09). "Some error" was satisfied by any unrelated
 * breakage - a bad import path, a typo - which left the base case green while it
 * proved nothing. Exactly one diagnostic, with the code and the subject named.
 */
describe("BC-01-3 - AppendedFact has no mutator", () => {
  it("test_assigning_to_an_appended_fact_field_does_not_compile", () => {
    const d = diagnosticsFor("mutate-fact.ts");
    // TS2540: Cannot assign to 'payload' because it is a read-only property.
    expect(d.codes, "assigning to an AppendedFact field must fail as a read-only assignment").toEqual([2540]);
    expect(d.messages[0]).toContain("'payload'");
  });
});

describe("BC-01-4 - a Gate without ON_FAIL is malformed", () => {
  it("test_gate_without_on_fail_does_not_compile", () => {
    const d = diagnosticsFor("gate-without-onfail.ts");
    // TS2741: Property 'onFail' is missing in type ... but required in type 'Gate<...>'.
    expect(d.codes, "a Gate omitting onFail must fail as a missing required property").toEqual([2741]);
    expect(d.messages[0]).toContain("'onFail'");
  });

  it("test_well_formed_gate_compiles", () => {
    // The refusal cannot pass by rejecting everything.
    expect(diagnosticsFor("gate-well-formed.ts").messages).toEqual([]);
  });
});

describe("BC-01-5 - RecordHeight ordering", () => {
  it("test_record_height_is_a_total_order_that_never_decreases", () => {
    const hs = [0, 1, 2, 7, 100].map(height);
    for (const a of hs) {
      for (const b of hs) {
        // Sum rather than negation: -compare(b,a) yields -0 when compare is 0,
        // and toBe uses Object.is, which distinguishes -0 from +0.
        expect(compare(a, b) + compare(b, a)).toBe(0); // antisymmetric
        for (const c of hs) {
          if (compare(a, b) <= 0 && compare(b, c) <= 0) {
            expect(compare(a, c)).toBeLessThanOrEqual(0); // transitive
          }
        }
      }
    }
    expect(succeeds(hs[1]!, hs[0]!)).toBe(true);
    expect(succeeds(hs[0]!, hs[0]!)).toBe(false); // equal does not succeed
    expect(succeeds(hs[0]!, hs[1]!)).toBe(false); // earlier does not succeed
  });

  it("test_kernel_exposes_no_height_arithmetic", () => {
    // A RecordHeight-returning callable of two or more RecordHeights is arithmetic,
    // in whatever form it is exported and through whatever alias it is spelled.
    expect(exportsOf(kernelPath).heightArithmetic).toEqual([]);
  });

  it("test_the_height_detector_sees_every_export_form", () => {
    const forms = exportFixtures.filter((f) => f.startsWith("height-"));
    expect(forms.length, "no height fixtures discovered").toBeGreaterThan(0);
    for (const f of forms) {
      const a = exportsOf(resolve(exportFixtureDir, f));
      expect(a.heightArithmetic, `${f} is height arithmetic the detector missed`).not.toEqual([]);
      expect(a.membership, `${f} is not a membership predicate`).toEqual([]);
    }
  });
});
