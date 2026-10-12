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
 * Output: one JSON object, {fixture: {count, codes, messages}}.
 *
 * `codes` exists because a count cannot tell the diagnostic a fixture is FOR from
 * any other (K7 round 4, CC-6 / DR-09): an unrelated error - a broken import, a
 * typo - satisfied "count > 0" and left a must-not-compile base case green while
 * proving nothing. The base cases pin the code.
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
    codes: d.map((x) => x.code),
    messages: d.map((x) => ts.flattenDiagnosticMessageText(x.messageText, " ")),
  };
}
/*
 * BC-01-3 over EVERY field (K7 round 5, CC-6 / DR-12). The fixture above assigns
 * to `payload` only, so dropping `readonly` from `author` or `at` compiled and the
 * base case stayed green - an instance pinned where the rule ("every field is
 * readonly") was meant. The members are discovered from the kernel's own
 * declaration by the type checker, and one assignment per member is compiled from
 * memory; each must fail with TS2540 and nothing else.
 */
const kernelPath = resolve(repo, "src/kernel/index.ts");
const checker = program.getTypeChecker();
const kernelSf = program.getSourceFile(kernelPath);
const kernelMod = kernelSf && checker.getSymbolAtLocation(kernelSf);
const factSym = kernelMod && checker.getExportsOfModule(kernelMod).find((x) => x.name === "AppendedFact");
const members = factSym
  ? checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(factSym)).map((p) => p.name)
  : [];

const virtual = new Map(
  members.map((m) => [
    resolve(dir, `__assign-${m}.ts`),
    [
      'import type { AppendedFact } from "../../../src/kernel/index.js";',
      "declare const f: AppendedFact<unknown, unknown>;",
      `f[${JSON.stringify(m)}] = f[${JSON.stringify(m)}];`,
      "",
    ].join("\n"),
  ]),
);
const options = program.getCompilerOptions();
const host = ts.createCompilerHost(options);
const realGet = host.getSourceFile.bind(host);
const realExists = host.fileExists.bind(host);
const realRead = host.readFile.bind(host);
const key = (f) => resolve(f);
host.getSourceFile = (f, lang, ...rest) =>
  virtual.has(key(f)) ? ts.createSourceFile(f, virtual.get(key(f)), lang) : realGet(f, lang, ...rest);
host.fileExists = (f) => virtual.has(key(f)) || realExists(f);
host.readFile = (f) => virtual.get(key(f)) ?? realRead(f);

const memberProgram = ts.createProgram([...virtual.keys()], options, host);
const perMember = {};
for (const file of virtual.keys()) {
  const m = file.slice(file.lastIndexOf("__assign-") + "__assign-".length, -".ts".length);
  const sf = memberProgram.getSourceFile(file);
  const d = [...memberProgram.getSemanticDiagnostics(sf), ...memberProgram.getSyntacticDiagnostics(sf)];
  perMember[m] = {
    codes: d.map((x) => x.code),
    messages: d.map((x) => ts.flattenDiagnosticMessageText(x.messageText, " ")),
  };
}
out["appended-fact-members"] = { members, perMember };

process.stdout.write(JSON.stringify(out));
