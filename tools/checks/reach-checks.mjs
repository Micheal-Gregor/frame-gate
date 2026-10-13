/**
 * MOD-04's two "Do not" rules, decided by the type checker (BC-04-7; CLAUDE.md; F2 OBJ-24/29;
 * F1 S-13).
 *
 * SCOPE (R-15) - what this checker decides, and what it registers. K7 scores it against this
 * statement; a limit is pinned by a `limit-` fixture it must NOT flag.
 *   soleSite  "Do not write a second reachability check." DECIDES, in src/ outside
 *             src/reachability/: a commitment READ - a call whose return type carries the
 *             Commitment brand and which takes a RecordHeight - made inside an ITERATION: a
 *             loop statement, or a callback handed to a library Array / ReadonlyArray /
 *             ArrayConstructor (`Array.from`) / Set / ReadonlySet / Map / ReadonlyMap method
 *             (resolved, not named; R-38). And through HELPERS (R-38): a function returning a
 *             boolean or a commitment that contains a read - or a call to such a helper, to a
 *             fixed point - is a reader, and a reader called inside an iteration, or handed to
 *             an iteration method by reference, is a second check. One read outside an
 *             iteration (MOD-05's `from` check) is not a fold over the order. Fixtures under
 *             tests/fixtures/reach-sole-site/src/<root>/ are judged at the path they mirror.
 *             LIMITS: a fold written as recursion over the predecessor list
 *             (limit-recursive-fold.ts); a read-wrapping helper whose result is neither a
 *             boolean nor a commitment (limit-helper-verdict.ts).
 *   branch    "No per-currency branch" (S-13: no branch on currency identity). DECIDES, in
 *             src/: an equality comparison (`===`, `!==`, `==`, `!=`) or a `case` of a
 *             `switch` on a Currency, whose other side is a PARTICULAR member of the order: a
 *             string literal (through `as`, `satisfies`, parentheses or `!`), a zero-parameter
 *             call returning a Currency (the least), a member picked by POSITION from the
 *             LOADED ORDER - an element access or `.at(...)` with a literal index, or a binding
 *             element of an array (or numeric-keyed object) destructuring, of a zero-parameter
 *             call returning the Currency collection or of a `const` one hop from one (R-38,
 *             DR-30) - or a `const` initialised by any of those (one hop). Currencies taken
 *             from DATA (a parameter, a payload field) are compared as data: never particular.
 *             Fixtures under tests/fixtures/reach-branch/src/<root>/.
 *             LIMITS: a particular member reached through a collection's membership test,
 *             e.g. `new Set([order.least()]).has(c)` (limit-set-membership.ts); a class FIELD
 *             holding a particular member (limit-class-field-least.ts; R-38); more than one
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
/** The library interfaces whose callback-taking methods iterate (R-38: Array.from, Set, Map). */
const ITERATING_OWNERS = /^(Readonly)?(Array|Set|Map)$|^ArrayConstructor$/;
/** A callback handed to a library iterating method - resolved, not named. */
function isArrayCallback(fn) {
  const call = fn.parent;
  if (!call || !ts.isCallExpression(call) || !call.arguments.includes(fn)) return false;
  const d = declOf(checker.getResolvedSignature(call));
  const owner = d?.parent;
  return !!d && isLib(d.getSourceFile()) && !!owner && ts.isInterfaceDeclaration(owner) && ITERATING_OWNERS.test(owner.name.text);
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
const isCommitmentRead = (n) => {
  const sig = checker.getResolvedSignature(n);
  return !!sig && sig.getParameters().some((q) => carries(checker.getTypeOfSymbol(q), HEIGHT)) &&
    carries(checker.getReturnTypeOfSignature(sig), COMMITMENT);
};
/** The function-like a call sits in directly (its innermost), or undefined at module level. */
const innermostFunction = (n) => {
  for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p) && p.body) return p;
  return undefined;
};
/** A helper's result is a step of a fold when it is a boolean or carries the Commitment brand. */
const foldStepResult = (fn) => {
  const sig = checker.getSignatureFromDeclaration(fn);
  const r = sig && checker.getReturnTypeOfSignature(sig);
  return !!r && (parts(r).every((c) => (c.flags & ts.TypeFlags.BooleanLike) !== 0) || carries(r, COMMITMENT));
};
/** READERS (R-38): helpers that read a commitment - directly or through another reader - to a fixed point. */
const READERS = (() => {
  const readers = new Set();
  const calls = [];
  for (const f of [...SRC, ...SOLE]) {
    const visit = (n) => {
      if (ts.isCallExpression(n)) calls.push(n);
      ts.forEachChild(n, visit);
    };
    visit(program.getSourceFile(f));
  }
  for (let grew = true; grew; ) {
    grew = false;
    for (const n of calls) {
      const target = declOf(checker.getResolvedSignature(n));
      if (!(isCommitmentRead(n) || (target && readers.has(target)))) continue;
      const fn = innermostFunction(n);
      if (fn && !readers.has(fn) && foldStepResult(fn)) {
        readers.add(fn);
        grew = true;
      }
    }
  }
  return readers;
})();
/** The function an identifier names, if it names one: a declaration, or a const holding a function. */
function functionNamed(id) {
  const d = checker.getSymbolAtLocation(id)?.valueDeclaration;
  if (!d) return undefined;
  if (ts.isFunctionDeclaration(d)) return d;
  if (ts.isVariableDeclaration(d) && d.initializer && ts.isFunctionLike(d.initializer)) return d.initializer;
  return undefined;
}
function soleSiteFindings(file, here) {
  if (here === REACH || here.startsWith(REACH + "/")) return [];
  const sf = program.getSourceFile(file);
  const found = [];
  const add = (n) => found.push({ file: here, line: lineOf(sf, n), how: "second-reachability-check" });
  const visit = (n) => {
    if (ts.isCallExpression(n)) {
      const target = declOf(checker.getResolvedSignature(n));
      if ((isCommitmentRead(n) || (target && READERS.has(target))) && insideIteration(n)) add(n);
      // a reader handed to an iteration method by reference
      const d = target;
      const owner = d?.parent;
      const iterating = !!d && isLib(d.getSourceFile()) && !!owner && ts.isInterfaceDeclaration(owner) && ITERATING_OWNERS.test(owner.name.text);
      if (iterating && n.arguments.some((a) => ts.isIdentifier(a) && READERS.has(functionNamed(a)))) add(n);
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
/** THE LOADED ORDER as a collection: a zero-parameter call returning the Currency collection, or a const one hop from one. */
function isOrderCollection(expr, hops) {
  const e = strip(expr);
  if (!e) return false;
  if (ts.isCallExpression(e)) {
    const sig = checker.getResolvedSignature(e);
    return !!sig && sig.getParameters().length === 0 && isCurrencyCollection(checker.getReturnTypeOfSignature(sig));
  }
  if (ts.isIdentifier(e) && hops > 0) {
    const d = checker.getSymbolAtLocation(e)?.valueDeclaration;
    if (d && ts.isVariableDeclaration(d) && d.initializer && ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const) return isOrderCollection(d.initializer, hops - 1);
  }
  return false;
}
/** A binding element picked by POSITION out of the loaded order (R-38, DR-30). */
function pickedFromOrder(d) {
  const pattern = d.parent;
  const decl = pattern?.parent;
  if (!decl || !ts.isVariableDeclaration(decl) || !decl.initializer || !(ts.getCombinedNodeFlags(decl) & ts.NodeFlags.Const)) return false;
  if (ts.isArrayBindingPattern(pattern)) return isOrderCollection(decl.initializer, 1);
  if (ts.isObjectBindingPattern(pattern)) return !!d.propertyName && ts.isNumericLiteral(d.propertyName) && isOrderCollection(decl.initializer, 1);
  return false;
}
/** A PARTICULAR member of the order, as opposed to a currency that is data. */
function particular(expr, hops) {
  const e = strip(expr);
  if (!e) return false;
  if (ts.isStringLiteralLike(e)) return true;
  if (ts.isCallExpression(e)) {
    const sig = checker.getResolvedSignature(e);
    if (sig && sig.getParameters().length === 0 && isCurrency(checker.getReturnTypeOfSignature(sig))) return true; // least()
    if (ts.isPropertyAccessExpression(e.expression) && isOrderCollection(e.expression.expression, 1) &&
        isLiteralIndex(e.arguments[0]) && isLib(declOf(sig)?.getSourceFile() ?? e.getSourceFile())) return true; // order.currencies().at(0)
  }
  if (ts.isElementAccessExpression(e) && isOrderCollection(e.expression, 1) && isLiteralIndex(e.argumentExpression)) return true;
  if (ts.isIdentifier(e) && hops > 0) {
    const d = checker.getSymbolAtLocation(e)?.valueDeclaration;
    if (d && ts.isBindingElement(d)) return pickedFromOrder(d);
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
