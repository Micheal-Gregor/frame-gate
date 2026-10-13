/**
 * R-35 (WI-10): who may join the Projection family, and where. The kernel mints membership
 * through `asProjection(member, compute)`; this decides the rest of the door.
 *
 * SCOPE (R-15) - what this checker decides, and what it registers. K7 scores it against this
 * statement; a limit is pinned by a `limit-` fixture it must NOT flag.
 *   joins  DECIDES, in src/: every call resolving to the kernel's `asProjection`
 *          - names its member by a string LITERAL (`dynamic-member` otherwise);
 *          - sits in the module the S3 partition assigns that member, read from the frozen
 *            S3's object and module tables, never restated here (`wrong-module`; in
 *            `advisory/`, OBJ-34's module, `advisory-join`);
 *          - is the only join of that member in src/ (`joined-twice`).
 *          And no Projection is made any other way: a type ASSERTION whose result carries
 *          the Projection brand (`assertion-join`); an object literal SPREADING a branded
 *          value - the brand is an enumerable own symbol, so a spread re-brands a new
 *          computation (`spread-join`); a call to a user GENERIC whose declared return is a
 *          bare type parameter, instantiated to a branded type (`launder-join`, as
 *          catalog-mint decides it; R-38); `asProjection` reached INDIRECTLY, recognised by
 *          its TYPE wherever it is held (alias, property, parameter): as the receiver of
 *          `.call`, `.apply` or `.bind`, or as an ARGUMENT to any library function
 *          (`Reflect.apply`, `Function.prototype.call.call`), where its member cannot be read
 *          off the call (`indirect-join`; R-38, R-39); a Projection-typed position filled by
 *          `any` (`any-flow-join`); and a user type guard asserting a Projection
 *          (`guard-join`) - the two doors catalog-mint decides for ledger brands (IR-36;
 *          R-39). Only the kernel mints; its own body is exempt.
 *          Fixtures under tests/fixtures/projection-joins/src/<root>/ are judged at the
 *          path they mirror.
 *          LIMITS: `Object.assign(target, joined)` copies the brand through a library call
 *          whose result type is an intersection (limit-object-assign.ts); `asProjection`
 *          handed to a USER higher-order function that calls it (limit-user-higher-order.ts;
 *          R-39).
 *          BOUNDARY: code outside src/ is not read, except this rule's fixtures.
 *
 * Out of process and plain JavaScript for the reasons fixture-compiles.mjs gives (IR-21).
 *
 * Usage:  node tools/checks/projection-joins.mjs
 */
import ts from "typescript";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rel = (f) => relative(repo, f).split(sep).join("/");
const KERNEL = "src/kernel/index.ts";

function walk(dir, re) {
  const out = [];
  if (!existsSync(dir)) return out;
  const go = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) go(full);
      else if (re.test(name) && !/\.d\.(ts|mts|cts)$/.test(name)) out.push(resolve(full));
    }
  };
  go(dir);
  return out.sort();
}

// ---- the partition, read from the frozen S3 (never restated) ---------------------------------
const s3 = readFileSync(resolve(repo, "governance/S3/CLAUDE_FrameGate_Phase3.md"), "utf8");
const moduleDir = new Map(); // MOD-nn -> "src/<dir>"
for (const m of s3.matchAll(/^\| (MOD-\d\d) \| [a-z]+ \| `([a-z]+)\/` \|/gm)) moduleDir.set(m[1], `src/${m[2]}`);
const objectModule = new Map(); // Name -> MOD-nn
for (const m of s3.matchAll(/^\| OBJ-\d\d \| (MOD-\d\d) \| ([A-Za-z]+) —/gm)) objectModule.set(m[2], m[1]);

