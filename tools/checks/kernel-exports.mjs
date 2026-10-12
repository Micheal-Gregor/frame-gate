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

const isProjectionType = (t) =>
  constituents(t).some((c) => carries(c, PROJECTION_BRAND) || MEMBER_NAMES.has(c));
const isHeightType = (t) => constituents(t).every((c) => carries(c, HEIGHT_BRAND));

/** Declared in a file this program was asked about (or the kernel), not in a lib. */
const isUserDeclared = (sym) =>
  (sym.declarations ?? []).some((d) => !program.isSourceFileDefaultLibrary(d.getSourceFile()) &&
    !d.getSourceFile().fileName.includes("/node_modules/"));

/**
 * Every callable reachable from an export: the export itself, and - two levels
 * down, through members declared in user code - its properties, a class's statics
 * and its instance methods. Library members (Array.prototype.every carries a
 * `this is` predicate) are not followed: they are not this module's answers.
 */
function callables(name, sym, site, depth, out, seen) {
  if (seen.has(sym)) return;
  seen.add(sym);
  const types = [checker.getTypeOfSymbolAtLocation(sym, site)];
  if (sym.flags & ts.SymbolFlags.Class) types.push(checker.getDeclaredTypeOfSymbol(sym));
  for (const t of types) {
    for (const sig of t.getCallSignatures()) out.push({ name, sig });
    if (depth === 0) continue;
    for (const p of checker.getPropertiesOfType(t)) {
      if (!isUserDeclared(p)) continue;
      callables(`${name}.${p.name}`, p, p.valueDeclaration ?? site, depth - 1, out, seen);
    }
  }
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
    callables(exported.name, target, target.valueDeclaration ?? sf, 2, found, new Set());
    for (const { name, sig } of found) {
      const predicate = checker.getTypePredicateOfSignature(sig);
      if (predicate?.type && isProjectionType(predicate.type)) result.membership.push(name);
      const params = sig.getParameters();
      if (
        params.length > 1 &&
        isHeightType(checker.getReturnTypeOfSignature(sig)) &&
        params.every((p) => isHeightType(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? sf)))
      ) {
        result.heightArithmetic.push(name);
      }
    }
  }
  result.membership = [...new Set(result.membership)].sort();
  result.heightArithmetic = [...new Set(result.heightArithmetic)].sort();
  out[f] = result;
}
process.stdout.write(JSON.stringify(out));
