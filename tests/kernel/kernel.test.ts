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
  asProjection,
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
interface MemberAssignments {
  members: string[];
  perMember: Record<string, { codes: number[]; messages: string[] }>;
}
type Compiled = Record<string, Diagnostics> & { "appended-fact-members"?: MemberAssignments };
let compiled: Compiled | undefined;
function fixtures(): Compiled {
  if (compiled === undefined) {
    const raw = execFileSync(
      process.execPath,
      [resolve(repo, "tools/checks/fixture-compiles.mjs")],
      { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    compiled = JSON.parse(raw) as Compiled;
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

/**
 * The `kind` of every member of the UnknownValue union, read from the declaration.
 * Each member is a type literal; its `kind` property's type is a string literal.
 * Shared by BC-01-1 (the family is closed at five) and the isUnknown check, so the
 * runtime answer is tested against the same discovered set the closure is.
 */
function discoveredUnknownKinds(): string[] {
  const sf = kernelSource();
  let members: string[] | null = null;
  const visit = (n: ts.Node): void => {
    if (ts.isTypeAliasDeclaration(n) && n.name.text === "UnknownValue" && ts.isUnionTypeNode(n.type)) {
      members = n.type.types.map((m) => {
        if (!ts.isTypeLiteralNode(m)) return "<not a type literal>";
        const kind = m.members.find(
          (p): p is ts.PropertySignature =>
            ts.isPropertySignature(p) && p.name.getText(sf) === "kind",
        );
        const t = kind?.type;
        return t && ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)
          ? t.literal.text
          : "<unparsed>";
      });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (members === null) throw new Error("UnknownValue must be a union type alias in the kernel");
  return members;
}

describe("BC-01-1 - the Unknown family is closed at five", () => {
  it("test_unknown_family_is_closed_at_five_by_source", () => {
    // Discovered from source, not asserted against a list we also wrote.
    // A test that counts a hard-coded five passes when a sixth is added,
    // because it never looked at the declaration.
    const members = discoveredUnknownKinds();
    expect(new Set(members)).toEqual(
      new Set(["refuse", "no-subject", "uncomputable", "undetermined", "latent"]),
    );
    expect(members).toHaveLength(5);
  });

  it("test_is_unknown_answers_whether_not_which", () => {
    // RD-12 (K7 round 5, DR-13): EVERY member discovered from the declaration, not
    // the two this test used to name. Two of five let "refuse" leave the runtime
    // answer unnoticed - a refusal reported as a non-Unknown.
    const kinds = discoveredUnknownKinds();
    expect(kinds.length, "no Unknown members discovered").toBeGreaterThan(0);
    for (const kind of kinds) {
      expect(isUnknown({ kind }), `${kind} is a member and must answer true`).toBe(true);
    }
    expect(isUnknown({ kind: "latent" })).toBe(true);
    expect(isUnknown({ kind: "undetermined", ae: "AE-3" })).toBe(true);
    expect(isUnknown({ kind: "toString" })).toBe(false); // inherited keys are not members
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

  it("test_the_registered_limits_of_the_membership_detector_hold", () => {
    // IR-27 (K7 round 5, DR-11): what no checker can decide is REGISTERED, not
    // presented as covered. Each limit-* fixture is a membership answer the
    // detector cannot see. If a future detector does see one, this goes red and
    // the limit must be re-registered as covered - it cannot quietly change sides.
    const limits = exportFixtures.filter((f) => f.startsWith("limit-"));
    expect(limits.length, "the registered limits have no fixture").toBeGreaterThan(0);
    for (const f of limits) {
      expect(exportsOf(resolve(exportFixtureDir, f)).membership, `${f} is a registered limit`).toEqual([]);
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
describe("BC-01-6 - the kernel mints Projection membership, by name (R-35, WI-10)", () => {
  it("test_only_a_listed_member_joins_the_family", () => {
    const d = diagnosticsFor("join-unlisted.ts");
    // TS2345: "DifficultyAdvisory" is not assignable to ProjectionMember.
    expect(d.codes, "an unlisted name joined the Projection family").toEqual([2345]);
    expect(d.messages.join(" ")).toContain("DifficultyAdvisory");
    expect(diagnosticsFor("join-listed.ts").messages, "a listed member could not join").toEqual([]);
  });

  it("test_a_joined_projection_computes_at_a_height_and_is_frozen", () => {
    const p = asProjection("Reachability", (at) => Number(at) * 10);
    expect(p.compute(height(3))).toBe(30);
    expect(Object.isFrozen(p), "a joined Projection can be edited").toBe(true);
  });

  it("test_the_brand_never_leaves_the_kernel", async () => {
    // R-35 rests on one door: if the brand symbol were exported, any module could mint
    // { [PROJECTION]: "Reachability", compute } with no assertion and no spread for
    // projection-joins to see. Pinned before battery 15.
    const kernel = (await import("../../src/kernel/index.js")) as Record<string, unknown>;
    expect(Object.values(kernel).filter((x) => typeof x === "symbol"), "the kernel exports a symbol").toEqual([]);
    expect(Object.keys(kernel), "the brand is exported by name").not.toContain("PROJECTION");
  });

  it("test_joining_adds_no_membership_predicate", () => {
    // R-35: a join, never a question. The kernel still exports nothing that answers
    // "is this a Projection?" (BC-01-2), now that it exports asProjection.
    const out = JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/kernel-exports.mjs"), kernelPath], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as Record<string, { membership: string[]; heightArithmetic: string[] }>;
    const k = Object.values(out)[0];
    expect(k?.membership).toEqual([]);
    expect(k?.heightArithmetic).toEqual([]);
  });
});

describe("BC-01-7 - who joins the Projection family, and where (R-35)", () => {
  it("test_projection_joins_follow_the_s3_partition", () => {
    type Finding = { file: string; line: number; how: string; member?: string };
    const out = JSON.parse(
      execFileSync(process.execPath, [resolve(repo, "tools/checks/projection-joins.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
    ) as { partition: Record<string, string | null>; joins: string[]; src: Finding[]; fixtures: Record<string, string[]> };
    // The partition is READ from the frozen S3, never restated: every one of the ten members
    // is assigned a module, and the two this build knows are where the S3 puts them.
    expect(Object.keys(out.partition).sort()).toEqual([...PROJECTION_MEMBERS].sort());
    expect(Object.values(out.partition).filter((d) => d === null), "a listed member has no module").toEqual([]);
    expect(out.partition["Reachability"]).toBe("src/reachability");
    expect(out.partition["Sample"]).toBe("src/condition");
    expect(out.src, "a Projection joined outside the rule in src/").toEqual([]);
    expect(out.fixtures).toEqual({
      "src/advisory/limit-object-assign.ts": [],
      "src/advisory/violating-advisory-join.ts": ["advisory-join"],
      "src/advisory/violating-spread-join.ts": ["spread-join"],
      "src/condition/violating-dynamic-member.ts": ["dynamic-member"],
      "src/facts/violating-call-join.ts": ["indirect-join"],
      "src/facts/violating-reflect-join.ts": ["indirect-join"],
      "src/facts/violating-wrong-module.ts": ["wrong-module"],
      "src/reachability/conforming-one-join.ts": [],
      "src/reachability/violating-joined-twice.ts": ["joined-twice"],
      "src/statistics/violating-assertion.ts": ["assertion-join"],
      "src/statistics/violating-generic-launder.ts": ["launder-join"],
    });
  });
});

describe("BC-01-3 - AppendedFact has no mutator", () => {
  it("test_assigning_to_an_appended_fact_field_does_not_compile", () => {
    const d = diagnosticsFor("mutate-fact.ts");
    // TS2540: Cannot assign to 'payload' because it is a read-only property.
    expect(d.codes, "assigning to an AppendedFact field must fail as a read-only assignment").toEqual([2540]);
    expect(d.messages[0]).toContain("'payload'");

    // RD-12 (K7 round 5, DR-12): the rule is "every field is readonly", so every
    // field DISCOVERED from the declaration is assigned, one compile each, and each
    // must fail with TS2540 naming that field. Pinning `payload` alone let
    // `author` and `at` lose readonly with this test green.
    const all = fixtures()["appended-fact-members"];
    expect(all?.members.length, "no AppendedFact members discovered").toBeGreaterThan(0);
    for (const m of all!.members) {
      const r = all!.perMember[m];
      expect(r?.codes, `assigning to AppendedFact.${m} must be refused as read-only`).toEqual([2540]);
      expect(r?.messages[0]).toContain(`'${m}'`);
    }
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
