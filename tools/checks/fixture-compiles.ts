/**
 * Compiles the kernel's must-not-compile fixtures and reports diagnostic counts.
 *
 * Runs as its own process, invoked by the test rather than imported into it.
 * TypeScript's checker builds a 61-file type graph in ~370ms standalone and
 * exhausts the heap inside a vitest worker; the work is identical, the host is
 * not. Keeping it here also matches MOD-02's shape - the detector is a tool,
 * the test is thin.
 *
 * Output: one JSON object, {fixture: {count, messages}}.
 */
import ts from "typescript";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dir = resolve(repo, "tests/fixtures/kernel");
const fixtures = ["mutate-fact.ts", "gate-without-onfail.ts", "gate-well-formed.ts"];

const program = ts.createProgram(
  fixtures.map((f) => resolve(dir, f)),
  {
    strict: true,
    exactOptionalPropertyTypes: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    lib: ["lib.es2022.d.ts"],
    types: [],
    noEmit: true,
    skipLibCheck: true,
  },
);

const out: Record<string, { count: number; messages: string[] }> = {};
for (const f of fixtures) {
  const sf = program.getSourceFile(resolve(dir, f));
  const d = [
    ...program.getSemanticDiagnostics(sf),
    ...program.getSyntacticDiagnostics(sf),
  ];
  out[f] = {
    count: d.length,
    messages: d.map((x) => ts.flattenDiagnosticMessageText(x.messageText, " ")),
  };
}
process.stdout.write(JSON.stringify(out));