const SRC = walk(resolve(repo, "src"), /\.(ts|mts|cts|tsx)$/);
const FIX_DIR = resolve(repo, "tests/fixtures/projection-joins");
const FIXTURES = walk(FIX_DIR, /\.ts$/);
const mirrored = (f) => relative(FIX_DIR, f).split(sep).join("/");
const program = ts.createProgram([...SRC, ...FIXTURES], {
  strict: true,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2022,
  lib: ["lib.es2022.d.ts"],
  types: ["node"],
  noEmit: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const lineOf = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

// ---- anchors, resolved from the kernel ----------------------------------------------------------
const kernelSf = program.getSourceFile(resolve(repo, KERNEL));
const kernelExports = checker.getExportsOfModule(checker.getSymbolAtLocation(kernelSf));
const exportNamed = (name) => {
  const s = kernelExports.find((x) => x.name === name);
  if (!s) throw new Error(`${KERNEL} does not export ${name}; the check has no anchor`);
  return s;
};
const members = (() => {
  const t = checker.getTypeOfSymbol(exportNamed("PROJECTION_MEMBERS"));
  const elems = checker.isTupleType(t) ? checker.getTypeArguments(t) : [];
  return elems.filter((e) => e.isStringLiteral()).map((e) => e.value);
})();
const brand = (() => {
  const t = checker.getDeclaredTypeOfSymbol(exportNamed("Projection"));
  const b = checker.getPropertiesOfType(t).find((p) => p.declarations?.some((d) => d.name && ts.isComputedPropertyName(d.name)));
  if (!b) throw new Error("Projection carries no computed-key brand; the check has no anchor");
  return b.escapedName;
})();
const asProjectionDecl = exportNamed("asProjection").declarations?.[0];
const parts = (t) => (t.isUnion() ? t.types : t.isIntersection() ? t.types : [t]);
const isBranded = (t) => !!t && (checker.getPropertiesOfType(t).some((p) => p.escapedName === brand) || parts(t).some((c) => c !== t && isBranded(c)));
const assigned = new Map(members.map((m) => [m, objectModule.has(m) ? moduleDir.get(objectModule.get(m)) : undefined]));
const ADVISORY = moduleDir.get(objectModule.get("DifficultyAdvisory") ?? "MOD-13") ?? "src/advisory";

function joinFindings(file, here) {
  const sf = program.getSourceFile(file);
  const found = [];
  const joins = [];
  if (here === KERNEL) return { found, joins };
  const add = (n, how, member) => found.push({ file: here, line: lineOf(sf, n), how, ...(member ? { member } : {}) });
  const visit = (n) => {
    if (ts.isCallExpression(n)) {
      const sig = checker.getResolvedSignature(n);
      const d = sig && (sig.getDeclaration?.() ?? sig.declaration);
      if (d && asProjectionDecl && d === asProjectionDecl) {
        const arg = n.arguments[0];
        if (!arg || !ts.isStringLiteralLike(arg)) add(n, "dynamic-member");
        else {
          const member = arg.text;
          const where = assigned.get(member);
          joins.push({ member, file: here, line: lineOf(sf, n) });
          if (here === ADVISORY || here.startsWith(ADVISORY + "/")) add(n, "advisory-join", member);
          else if (!where || !(here === where || here.startsWith(where + "/"))) add(n, "wrong-module", member);
        }
      }
    }
    if ((ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) && isBranded(checker.getTypeAtLocation(n))) add(n, "assertion-join");
    if (ts.isCallExpression(n)) {
      // launder-join: a user generic whose declared return is a bare type parameter
      const sig = checker.getResolvedSignature(n);
      const d = sig && (sig.getDeclaration?.() ?? sig.declaration);
      const ret = d && d.type;
      if (d && d !== asProjectionDecl && !program.isSourceFileDefaultLibrary(d.getSourceFile()) && ret && ts.isTypeReferenceNode(ret) &&
          (d.typeParameters ?? []).some((tp) => tp.name.text === ret.typeName.getText()) && isBranded(checker.getTypeAtLocation(n))) {
        add(n, "launder-join");
      }
      // indirect-join: asProjection, recognised by TYPE wherever held, as a receiver of
      // call / apply / bind, or as an argument to any library function (R-39)
      const callee = n.expression;
      const isJoin = (x) => {
        if (!x) return false;
        let s = checker.getSymbolAtLocation(x);
        if (s && s.flags & ts.SymbolFlags.Alias) s = checker.getAliasedSymbol(s);
        if (s?.declarations?.some((dd) => dd === asProjectionDecl)) return true;
        return checker.getTypeAtLocation(x).getCallSignatures().some((g) => (g.getDeclaration?.() ?? g.declaration) === asProjectionDecl);
      };
      if (ts.isPropertyAccessExpression(callee) && ["call", "apply", "bind"].includes(callee.name.text) && isJoin(callee.expression)) add(n, "indirect-join");
      else if (d && program.isSourceFileDefaultLibrary(d.getSourceFile()) && n.arguments.some((a) => isJoin(a))) add(n, "indirect-join");
    }
    // any-flow-join: a Projection-typed position filled by `any` (R-39)
    const q = n.parent;
    const valuePosition = q && ((ts.isVariableDeclaration(q) && q.initializer === n) || (ts.isReturnStatement(q) && q.expression === n) ||
      (ts.isCallExpression(q) && q.arguments.includes(n)) || (ts.isPropertyAssignment(q) && q.initializer === n) ||
      (ts.isBinaryExpression(q) && q.operatorToken.kind === ts.SyntaxKind.EqualsToken && q.right === n));
    if (valuePosition && ts.isExpression(n) && (checker.getTypeAtLocation(n).flags & ts.TypeFlags.Any) && isBranded(checker.getContextualType(n))) {
      add(n, "any-flow-join");
    }
    // guard-join: a user type guard asserting a Projection (R-39)
    if (ts.isFunctionLike(n) && n.type && ts.isTypePredicateNode(n.type) && n.type.type && isBranded(checker.getTypeFromTypeNode(n.type.type))) {
      add(n, "guard-join");
    }
    if (ts.isObjectLiteralExpression(n) && n.properties.some((p) => ts.isSpreadAssignment(p) && isBranded(checker.getTypeAtLocation(p.expression)))) {
      add(n, "spread-join");
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { found, joins };
}

/** `joined-twice`, over a set of files that make up one tree (src/, or one fixture). */
function withTwice(results) {
  const found = results.flatMap((r) => r.found);
  const joins = results.flatMap((r) => r.joins);
  const by = new Map();
  for (const j of joins) by.set(j.member, [...(by.get(j.member) ?? []), j]);
  for (const [member, js] of by) if (js.length > 1) for (const j of js.slice(1)) found.push({ file: j.file, line: j.line, how: "joined-twice", member });
  return { found, joins };
}

const src = withTwice(SRC.map((f) => joinFindings(f, rel(f))));
process.stdout.write(JSON.stringify({
  partition: Object.fromEntries([...assigned].map(([m, d]) => [m, d ?? null])),
  joins: src.joins.map((j) => `${j.member} ${j.file}`),
  src: src.found,
  fixtures: Object.fromEntries(FIXTURES.map((f) => [mirrored(f), withTwice([joinFindings(f, mirrored(f))]).found.map((x) => x.how).sort()])),
}));
