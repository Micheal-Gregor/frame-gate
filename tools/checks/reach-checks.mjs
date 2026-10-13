/**
 * MOD-04's two "Do not" rules, decided by the type checker (BC-04-7; CLAUDE.md; F2 OBJ-24/29;
 * F1 S-13).
 *
 * SCOPE (R-15) - what this checker decides, and what it registers. K7 scores it against this
 * statement; a limit is pinned by a `limit-` fixture it must NOT flag.
 *   soleSite  "Do not write a second reachability check." DECIDES, in src/ outside
 *             src/reachability/: a commitment READ - a call whose return type carries the
 *             Commitment brand and which takes a RecordHeight - made inside an ITERATION: a
 *             loop statement, or a callback handed to a library Array / ReadonlyArray method
 *             (resolved, not named). One read outside an iteration (MOD-05's `from` check) is
 *             not a fold over the order. Fixtures under tests/fixtures/reach-sole-site/src/<root>/
 *             are judged at the path they mirror.
 *             LIMITS: a fold written as recursion over the predecessor list
 *             (limit-recursive-fold.ts).
 *   branch    "No per-currency branch" (S-13: no branch on currency identity). DECIDES, in
 *             src/: an equality comparison (`===`, `!==`, `==`, `!=`) or a `case` of a
 *             `switch` on a Currency, whose other side is a PARTICULAR member of the order: a
 *             string literal (through `as`, `satisfies`, parentheses or `!`), a zero-parameter
 *             call returning a Currency (the least), an element access or `.at(...)` with a
 *             literal index into a Currency collection, or a `const` initialised by one of
 *             those (one hop). Two currencies that are both data - a lookup - are not a
 *             branch. Fixtures under tests/fixtures/reach-branch/src/<root>/.
 *             LIMITS: a particular member reached through a collection's membership test,
 *             e.g. `new Set([order.least()]).has(c)` (limit-set-membership.ts); more than one
 *             hop of `const`.
 *   BOUNDARY: code outside src/ is not read, except these rules' fixtures.
 *
 * Out of process and plain JavaScript for the reasons fixture-compiles.mjs gives (IR-21).
 *
 * Usage:  node tools/checks/reach-checks.mjs
 */
import ts from "typescript";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rel = (f) => relative(repo, f).split(sep).join("/");
const REACH = "src/reachability";

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

