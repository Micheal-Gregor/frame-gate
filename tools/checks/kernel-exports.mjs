/**
 * What a module's EXPORTS can answer, decided by the type checker.
 *
 * Two questions, both about MOD-01's self-reliance (BC-01-2, BC-01-5):
 *
 *   membership        Does any exported callable carry a type predicate (`x is T`
 *                     or `asserts x is T`) whose T is a Projection - the branded
 *                     family, or one of its ten member names? Such a function lets
 *                     a caller ask "is this a Projection?" and get an answer from
 *                     SHAPE, which readmits OBJ-34 and defeats DG-F1.
 *   heightArithmetic  Does any exported callable take two or more RecordHeights and
 *                     return a RecordHeight? That is arithmetic on heights, which
 *                     OBJ-10 exposes none of.
 *
 * Why the checker and not the syntax tree (K7 round 4, CC-6 / DR-06). The previous
 * detector looked at exported `function` declarations only and matched the asserted
 * type as TEXT. An arrow-bound const, a local function re-exported through
 * `export { }`, a predicate on a type alias, a default export, or a class or object
 * member each re-admitted shape-based membership with the test green - the RD-12
 * failure (one declaration form) and the RD-13 failure (text, not resolution) at
 * the build's most fragile point. Here every export the module's symbol table holds
 * is enumerated, aliases are followed to the declaration they name, and a type is
 * recognised by the IDENTITY of the brand property it carries, so no spelling of
 * the type can hide it.
 *
 * Out of process and plain JavaScript for the reasons fixture-compiles.mjs gives
 * (heap inside a vitest worker; no loader, so no shim, so no platform - IR-21).
 *
 * Usage:  node tools/checks/kernel-exports.mjs <file.ts> [<file.ts> ...]
 * Output: one JSON object, {<file as given>: {membership: [name], heightArithmetic: [name]}}.
 */
import ts from "typescript";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const kernelPath = resolve(repo, "src/kernel/index.ts");
const given = process.argv.slice(2);
if (given.length === 0) {
  process.stderr.write("usage: kernel-exports.mjs <file.ts> [...]\n");
  process.exit(2);
}

