/**
 * Compiles the kernel's must-not-compile fixtures and reports diagnostic counts.
 *
 * Runs as its own process, invoked by the test rather than imported into it.
 * TypeScript's checker builds a 61-file type graph in ~370ms standalone and
 * exhausts the heap inside a vitest worker; the work is identical, the host is
 * not. Keeping it here also matches MOD-02's shape - the detector is a tool,
 * the test is thin.
 *
 * PLAIN JS, deliberately (K7 round 3, CC-4). As TypeScript this file could only
 * be launched through a loader, and the test reached that loader through `npx`.
 * Node refuses to spawn a `.cmd` shim without a shell (EINVAL, since the fix for
 * CVE-2024-27980), so on Windows the spawn threw and BC-01-3 / BC-01-4 never ran
 * - RED on a clean tree, which makes a mutation kill indistinguishable from a
 * permanent error. Stripping the annotations removes the loader, which removes
 * the shim, which removes the platform. Its correctness is established by the
 * base cases it feeds: if this file breaks, BC-01-1..5 go red.
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

const out = {};
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
