/**
 * S3 §5 property (B): every refusal row's Test name selects EXACTLY ONE case under the declared
 * single-test command (`vitest run -t "<name>"`, a pattern over the full test name). Decided over
 * the S3's own §5 table and the suite's own titles - never a list (RD-12). K7 round 11 found a
 * fix-round title that contained REF-03's name, so the name selected two (DR-36, WI-14).
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const s3 = readFileSync(resolve(repo, "governance/S3/CLAUDE_FrameGate_Phase3.md"), "utf8");
const moduleDir = new Map([...s3.matchAll(/^\| (MOD-\d\d) \| [a-z]+ \| `([a-z]+)\/` \|/gm)].map((m) => [m[1] ?? "", m[2] ?? ""]));
const rows = [...s3.matchAll(/^\| (REF-\d\d) \| (MOD-\d\d) \|.*\| (test_[a-z0-9_]+) \|\s*$/gm)].map((m) => ({ ref: m[1] ?? "", mod: m[2] ?? "", name: m[3] ?? "" }));

function testFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (name !== "fixtures") out.push(...testFiles(full)); }
    else if (name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}
/** Every case's FULL name - its describe titles and its own, joined as vitest joins them. */
function fullNames(): string[] {
  const names: string[] = [];
  for (const f of testFiles(resolve(repo, "tests"))) {
    const sf = ts.createSourceFile(f, readFileSync(f, "utf8"), ts.ScriptTarget.ES2022, true);
    const visit = (n: ts.Node, suites: string[]) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) {
        const title = n.arguments[0].text;
        if (n.expression.text === "describe") {
          ts.forEachChild(n, (c) => visit(c, [...suites, title]));
          return;
        }
        if (n.expression.text === "it" || n.expression.text === "test") names.push([...suites, title].join(" "));
      }
      ts.forEachChild(n, (c) => visit(c, suites));
    };
    visit(sf, []);
  }
  return names;
}

describe("S3 §5 property (B) - each refusal name selects exactly one case (WI-14)", () => {
  it("test_every_s5_name_of_a_built_module_selects_exactly_one_case", () => {
    const built = rows.filter((r) => { const d = moduleDir.get(r.mod); return d !== undefined && existsSync(resolve(repo, "src", d)); });
    expect(built.map((r) => r.ref), "no built module's refusal rows were found").toEqual(expect.arrayContaining(["REF-01", "REF-02", "REF-03", "REF-05", "REF-06"]));
    const names = fullNames();
    const counts = Object.fromEntries(built.map((r) => [r.ref + " " + r.name, names.filter((n) => new RegExp(r.name).test(n)).length]));
    expect(counts, "a §5 name selects other than exactly one case").toEqual(Object.fromEntries(built.map((r) => [r.ref + " " + r.name, 1])));
  });
});
