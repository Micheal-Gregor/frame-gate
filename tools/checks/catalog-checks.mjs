/**
 * MOD-03's parse-level rules, decided by the type checker in its own process.
 *
 *   fixtures     Compile each tests/fixtures/catalog/*.ts and report its diagnostic
 *                CODES (BC-03-2 REF-01, BC-03-3 HOOK-07): a base case pins the one
 *                diagnostic its fixture exists to produce, never "some error" (DR-09).
 *   assertions   Every `x as T` / `<T>x` in src/ whose T carries a catalog brand
 *                (Declaration, IndependenceAct), outside the ledger that owns T. The
 *                brand has no runtime value, so an assertion is the ONLY way to mint
 *                one elsewhere - the registered escape from REF-01 (IR-30), which this
 *                makes visible rather than silent. Decided by the brand's symbol, so
 *                no alias of the type hides it.
 *   surface      Every public method of every class exported by src/catalog/ whose
 *                return type can carry a catalog brand: it must take a RecordHeight
 *                (an as-of read) or an author typed exactly "HUMAN" (the HOOK-07
 *                append). Anything else is a "current declaration" read (BC-03-4).
 *
 * Out of process and plain JavaScript for the reasons fixture-compiles.mjs gives
 * (heap inside a vitest worker; no loader, no shim, no platform - IR-21).
 *
 * Usage:  node tools/checks/catalog-checks.mjs
 * Output: {fixtures: {file: {codes, messages}}, assertions: [...], surface: [...]}
 */
import ts from "typescript";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rel = (f) => relative(repo, f).split(sep).join("/");

function tsFiles(dir) {
  const out = [];
  const walk = (d) => {
    let entries;
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) out.push(resolve(full));
    }
  };
  walk(dir);
  return out.sort();
}

const fixtureDir = resolve(repo, "tests/fixtures/catalog");
const fixtures = tsFiles(fixtureDir);
const sources = tsFiles(resolve(repo, "src"));

const program = ts.createProgram([...sources, ...fixtures], {
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

/** The brand property's escaped name for a type exported from a catalog file. */
function brandOf(file, name) {
  const sf = program.getSourceFile(resolve(repo, file));
  const mod = sf && checker.getSymbolAtLocation(sf);
  const sym = mod && checker.getExportsOfModule(mod).find((s) => s.name === name);
  if (!sym) throw new Error(`${file} does not export ${name}; the check has no anchor`);
  const t = checker.getDeclaredTypeOfSymbol(sym);
  const brand = checker
    .getPropertiesOfType(t)
    .find((p) => p.declarations?.some((d) => d.name && ts.isComputedPropertyName(d.name)));
  if (!brand) throw new Error(`${name} carries no computed-key brand; REF-01 has no anchor`);
  return { owner: file, name, key: brand.escapedName };
}

const BRANDS = [
  brandOf("src/catalog/declaration-ledger.ts", "Declaration"),
  brandOf("src/catalog/independence-ledger.ts", "IndependenceAct"),
];
const HEIGHT = (() => {
  const sf = program.getSourceFile(resolve(repo, "src/kernel/index.ts"));
  const mod = checker.getSymbolAtLocation(sf);
  const sym = checker.getExportsOfModule(mod).find((s) => s.name === "RecordHeight");
  const t = checker.getDeclaredTypeOfSymbol(sym);
  return checker
    .getPropertiesOfType(t)
    .find((p) => p.declarations?.some((d) => d.name && ts.isComputedPropertyName(d.name)))
    .escapedName;
})();

const parts = (t) => (t.isUnion() ? t.types : [t]);
const has = (t, key) => checker.getPropertiesOfType(t).some((p) => p.escapedName === key);
const brandsIn = (t) => BRANDS.filter((b) => parts(t).some((c) => has(c, b.key)));
const isHeight = (t) => parts(t).every((c) => has(c, HEIGHT));
const isExactlyHuman = (t) => t.isStringLiteral() && t.value === "HUMAN";

// ---- fixtures ---------------------------------------------------------------
const fixtureOut = {};
for (const f of fixtures) {
  const sf = program.getSourceFile(f);
  const d = [...program.getSemanticDiagnostics(sf), ...program.getSyntacticDiagnostics(sf)];
  fixtureOut[rel(f)] = {
    codes: d.map((x) => x.code),
    messages: d.map((x) => ts.flattenDiagnosticMessageText(x.messageText, " ")),
  };
}

// ---- assertions -------------------------------------------------------------
const assertions = [];
for (const f of sources) {
  const sf = program.getSourceFile(f);
  const visit = (n) => {
    if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) {
      for (const b of brandsIn(checker.getTypeFromTypeNode(n.type))) {
        if (rel(f) !== b.owner) {
          const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
          assertions.push({ file: rel(f), line, type: b.name });
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

// ---- surface ----------------------------------------------------------------
const surface = [];
const catalogIndex = program.getSourceFile(resolve(repo, "src/catalog/index.ts"));
const catalogMod = catalogIndex && checker.getSymbolAtLocation(catalogIndex);
for (const exported of catalogMod ? checker.getExportsOfModule(catalogMod) : []) {
  const sym = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
  if (!(sym.flags & ts.SymbolFlags.Class)) continue;
  const instance = checker.getDeclaredTypeOfSymbol(sym);
  for (const p of checker.getPropertiesOfType(instance)) {
    const decl = p.valueDeclaration;
    if (!decl || p.name.startsWith("#")) continue;
    for (const sig of checker.getTypeOfSymbol(p).getCallSignatures()) {
      const carried = brandsIn(checker.getReturnTypeOfSignature(sig));
      if (carried.length === 0) continue;
      const params = sig.getParameters().map((q) => checker.getTypeOfSymbol(q));
      const asOf = params.some(isHeight);
      const humanAppend = params.some(isExactlyHuman);
      surface.push({
        operation: `${exported.name}.${p.name}`,
        returns: carried.map((b) => b.name),
        asOf,
        humanAppend,
        ok: asOf || humanAppend,
      });
    }
  }
}

process.stdout.write(JSON.stringify({ fixtures: fixtureOut, assertions, surface }));
