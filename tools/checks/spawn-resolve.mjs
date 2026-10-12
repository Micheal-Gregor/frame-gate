/**
 * Resolves every call in a set of TS/JS files to the declaration it invokes, and
 * reports each one that starts a child process with anything but the Node binary.
 *
 * Why resolution (K7 round 4, CC-6 / DR-07). The detector this replaces matched
 * the callee's rightmost NAME against a list. `import { execFileSync as run }`
 * renamed the call past it, `cp["execFileSync"](...)` had no name it could read,
 * and `const { spawnSync: s } = cp` did both - each a live, unportable spawn with
 * the suite green. The question is not what a call is CALLED here but which
 * function it IS, and only the type checker knows that: a call is a spawn when its
 * resolved signature is declared inside Node's `child_process` module, whatever it
 * is called at the call site. The function's DECLARED name decides its form.
 *
 * The rule (IR-20, unchanged): exec/execSync take a command string for a shell
 * and are never portable; execFile/execFileSync/spawn/spawnSync are portable only
 * when the command is the Node binary; fork launches Node by construction. A
 * command is the Node binary when it resolves to `process.execPath` - directly,
 * through `import { execPath } from "node:process"`, or through a const bound to
 * either. A registered exception (tools/checks/spawn-exceptions.json) admits one
 * named command at one file, and nothing else.
 *
 * Out of process and plain JavaScript: building a program over @types/node inside
 * a vitest worker is the heap problem fixture-compiles.mjs documents, and plain JS
 * needs no loader (IR-21).
 *
 * Usage:  node tools/checks/spawn-resolve.mjs '<json: {scopes: [{roots, exclude}]}>'
 * Output: {results: [[{file, line, callee, defect}], ...]} - one list per scope, in
 *         order. `file` is the absolute host path; the caller brands it (IR-19).
 */
import ts from "typescript";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const request = JSON.parse(process.argv[2] ?? "{}");
const scopes = request.scopes ?? [];

const SHELL_FORMS = new Set(["exec", "execSync"]);
const ARGV_FORMS = new Set(["execFile", "execFileSync", "spawn", "spawnSync"]);
const ADMITTED_FORMS = new Set(["fork"]);

const registry = JSON.parse(readFileSync(resolve(repo, "tools/checks/spawn-exceptions.json"), "utf8"));
const exceptions = registry.exceptions ?? [];

const contained = (parent, child) => {
  const p = resolve(parent);
  const c = resolve(child);
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep);
};

function sourceFiles(root, exclude) {
  const out = [];
  const walk = (dir) => {
    if (exclude.some((e) => contained(e, dir))) return;
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== "node_modules") walk(full);
      } else if (/\.(ts|mts|mjs|cjs|js)$/.test(name) && !name.endsWith(".d.ts")) {
        if (!exclude.some((e) => contained(e, full))) out.push(resolve(full));
      }
    }
  };
  walk(resolve(root));
  return out.sort();
}

const perScope = scopes.map((s) => {
  const exclude = (s.exclude ?? []).map((e) => resolve(e));
  return [...new Set(s.roots.flatMap((r) => sourceFiles(r, exclude)))].sort();
});
const allFiles = [...new Set(perScope.flat())];

const program = ts.createProgram(allFiles, {
  allowJs: true,
  checkJs: false,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2022,
  types: ["node"],
  noEmit: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();

/** The child_process function a declaration belongs to, or null. */
function childProcessFunction(decl) {
  let fn = decl.name && ts.isIdentifier(decl.name) ? decl.name.text : null;
  for (let n = decl.parent; n; n = n.parent) {
    if (ts.isModuleDeclaration(n)) {
      if (ts.isStringLiteral(n.name)) {
        return n.name.text === "child_process" || n.name.text === "node:child_process" ? fn : null;
      }
      // `namespace exec { function __promisify__ }` - the promisified exec is exec.
      if (fn === "__promisify__" && ts.isIdentifier(n.name)) fn = n.name.text;
    }
  }
  return null;
}

const resolveAlias = (sym) =>
  sym && sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;

/** True when the expression resolves to process.execPath, by symbol, not spelling. */
function isNodeBinary(expr, depth = 0) {
  if (!expr) return false;
  const at = ts.isPropertyAccessExpression(expr) ? expr.name : expr;
  const sym = resolveAlias(checker.getSymbolAtLocation(at));
  if (!sym) return false;
  const isExecPath = (sym.declarations ?? []).some(
    (d) =>
      sym.name === "execPath" &&
      (ts.isPropertySignature(d) || ts.isPropertyDeclaration(d)) &&
      ts.isInterfaceDeclaration(d.parent) &&
      d.parent.name.text === "Process",
  );
  if (isExecPath) return true;
  const d = sym.valueDeclaration;
  if (
    depth < 3 &&
    d &&
    ts.isVariableDeclaration(d) &&
    d.initializer &&
    ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const
  ) {
    return isNodeBinary(d.initializer, depth + 1);
  }
  return false;
}

/** A registered exception: this exact command, named literally, at this exact file. */
function isRegistered(file, first) {
  if (!first || !ts.isStringLiteralLike(first)) return false;
  const rel = relative(repo, file).split(sep).join("/");
  return exceptions.some((e) => e.file === rel && e.command === first.text);
}

const violationsByFile = new Map();
for (const file of allFiles) {
  const sf = program.getSourceFile(file);
  const found = [];
  if (sf) {
    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        const sig = checker.getResolvedSignature(node);
        const decl = sig?.getDeclaration?.() ?? sig?.declaration;
        const fn = decl ? childProcessFunction(decl) : null;
        if (fn !== null && !ADMITTED_FORMS.has(fn)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          const first = node.arguments[0];
          if (SHELL_FORMS.has(fn)) {
            found.push({ file, line, callee: fn, defect: "shell-command-string" });
          } else if (ARGV_FORMS.has(fn) && !isNodeBinary(first) && !isRegistered(file, first)) {
            found.push({ file, line, callee: fn, defect: "command-is-not-the-node-binary" });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  violationsByFile.set(file, found);
}

process.stdout.write(
  JSON.stringify({ results: perScope.map((files) => files.flatMap((f) => violationsByFile.get(f) ?? [])) }),
);