const program = ts.createProgram([kernelPath, ...given.map((f) => resolve(f))], {
  strict: true,
  exactOptionalPropertyTypes: true,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2022,
  lib: ["lib.es2022.d.ts"],
  types: [],
  noEmit: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();

/** The kernel's own exports, by the names S3 gives them (OBJ-02, OBJ-10). */
function kernelExport(name) {
  const sf = program.getSourceFile(kernelPath);
  const mod = sf && checker.getSymbolAtLocation(sf);
  const sym = mod && checker.getExportsOfModule(mod).find((s) => s.name === name);
  if (!sym) throw new Error(`kernel does not export ${name}; the detector has no anchor`);
  return sym;
}

/** The brand: the one property of a declared type whose key is a computed unique symbol. */
function brandOf(name) {
  const t = checker.getDeclaredTypeOfSymbol(kernelExport(name));
  const brand = checker
    .getPropertiesOfType(t)
    .find((p) => p.declarations?.some((d) => d.name && ts.isComputedPropertyName(d.name)));
  if (!brand) throw new Error(`${name} carries no computed-key brand; the detector has no anchor`);
  return brand.escapedName; // "__@PROJECTION@<id>": unique to that symbol, not to a spelling
}

const PROJECTION_BRAND = brandOf("Projection");
const HEIGHT_BRAND = brandOf("RecordHeight");
const MEMBER_NAMES = (() => {
  const t = checker.getDeclaredTypeOfSymbol(kernelExport("ProjectionMember"));
  return new Set(t.isUnion() ? t.types : [t]); // literal types are interned per program
})();

const constituents = (t) => (t.isUnion() ? t.types : [t]);
// Compared as ESCAPED names on purpose. getPropertyOfType takes an unescaped name
// and re-escapes any that start with "__", so handing it a brand key silently
// matches nothing - every type then "lacks" the brand and the detector passes
// everything. Found by this file's own positive fixtures on first run.
const carries = (t, brand) => checker.getPropertiesOfType(t).some((p) => p.escapedName === brand);

const isHeightType = (t) => constituents(t).every((c) => carries(c, HEIGHT_BRAND));

/**
 * The Projection SHAPE (K7 round 5, DR-11): a member that is callable with a
 * RecordHeight - S3 section 11's "takes a height", the property the family must
 * never be re-derived from. A predicate asserting it answers membership from
 * shape just as surely as one asserting the brand.
 */
const takesAHeight = (t) =>
  checker.getPropertiesOfType(t).some((p) => {
    const pt = checker.getTypeOfSymbol(p);
    return pt.getCallSignatures().some((sig) =>
      sig.getParameters().some((q) => isHeightType(checker.getTypeOfSymbol(q))),
    );
  });

const isProjectionType = (t) =>
  constituents(t).some(
    (c) => carries(c, PROJECTION_BRAND) || MEMBER_NAMES.has(c) || takesAHeight(c),
  );

/** Declared in a file this program was asked about (or the kernel), not in a lib. */
const isUserDeclared = (sym) =>
  (sym.declarations ?? []).some((d) => !program.isSourceFileDefaultLibrary(d.getSourceFile()) &&
    !d.getSourceFile().fileName.includes("/node_modules/"));

/**
 * Every callable reachable from an export, at ANY depth (K7 round 5, DR-11: a
 * fixed depth of two let a predicate three members down, or one handed back by
 * an exported factory, pass). Followed: call signatures, what each RETURNS, what
 * a constructor builds, and properties declared in user code. Library members
 * are not followed - Array.prototype.every carries a `this is` predicate and is
 * not this module's answer. Termination is by the set of types already seen.
 */
function collect(name, type, out, seen) {
  if (seen.has(type)) return;
  seen.add(type);
  for (const sig of type.getCallSignatures()) {
    out.push({ name, sig });
    collect(`${name}()`, checker.getReturnTypeOfSignature(sig), out, seen);
  }
  for (const sig of type.getConstructSignatures()) {
    collect(`new ${name}`, checker.getReturnTypeOfSignature(sig), out, seen);
  }
  for (const p of checker.getPropertiesOfType(type)) {
    if (!isUserDeclared(p)) continue;
    collect(`${name}.${p.name}`, checker.getTypeOfSymbol(p), out, seen);
  }
}

/** -1 | 0 | 1, or any subset: the answer of an ORDER, not a quantity. */
const isOrdering = (t) =>
  constituents(t).every((c) => c.isNumberLiteral() && [-1, 0, 1].includes(c.value));
const isBooleanish = (t) =>
  constituents(t).every((c) => (c.flags & ts.TypeFlags.BooleanLike) !== 0);
const isNumberish = (t) =>
  constituents(t).every((c) => (c.flags & ts.TypeFlags.NumberLike) !== 0);

/**
 * True when every value this declaration can return is one of its OWN height
 * parameters, handed back unchanged - a selection like `latest(a, b)`, not a
 * height manufactured from numbers (R-09). Decided by symbol: a returned
 * identifier must resolve to one of the declaration's parameters, directly or
 * through a conditional or a `??` / `||` / `&&` whose operands all do. A body
 * this cannot read - an overload signature, an interface member, a `declare` -
 * is not a selection; the bias is toward flagging, and it is registered (IR-28).
 */
function returnsOnlyAnInput(decl) {
  if (!decl || !("parameters" in decl) || !decl.body) return false;
  const params = new Set(
    decl.parameters
      .map((p) => checker.getSymbolAtLocation(p.name))
      .filter((sym) => sym && isHeightType(checker.getTypeOfSymbol(sym))),
  );
  if (params.size === 0) return false;
  const isInput = (e) => {
    while (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e)) e = e.expression;
    if (ts.isIdentifier(e)) return params.has(checker.getSymbolAtLocation(e));
    if (ts.isConditionalExpression(e)) return isInput(e.whenTrue) && isInput(e.whenFalse);
    if (
      ts.isBinaryExpression(e) &&
      [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.AmpersandAmpersandToken].includes(e.operatorToken.kind)
    ) {
      return isInput(e.left) && isInput(e.right);
    }
    return false;
  };
  if (!ts.isBlock(decl.body)) return isInput(decl.body); // arrow with an expression body
  const returns = [];
  const visit = (n) => {
    if (ts.isFunctionLike(n) && n !== decl) return; // a nested function's returns are its own
    if (ts.isReturnStatement(n)) returns.push(n.expression);
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(decl.body, visit);
  return returns.length > 0 && returns.every((e) => e !== undefined && isInput(e));
}

/**
 * What a signature does with heights, as plain facts the rule below can read.
 * A rest parameter of RecordHeight[] counts as two heights: it can carry any
 * number of them, so it is a fold, not a single input.
 */
function heightShape(sig) {
  let heightParams = 0;
  let otherParams = 0;
  for (const p of sig.getParameters()) {
    const decl = p.valueDeclaration;
    const t = checker.getTypeOfSymbol(p);
    const isRest = decl !== undefined && ts.isParameter(decl) && decl.dotDotDotToken !== undefined;
    const element = isRest ? checker.getIndexTypeOfType(t, ts.IndexKind.Number) : undefined;
    if (isRest && element && isHeightType(element)) heightParams += 2;
    else if (isHeightType(t)) heightParams += 1;
    else otherParams += 1;
  }
  const r = checker.getReturnTypeOfSignature(sig);
  const returns = isHeightType(r) ? "height"
    : isOrdering(r) ? "ordering"
    : isBooleanish(r) ? "boolean"
    : isNumberish(r) ? "number"
    : "other";
  const decl = sig.getDeclaration?.() ?? sig.declaration;
  return { heightParams, otherParams, returns, selection: returnsOnlyAnInput(decl) };
}

/**
 * BC-01-5, restated so a detector can decide it (K7 round 5, DR-14).
 *
 * "No arithmetic is exposed" was enforced as "two heights in, a height out", and
 * K7 showed four forms that walk past it: a delta (two heights -> number), an
 * offset (height, number -> height), a successor (height -> height) and a fold
 * (...heights -> height). The conforming `order` (two heights -> -1|0|1) and the
 * kernel's own `compare`, `succeeds` and `height(n: number)` must stay legal -
 * and `order` and a delta have the SAME parameter shape, so the line has to be
 * drawn on what comes back.
 *
 * The owner's rule (R-09, 2026-10-12): "latest is not arithmetic, flag asNumber."
 *
 * @param {{heightParams: number, otherParams: number,
 *          returns: "height" | "ordering" | "boolean" | "number" | "other",
 *          selection: boolean}} shape
 * @returns {boolean} true when this callable is height arithmetic
 */
function isHeightArithmetic(shape) {
  // Takes no height: the constructor height(n: number), or a nullary helper.
  if (shape.heightParams === 0) return false;
  // A height's value leaves the type as a plain number: a delta, or a bare unwrap
  // that lets the arithmetic happen outside the kernel.
  if (shape.returns === "number") return true;
  // A height comes back: legal only when it is one of the callable's own inputs.
  if (shape.returns === "height") return !shape.selection;
  // An ordering (-1 | 0 | 1), a boolean, or anything else is not arithmetic.
  return false;
}

const out = {};
for (const f of given) {
  const sf = program.getSourceFile(resolve(f));
  const mod = sf && checker.getSymbolAtLocation(sf);
  const result = { membership: [], heightArithmetic: [] };
  if (!sf || !mod) {
    out[f] = { ...result, error: "not a module the program could load" };
    continue;
  }
  for (const exported of checker.getExportsOfModule(mod)) {
    const target =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    if (!(target.flags & ts.SymbolFlags.Value)) continue; // a type answers nothing at runtime
    const found = [];
    const seen = new Set();
    collect(exported.name, checker.getTypeOfSymbolAtLocation(target, target.valueDeclaration ?? sf), found, seen);
    if (target.flags & ts.SymbolFlags.Class) {
      collect(`${exported.name}#instance`, checker.getDeclaredTypeOfSymbol(target), found, seen);
    }
    for (const { name, sig } of found) {
      const predicate = checker.getTypePredicateOfSignature(sig);
      if (predicate?.type && isProjectionType(predicate.type)) result.membership.push(name);
      if (isHeightArithmetic(heightShape(sig))) result.heightArithmetic.push(name);
    }
  }
  result.membership = [...new Set(result.membership)].sort();
  result.heightArithmetic = [...new Set(result.heightArithmetic)].sort();
  out[f] = result;
}
process.stdout.write(JSON.stringify(out));
