/**
 *
 * SCOPE (R-15). DECIDES, in every .ts/.mts/.cts/.tsx/.js/.mjs/.cjs/.jsx file of a scope:
 * a call that RESOLVES (directly, renamed, element-access, destructured, or via
 * .call/.apply/Reflect.apply) to a child_process launcher, refused unless its command
 * resolves to process.execPath and no `shell` option is on; fork admitted; one
 * registered exception (spawn-exceptions.json).
 * LIMITS: a module loaded through createRequire is `any` and resolves nowhere
 * (spawn-portability/limit-create-require/).
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
      } else if (/\.(ts|mts|cts|tsx|js|mjs|cjs|jsx)$/.test(name) && !/\.d\.(ts|mts|cts)$/.test(name)) {
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

/**
 * True when any options argument turns the shell on (K7 round 5, DR-15). Decided
 * by the TYPE of the `shell` property, so an options object held in a variable or
 * built by spreading is read the same as a literal: anything but `false` (or
 * absent) means the command is handed to cmd.exe on one host and sh on another,
 * whatever the first argument is.
 */
function shellOn(args) {
  return args.some((a) => {
    const t = checker.getTypeAtLocation(a);
    const shell = checker.getPropertiesOfType(t).find((p) => p.escapedName === "shell");
    if (!shell) return false;
    const st = checker.getTypeOfSymbolAtLocation(shell, a);
    const parts = st.isUnion() ? st.types : [st];
    return parts.some((c) => !(c.flags & (ts.TypeFlags.BooleanLiteral | ts.TypeFlags.Undefined)) ||
      (c.flags & ts.TypeFlags.BooleanLiteral && c.intrinsicName === "true"));
  });
}

/**
 * The child_process function a call invokes, and the arguments it receives -
 * directly, or through `f.call(this, ...)`, `f.apply(this, [...])` or
 * `Reflect.apply(f, this, [...])` (K7 round 5, DR-15). Through the indirections
 * the resolved signature is Function.prototype's, so the TARGET is resolved from
 * the type of the expression being called. Arguments passed as a non-literal
 * array cannot be read; they come back as `null`, which no rule admits.
 */
function invoked(node) {
  const direct = checker.getResolvedSignature(node);
  const dd = direct?.getDeclaration?.() ?? direct?.declaration;
  const directFn = dd ? childProcessFunction(dd) : null;
  if (directFn !== null) return { fn: directFn, args: [...node.arguments] };

  const fnOf = (expr) => {
    for (const sig of checker.getTypeAtLocation(expr).getCallSignatures()) {
      const d = sig.getDeclaration?.() ?? sig.declaration;
      const fn = d ? childProcessFunction(d) : null;
      if (fn !== null) return fn;
    }
    return null;
  };
  const spread = (arr) => (arr && ts.isArrayLiteralExpression(arr) ? [...arr.elements] : null);

  const callee = node.expression;
  // Reflect.apply FIRST: it is also a property access named "apply", and the
  // .call/.apply branch below would take it, fail to resolve `Reflect`, and stop.
  if (
    ts.isPropertyAccessExpression(callee) &&
    callee.name.text === "apply" &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === "Reflect" &&
    node.arguments[0] !== undefined
  ) {
    const fn = fnOf(node.arguments[0]);
    if (fn === null) return null;
    return { fn, args: spread(node.arguments[2]) };
  }
  if (ts.isPropertyAccessExpression(callee) && (callee.name.text === "call" || callee.name.text === "apply")) {
    const fn = fnOf(callee.expression);
    if (fn === null) return null;
    return { fn, args: callee.name.text === "call" ? node.arguments.slice(1) : spread(node.arguments[1]) };
  }
  return null;
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
      const call = ts.isCallExpression(node) ? invoked(node) : null;
      if (call !== null && !ADMITTED_FORMS.has(call.fn)) {
        const { fn, args } = call;
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        const first = args?.[0];
        if (SHELL_FORMS.has(fn) || (args !== null && shellOn(args))) {
          found.push({ file, line, callee: fn, defect: "shell-command-string" });
        } else if (ARGV_FORMS.has(fn) && (args === null || (!isNodeBinary(first) && !isRegistered(file, first)))) {
          found.push({ file, line, callee: fn, defect: "command-is-not-the-node-binary" });
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