const SRC = walk(resolve(repo, "src"), /\.(ts|mts|cts|tsx)$/);
const SOLE_DIR = resolve(repo, "tests/fixtures/reach-sole-site");
const BRANCH_DIR = resolve(repo, "tests/fixtures/reach-branch");
const SOLE = walk(SOLE_DIR, /\.ts$/);
const BRANCH = walk(BRANCH_DIR, /\.ts$/);
const mirrored = (base) => (f) => relative(base, f).split(sep).join("/");
const program = ts.createProgram([...SRC, ...SOLE, ...BRANCH], {
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
const isLib = (sf) => program.isSourceFileDefaultLibrary(sf) || sf.fileName.includes("/node_modules/");

// ---- anchors, resolved from the source that owns them --------------------------------------
function brandKey(file, name) {
  const sf = program.getSourceFile(resolve(repo, file));
  const sym = checker.getExportsOfModule(checker.getSymbolAtLocation(sf)).find((s) => s.name === name);
  if (!sym) throw new Error(`${file} does not export ${name}; the check has no anchor`);
  const t = checker.getDeclaredTypeOfSymbol(sym);
  const b = checker.getPropertiesOfType(t).find((p) => p.declarations?.some((d) => d.name && ts.isComputedPropertyName(d.name) && !isLib(d.getSourceFile())));
  if (!b) throw new Error(`${name} carries no computed-key brand; the check has no anchor`);
  return b.escapedName;
}
const COMMITMENT = brandKey("src/facts/commitment-ledger.ts", "Commitment");
const CURRENCY = brandKey("src/catalog/currency-order.ts", "Currency");
const HEIGHT = brandKey("src/kernel/index.ts", "RecordHeight");
const parts = (t) => (t.isUnion() ? t.types : [t]);
const has = (t, key) => checker.getPropertiesOfType(t).some((p) => p.escapedName === key);
const NULLISH = ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void;
const present = (t) => parts(t).filter((c) => (c.flags & NULLISH) === 0);
const carries = (t, key) => !!t && parts(t).some((c) => has(c, key));
const isCurrency = (t) => !!t && present(t).length > 0 && present(t).every((c) => has(c, CURRENCY));
const isCurrencyCollection = (t) => {
  const elem = t && checker.getIndexTypeOfType(t, ts.IndexKind.Number);
  return !!elem && isCurrency(elem);
};
const declOf = (sig) => (sig && (sig.getDeclaration?.() ?? sig.declaration)) || undefined;

// ---- soleSite ------------------------------------------------------------------------------
/** A callback handed to a library Array / ReadonlyArray method - resolved, not named. */
function isArrayCallback(fn) {
  const call = fn.parent;
  if (!call || !ts.isCallExpression(call) || !call.arguments.includes(fn)) return false;
  const d = declOf(checker.getResolvedSignature(call));
  const owner = d?.parent;
  return !!d && isLib(d.getSourceFile()) && !!owner && ts.isInterfaceDeclaration(owner) && /^(Readonly)?Array$/.test(owner.name.text);
}
const LOOPS = (n) => ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n);
const isInlineClosure = (f) => (ts.isArrowFunction(f) || ts.isFunctionExpression(f)) && !ts.isPropertyDeclaration(f.parent);
function insideIteration(n) {
  for (let p = n.parent; p; p = p.parent) {
    if (LOOPS(p)) return true;
    if (ts.isFunctionLike(p)) {
      if (isInlineClosure(p) && isArrayCallback(p)) return true;
      if (!isInlineClosure(p)) return false;
    }
  }
  return false;
}
function soleSiteFindings(file, here) {
  if (here === REACH || here.startsWith(REACH + "/")) return [];
  const sf = program.getSourceFile(file);
  const found = [];
  const visit = (n) => {
    if (ts.isCallExpression(n)) {
      const sig = checker.getResolvedSignature(n);
      const readsAtHeight = sig?.getParameters().some((q) => carries(checker.getTypeOfSymbol(q), HEIGHT));
      if (readsAtHeight && carries(checker.getReturnTypeOfSignature(sig), COMMITMENT) && insideIteration(n)) {
        found.push({ file: here, line: lineOf(sf, n), how: "second-reachability-check" });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

// ---- branch --------------------------------------------------------------------------------
const strip = (e) => {
  while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e))) e = e.expression;
  return e;
};
const isLiteralIndex = (a) => !!a && (ts.isNumericLiteral(a) || (ts.isPrefixUnaryExpression(a) && ts.isNumericLiteral(a.operand)));
/** A PARTICULAR member of the order, as opposed to a currency that is data. */
function particular(expr, hops) {
  const e = strip(expr);
  if (!e) return false;
  if (ts.isStringLiteralLike(e)) return true;
  if (ts.isCallExpression(e)) {
    const sig = checker.getResolvedSignature(e);
    if (sig && sig.getParameters().length === 0 && isCurrency(checker.getReturnTypeOfSignature(sig))) return true; // least()
    if (ts.isPropertyAccessExpression(e.expression) && isCurrencyCollection(checker.getTypeAtLocation(e.expression.expression)) &&
        isLiteralIndex(e.arguments[0]) && isLib(declOf(sig)?.getSourceFile() ?? e.getSourceFile())) return true; // xs.at(0)
  }
  if (ts.isElementAccessExpression(e) && isCurrencyCollection(checker.getTypeAtLocation(e.expression)) && isLiteralIndex(e.argumentExpression)) return true;
  if (ts.isIdentifier(e) && hops > 0) {
    const d = checker.getSymbolAtLocation(e)?.valueDeclaration;
    if (d && ts.isVariableDeclaration(d) && d.initializer && ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const) return particular(d.initializer, hops - 1);
  }
  return false;
}
const EQUALITY = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken]);
function branchFindings(file, here) {
  const sf = program.getSourceFile(file);
  const found = [];
  const add = (n) => found.push({ file: here, line: lineOf(sf, n), how: "currency-branch" });
  const visit = (n) => {
    if (ts.isBinaryExpression(n) && EQUALITY.has(n.operatorToken.kind)) {
      const l = checker.getTypeAtLocation(n.left);
      const r = checker.getTypeAtLocation(n.right);
      if ((isCurrency(l) && particular(n.right, 1)) || (isCurrency(r) && particular(n.left, 1))) add(n);
    }
    if (ts.isSwitchStatement(n) && isCurrency(checker.getTypeAtLocation(n.expression))) {
      for (const c of n.caseBlock.clauses) if (ts.isCaseClause(c) && particular(c.expression, 1)) add(c);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

const hows = (xs) => xs.map((x) => x.how).sort();
const soleM = mirrored(SOLE_DIR);
const branchM = mirrored(BRANCH_DIR);
process.stdout.write(JSON.stringify({
  soleSite: {
    src: SRC.flatMap((f) => soleSiteFindings(f, rel(f))),
    fixtures: Object.fromEntries(SOLE.map((f) => [soleM(f), hows(soleSiteFindings(f, soleM(f)))])),
  },
  branch: {
    src: SRC.flatMap((f) => branchFindings(f, rel(f))),
    fixtures: Object.fromEntries(BRANCH.map((f) => [branchM(f), hows(branchFindings(f, branchM(f)))])),
  },
}));
