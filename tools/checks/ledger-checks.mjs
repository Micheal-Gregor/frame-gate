/**
 *
 * SCOPE (R-15) - what this checker decides, and what it registers. K7 scores it
 * against this statement; a limit is pinned by a `limit-` fixture it must NOT flag.
 *   mint     DECIDES, outside the owning ledger, a branded ledger value made by: an
 *            assertion (by result type); `any` reaching a branded position; a call to a
 *            user generic returning a bare type parameter; `x as T` on a type
 *            parameter; a user type guard; an overload or ambient signature (and any
 *            `.d.ts` under src/); a ts-directive.
 *            LIMITS: array covariance (limit-array-covariance.ts); property covariance
 *            (limit-property-covariance.ts). BOUNDARY: code outside src/ is not read.
 *   forge    DECIDES, outside the ledger root that owns the kind, an object whose
 *            `kind` - keyed by any spelling, via const, shorthand, spread, class field
 *            or getter - has a ledger-kind literal type; and an append whose argument's
 *            type carries one.
 *            OWNERSHIP is pinned at each root by tests/fixtures/ledger-owners/src/<root>/,
 *            judged at the path it mirrors: each root may build its own kinds, not another's.
 *            LIMITS: a kind typed plain `string` (limit-dynamic-kind.ts); an entry typed
 *            `any` (limit-any-entry.ts). BOUNDARY: runtime wiring is PC-02's.
 *   surface  DECIDES, per ledger root: an exported act-returning operation that takes
 *            no height and does not append (any author: draw contexts and labels are
 *            not HUMAN acts, IR-47, IR-48); a height handed to a
 *            read (directly or through any wrapper in the root) that is not the
 *            caller's parameter; a class field that is not readonly or whose TYPE is
 *            writable (record port excepted).
 *            LIMITS: module-level mutable state read by a class (limit-module-state/);
 *            the caller's own choice of height is the caller's (as-of semantics).
 *   reach    DECIDES, in src/ outside src/advisory/ (MOD-13), a call to or a reference
 *            of UnitRegistry.features - by property access, element access with a
 *            literal key, or destructuring - resolved to its declaration (R-22, F1,
 *            SEAM-27). Fixtures under tests/fixtures/features-reach/src/<root>/ are
 *            judged at the path they mirror.
 *            LIMITS: a member reached through a cast to a structural record of
 *            functions (limit-cast-member.ts).
 *   ledgers  DECIDES: every `AppendedFact<_, P>` alias in src/ has its payload kind in
 *            LEDGERS, owned by the root it is declared in, and its brand in BRANDS -
 *            so a new ledger kind cannot skate past every rule above unlisted (RD-12).
 *            Fixtures under tests/fixtures/ledger-discovery/src/<root>/ are judged at
 *            the path they mirror, so each verdict is pinned non-empty too.
 *   sc3      DECIDES: a numeric 2 in any source file of any extension; a comparison of
 *            a Currency collection's length or size to a numeric literal.
 *            LIMITS: cardinality asked by index (limit-cardinality-by-index.ts).
 * The parse-level rules of every append-only LEDGER (MOD-03 catalog, MOD-05 facts, ...),
 * decided by the type checker in its own process. Renamed from catalog-checks.mjs when
 * MOD-05 made the catalog's rules everyone's (BC-05-6): a forged commitment is the same
 * defect as a forged declaration (DR-18).
 *
 *   fixtures  Compile tests/fixtures/catalog/*.ts and tests/fixtures/facts/*.ts and
 *             report each one's diagnostic CODES (BC-03-2 REF-01, BC-03-3 HOOK-07,
 *             BC-05-4 OBJ-31). A base case pins the one diagnostic its fixture exists
 *             to produce (DR-09).
 *   mint      REF-01's reach (K7 round 6, DR-19): every way a value of a branded
 *             ledger type (Declaration, IndependenceAct, Commitment) can come into
 *             existence outside the ledger that owns it -
 *               assertion        `x as T` / `<T>x` whose RESULT type carries the brand
 *               any-flow         an `any`-typed expression in a position whose
 *                                contextual type carries the brand
 *               generic-launder  a call to a user-written generic whose declared
 *                                return is a bare type parameter, instantiated to a
 *                                branded type (`cast<Declaration>(x)`)
 *               type-parameter-cast  `x as T` on a bare type parameter: the root of
 *                                every laundering generic, wrapped or not
 *               type-guard       a user-written predicate asserting a branded type
 *               ts-directive     `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`,
 *                                which silences any parse-level refusal at all
 *             IR-30 once said an assertion was "the ONLY way"; it was not (IR-36).
 *   forge     R-12's static half of INV-PROV at the read seam (DR-18): outside the
 *             ledger root that owns a KIND, no object whose type carries it is built
 *             (a `kind` property, directly or through a const or a spread), and no
 *             RecordPort.append takes one (a replay). The kinds and their owners are
 *             read from each ledger's payload TYPES (LEDGERS), never listed here.
 *   surface   BC-03-4, "no current declaration" (DR-20), over each ledger root
 *             (`src` keeps the catalog's own report; `ledgers` holds every root):
 *               returns      every exported operation - class method or free
 *                            function - returning a branded act takes a
 *                            RecordHeight or appends (IR-48: was "the HUMAN-only
 *                            append" while every ledger append was HUMAN);
 *               fabricated   every RecordHeight handed to a READ (RecordPort.readAsOf,
 *                            declarationAt, independenceAt, effectiveCommitment, the
 *                            injected readers, drawsAsOf, resolutionAt) is a parameter
 *                            of the function it is called in, or of one enclosing it
 *                            through inline closures (IR-49) - otherwise of the
 *                            enclosing function - a height made up inside the
 *                            catalog is a "now";
 *               held         no class holds mutable state other than its record
 *                            port: a cache of what was declared is a current read
 *                            waiting to happen ("no derived value is held", F1).
 *   sc3       SC-3 (DR-21): no numeric 2 in any source file of any extension, and no
 *             comparison of a Currency collection's length or size to a literal.
 *
 * Out of process and plain JavaScript for the reasons fixture-compiles.mjs gives
 * (heap inside a vitest worker; no loader, no shim, no platform - IR-21).
 *
 * Usage:  node tools/checks/ledger-checks.mjs
 */
import ts from "typescript";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rel = (f) => relative(repo, f).split(sep).join("/");
const SOURCE = /\.(ts|mts|cts|tsx|js|mjs|cjs|jsx)$/;

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
const fx = (name) => resolve(repo, "tests/fixtures", name);

const SRC = walk(resolve(repo, "src"), SOURCE);
const CATALOG_DIR = resolve(repo, "src/catalog");
const FIXTURES = [...walk(fx("catalog"), /\.ts$/), ...walk(fx("facts"), /\.ts$/)];
/** Every ledger module: its root, and the payload types whose `kind` it owns. */
const LEDGERS = [
  { root: "src/catalog", payloads: [["src/catalog/declaration-ledger.ts", "DeclarationPayload"], ["src/catalog/independence-ledger.ts", "IndependencePayload"]] },
  { root: "src/facts", payloads: [
    ["src/facts/commitment-ledger.ts", "CommitmentPayload"],
    ["src/facts/draw-context-log.ts", "DrawContextPayload"],
    ["src/facts/draw-context-log.ts", "ResolutionLabelPayload"],
  ] },
];
const MINT = walk(fx("catalog-mint"), /\.ts$/);
/** Hand-written declaration files: an ambient declaration can assert any type (DR-23). */
function declarationFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  const go = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) go(full);
      else if (/\.d\.(ts|mts|cts)$/.test(name)) out.push(resolve(full));
    }
  };
  go(dir);
  return out.sort();
}
const SRC_DTS = declarationFiles(resolve(repo, "src"));
const MINT_DTS = declarationFiles(fx("catalog-mint"));
const FORGE = walk(fx("catalog-forge"), /\.ts$/);
/** Ownership fixtures, judged AS IF at the path under src/ they mirror (battery 10, C23). */
const OWNERS_DIR = fx("ledger-owners");
const OWNERS = walk(OWNERS_DIR, /\.ts$/);
const mirrored = (f) => relative(OWNERS_DIR, f).split(sep).join("/");
const SC3 = walk(fx("sc3"), SOURCE);
/** R-22 fixtures, judged AS IF at the src/ path they mirror. */
const REACH_DIR = fx("features-reach");
const REACH = walk(REACH_DIR, /\.ts$/);
const reachMirrored = (f) => relative(REACH_DIR, f).split(sep).join("/");
/** Ledger-discovery fixtures, judged AS IF at the src/ path they mirror (battery 11). */
const DISCOVERY_DIR = fx("ledger-discovery");
const DISCOVERY = walk(DISCOVERY_DIR, /\.ts$/);
const discoveryMirrored = (f) => relative(DISCOVERY_DIR, f).split(sep).join("/");
const SURFACE_CASES = existsSync(fx("catalog-surface"))
  ? readdirSync(fx("catalog-surface")).filter((d) => existsSync(join(fx("catalog-surface"), d, "index.ts"))).sort()
  : [];
const SURFACE = SURFACE_CASES.flatMap((c) => walk(join(fx("catalog-surface"), c), /\.ts$/));

const program = ts.createProgram([...SRC, ...SRC_DTS, ...FIXTURES, ...MINT, ...MINT_DTS, ...FORGE, ...OWNERS, ...REACH, ...DISCOVERY, ...SC3, ...SURFACE], {
  strict: true,
  allowJs: true,
  checkJs: false,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2022,
  lib: ["lib.es2022.d.ts"],
  types: ["node"],
  noEmit: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const isUser = (sf) => sf && !program.isSourceFileDefaultLibrary(sf) && !sf.fileName.includes("/node_modules/");

// ---- anchors, all resolved from the source that owns them -------------------
function exportOf(file, name) {
  const sf = program.getSourceFile(resolve(repo, file));
  const mod = sf && checker.getSymbolAtLocation(sf);
  const sym = mod && checker.getExportsOfModule(mod).find((s) => s.name === name);
  if (!sym) throw new Error(`${file} does not export ${name}; the check has no anchor`);
  return sym;
}
function brandKey(file, name) {
  const t = checker.getDeclaredTypeOfSymbol(exportOf(file, name));
  // The brand is the computed-key property declared in USER code. A primitive's
  // apparent type contributes library members with computed names too - String has
  // [Symbol.iterator] - and taking the first computed key made every array a
  // "Currency" collection (caught by the sc3 conforming fixture on first run).
  const b = checker
    .getPropertiesOfType(t)
    .find((p) => p.declarations?.some((d) => d.name && ts.isComputedPropertyName(d.name) && isUser(d.getSourceFile())));
  if (!b) throw new Error(`${name} carries no computed-key brand; the check has no anchor`);
  return b.escapedName;
}
const BRANDS = [
  { owner: "src/catalog/declaration-ledger.ts", name: "Declaration", key: brandKey("src/catalog/declaration-ledger.ts", "Declaration") },
  { owner: "src/catalog/independence-ledger.ts", name: "IndependenceAct", key: brandKey("src/catalog/independence-ledger.ts", "IndependenceAct") },
  { owner: "src/facts/commitment-ledger.ts", name: "Commitment", key: brandKey("src/facts/commitment-ledger.ts", "Commitment") },
  { owner: "src/facts/draw-context-log.ts", name: "DrawContext", key: brandKey("src/facts/draw-context-log.ts", "DrawContext") },
  { owner: "src/facts/draw-context-log.ts", name: "ResolutionLabel", key: brandKey("src/facts/draw-context-log.ts", "ResolutionLabel") },
];
const HEIGHT = brandKey("src/kernel/index.ts", "RecordHeight");
const CURRENCY = brandKey("src/catalog/currency-order.ts", "Currency");
/** kind -> the module root that owns it, read from each ledger's payload TYPE. */
const KIND_OWNER = new Map(
  LEDGERS.flatMap((l) => l.payloads.map(([f, n]) => {
    const t = checker.getDeclaredTypeOfSymbol(exportOf(f, n));
    const k = checker.getTypeOfSymbol(checker.getPropertyOfType(t, "kind"));
    if (!k.isStringLiteral()) throw new Error(`${n}.kind is not a string literal type`);
    return [k.value, l.root];
  })),
);
const KINDS = new Set(KIND_OWNER.keys());

const parts = (t) => (t.isUnion() ? t.types : [t]);
const has = (t, key) => checker.getPropertiesOfType(t).some((p) => p.escapedName === key);
const brandsIn = (t) => (t ? BRANDS.filter((b) => parts(t).some((c) => has(c, b.key))) : []);
const isHeight = (t) => parts(t).every((c) => has(c, HEIGHT));
const isExactlyHuman = (t) => t.isStringLiteral() && t.value === "HUMAN";
const catalogKindIn = (t) => parts(t).some((c) => c.isStringLiteral() && KINDS.has(c.value));
/** The ledger kinds a type can be: string-literal constituents that some ledger owns. */
const kindsIn = (t) => parts(t).filter((c) => c.isStringLiteral() && KINDS.has(c.value)).map((c) => c.value);
function kindsCarried(t) {
  const out = [];
  for (const c of parts(t)) {
    const kind = checker.getPropertyOfType(c, "kind");
    if (kind) out.push(...kindsIn(checker.getTypeOfSymbol(kind)));
    const payload = checker.getPropertyOfType(c, "payload");
    if (payload) out.push(...kindsCarried(checker.getTypeOfSymbol(payload)));
  }
  return out;
}
function carriesCatalogKind(t) {
  return parts(t).some((c) => {
    const kind = checker.getPropertyOfType(c, "kind");
    if (kind && catalogKindIn(checker.getTypeOfSymbol(kind))) return true;
    const payload = checker.getPropertyOfType(c, "payload");
    return payload !== undefined && carriesCatalogKind(checker.getTypeOfSymbol(payload));
  });
}
const lineOf = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
const declOf = (sig) => (sig && (sig.getDeclaration?.() ?? sig.declaration)) || undefined;
/** A method or function declared at `file` with `name`, or a member of an interface named `iface`. */
const declaredAs = (d, file, name, iface) =>
  d !== undefined &&
  rel(d.getSourceFile().fileName) === file &&
  d.name && ts.isIdentifier(d.name) && d.name.text === name &&
  (iface === undefined || (d.parent && ts.isInterfaceDeclaration(d.parent) && d.parent.name.text === iface));

// ---- fixtures ---------------------------------------------------------------
const fixtures = {};
for (const f of FIXTURES) {
  const sf = program.getSourceFile(f);
  const d = [...program.getSemanticDiagnostics(sf), ...program.getSyntacticDiagnostics(sf)];
  fixtures[rel(f)] = { codes: d.map((x) => x.code), messages: d.map((x) => ts.flattenDiagnosticMessageText(x.messageText, " ")) };
}

// ---- mint -------------------------------------------------------------------
function mintFindings(file) {
  const sf = program.getSourceFile(file);
  const here = rel(file);
  const found = [];
  const outsideOwner = (b) => b.owner !== here;
  const add = (n, how, b) => found.push({ file: here, line: lineOf(sf, n), how, type: b.name });
  if (/@ts-(ignore|expect-error|nocheck)\b/.test(sf.text)) found.push({ file: here, line: 0, how: "ts-directive", type: "*" });
  // DR-23: no hand-written declaration file under src/ at all - whatever it declares,
  // the compiler believes, and nothing checks it against an implementation.
  if (sf.isDeclarationFile) found.push({ file: here, line: 0, how: "ambient-declaration", type: "*" });
  const visit = (n) => {
    if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) {
      for (const b of brandsIn(checker.getTypeAtLocation(n)).filter(outsideOwner)) add(n, "assertion", b);
      // `x as T` on a bare type parameter is a universal cast: whatever T is
      // instantiated to at a call site - wrapped or not - is minted here. The
      // call-site rule cannot see `wrap<Declaration>(x).v`; this sees its root.
      const target = ts.isTypeReferenceNode(n.type) ? checker.getSymbolAtLocation(n.type.typeName) : undefined;
      if (target && target.flags & ts.SymbolFlags.TypeParameter) {
        found.push({ file: here, line: lineOf(sf, n), how: "type-parameter-cast", type: "*" });
      }
    }
    if (ts.isCallExpression(n)) {
      const sig = checker.getResolvedSignature(n);
      const d = declOf(sig);
      if (d && isUser(d.getSourceFile()) && d.type && ts.isTypeReferenceNode(d.type)) {
        const target = checker.getSymbolAtLocation(d.type.typeName);
        if (target && target.flags & ts.SymbolFlags.TypeParameter) {
          for (const b of brandsIn(checker.getReturnTypeOfSignature(sig)).filter(outsideOwner)) add(n, "generic-launder", b);
        }
      }
    }
    if (ts.isExpression(n) && checker.getTypeAtLocation(n).flags & ts.TypeFlags.Any) {
      for (const b of brandsIn(checker.getContextualType(n)).filter(outsideOwner)) add(n, "any-flow", b);
    }
    // DR-23: a signature WITHOUT a body declares a return its implementation need not
    // honour - an overload signature, or an ambient `declare` - so a branded return
    // there is a mint by declaration.
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && !n.body && n.type) {
      const ambient = sf.isDeclarationFile ||
        (ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Ambient) !== 0;
      for (const b of brandsIn(checker.getTypeFromTypeNode(n.type)).filter(outsideOwner)) {
        add(n, ambient ? "ambient-declaration" : "overload", b);
      }
    }
    if (ts.isVariableStatement(n) && (ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Ambient) !== 0) {
      for (const d of n.declarationList.declarations) {
        for (const b of brandsIn(checker.getTypeAtLocation(d)).filter(outsideOwner)) add(d, "ambient-declaration", b);
      }
    }
    if (ts.isFunctionLike(n) && n.type && ts.isTypePredicateNode(n.type) && n.type.type) {
      for (const b of brandsIn(checker.getTypeFromTypeNode(n.type.type)).filter(outsideOwner)) add(n, "type-guard", b);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

// ---- forge ------------------------------------------------------------------
/**
 * The property NAME a key denotes, resolved (DR-24): an identifier, a quoted or
 * template string, or a computed key whose type is a string literal. Never the text
 * of the node - `{ "kind": ... }` and `{ ["kind"]: ... }` name the same property.
 * The name compared against is the catalog payload's discriminant property.
 */
function keyName(name) {
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text;
  if (ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) return name.text;
  if (ts.isComputedPropertyName(name)) {
    const t = checker.getTypeAtLocation(name.expression);
    return t.isStringLiteral() ? t.value : undefined;
  }
  return undefined;
}
const KIND_KEY = "kind"; // DeclarationPayload / IndependencePayload's discriminant (anchor)
/** `here` is explicit: the path the file is judged AT (its own, or the one an ownership fixture mirrors). */
function forgeFindings(file, here) {
  const sf = program.getSourceFile(file);
  const found = [];
  // A kind is forged only OUTSIDE the module that owns it: the catalog may build
  // declarations, the facts module commitments, and neither the other's.
  const outsideOwner = (kinds) => kinds.some((k) => !(here === KIND_OWNER.get(k) || here.startsWith(KIND_OWNER.get(k) + "/")));
  const add = (n, how, kinds) => { if (outsideOwner(kinds)) found.push({ file: here, line: lineOf(sf, n), how }); };
  const visit = (n) => {
    if (ts.isPropertyAssignment(n) && ts.isObjectLiteralExpression(n.parent) && keyName(n.name) === KIND_KEY &&
        catalogKindIn(checker.getTypeAtLocation(n.initializer))) add(n, "catalog-kind-literal", kindsIn(checker.getTypeAtLocation(n.initializer)));
    // DR-24: a class whose instances carry a catalog kind - as a field or a getter.
    if ((ts.isPropertyDeclaration(n) || ts.isGetAccessorDeclaration(n)) && keyName(n.name) === KIND_KEY) {
      const t = ts.isPropertyDeclaration(n) && n.initializer ? checker.getTypeAtLocation(n.initializer)
        : ts.isGetAccessorDeclaration(n) ? checker.getReturnTypeOfSignature(checker.getSignatureFromDeclaration(n))
        : checker.getTypeAtLocation(n);
      if (catalogKindIn(t)) add(n, "catalog-kind-field", kindsIn(t));
    }
    if (ts.isShorthandPropertyAssignment(n) && n.name.text === KIND_KEY) {
      const s = checker.getShorthandAssignmentValueSymbol(n);
      if (s && catalogKindIn(checker.getTypeOfSymbolAtLocation(s, n))) add(n, "catalog-kind-literal", kindsIn(checker.getTypeOfSymbolAtLocation(s, n)));
    }
    if (ts.isSpreadAssignment(n) && carriesCatalogKind(checker.getTypeAtLocation(n.expression))) add(n, "catalog-kind-spread", kindsCarried(checker.getTypeAtLocation(n.expression)));
    if (ts.isCallExpression(n)) {
      const d = declOf(checker.getResolvedSignature(n));
      if (declaredAs(d, "src/ports/index.ts", "append", "RecordPort") && n.arguments[0] &&
          carriesCatalogKind(checker.getTypeAtLocation(n.arguments[0]))) add(n, "catalog-kind-append", kindsCarried(checker.getTypeAtLocation(n.arguments[0])));
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

// ---- surface ----------------------------------------------------------------
const MUTATORS = ["set", "add", "delete", "clear", "push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill", "copyWithin"];
const isRecordPort = (t) =>
  parts(t).every((c) => (c.aliasSymbol?.name === "SharedRecord" || c.aliasSymbol?.name === "FactRecord") || (c.symbol?.name === "RecordPort" &&
    c.symbol.declarations?.some((d) => rel(d.getSourceFile().fileName) === "src/ports/index.ts")));
const isBaseRead = (d) =>
  declaredAs(d, "src/ports/index.ts", "readAsOf", "RecordPort") ||
  declaredAs(d, "src/catalog/declaration-ledger.ts", "declarationAt") ||
  declaredAs(d, "src/catalog/independence-ledger.ts", "independenceAt") ||
  declaredAs(d, "src/facts/commitment-ledger.ts", "effectiveCommitment") ||
  declaredAs(d, "src/facts/commitment-ledger.ts", "isInvalidated", "InvalidationReader") ||
  declaredAs(d, "src/facts/draw-context-log.ts", "declarationAt", "DeclarationReader") ||
  declaredAs(d, "src/facts/draw-context-log.ts", "drawsAsOf") ||
  declaredAs(d, "src/facts/draw-context-log.ts", "resolutionAt");
const isAppend = (d) =>
  declaredAs(d, "src/ports/index.ts", "append", "RecordPort") ||
  declaredAs(d, "src/catalog/declaration-ledger.ts", "declare") ||
  declaredAs(d, "src/catalog/independence-ledger.ts", "declareIndependence") ||
  declaredAs(d, "src/facts/commitment-ledger.ts", "commit") ||
  declaredAs(d, "src/facts/draw-context-log.ts", "recordDraw") ||
  declaredAs(d, "src/facts/draw-context-log.ts", "label");
const enclosingFunction = (n) => {
  let fn = n.parent;
  while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
  return fn;
};
/**
 * The function whose PARAMETER `arg` is, looking outward from `fn` through inline closures
 * (IR-49): a height an arrow captures from the method around it is still the caller's.
 * A class-field arrow is a member, not a closure, so the search stops there.
 */
const isInlineClosure = (f) => (ts.isArrowFunction(f) || ts.isFunctionExpression(f)) && !ts.isPropertyDeclaration(f.parent);
const ownerOfParam = (arg, fn) => {
  const s = arg && ts.isIdentifier(arg) ? checker.getSymbolAtLocation(arg) : undefined;
  const d = s?.valueDeclaration;
  if (!d || !ts.isParameter(d)) return undefined;
  for (let f = fn; f; f = isInlineClosure(f) ? enclosingFunction(f) : undefined) {
    if (d.parent === f) return { fn: f, index: f.parameters.indexOf(d) };
  }
  return undefined;
};
/** Writable data on a TYPE (DR-25): a non-readonly property or index signature, or a mutator method. */
function isWritableType(t) {
  for (const c of parts(t)) {
    if (!(c.flags & ts.TypeFlags.Object)) continue;
    if (checker.getIndexInfosOfType(c).some((i) => !i.isReadonly)) return true;
    for (const prop of checker.getPropertiesOfType(c)) {
      if (MUTATORS.includes(prop.name) && prop.declarations?.some((d) => ts.isMethodSignature(d) || ts.isMethodDeclaration(d))) return true;
      const d = prop.declarations?.[0];
      if (d && (ts.isPropertySignature(d) || ts.isPropertyDeclaration(d)) &&
          !(ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Readonly) && !(d.name && ts.isPrivateIdentifier(d.name))) return true;
    }
  }
  return false;
}

function surfaceOf(dir, indexFile) {
  const files = walk(dir, /\.ts$/);
  const out = { root: rel(dir), returns: [], fabricated: [], held: [] };
  const sf = program.getSourceFile(indexFile);
  const mod = sf && checker.getSymbolAtLocation(sf);
  const appendsInBody = (d) => {
    let found = false;
    const v = (n) => {
      if (found) return;
      if (ts.isCallExpression(n) && isAppend(declOf(checker.getResolvedSignature(n)))) found = true;
      ts.forEachChild(n, v);
    };
    if (d && d.body) v(d.body);
    return found;
  };
  const signaturesOf = (name, t, push) => {
    for (const sig of t.getCallSignatures()) {
      const carried = brandsIn(checker.getReturnTypeOfSignature(sig));
      if (carried.length === 0) continue;
      const params = sig.getParameters().map((q) => checker.getTypeOfSymbol(q));
      // An operation is admitted by APPENDING, not by a parameter (DR-25: a "HUMAN"
      // parameter alone excused a made-up-height read wearing it). Any author (IR-48):
      // MOD-05 records draw contexts and labels that are not HUMAN acts.
      const appends = appendsInBody(declOf(sig));
      push({ operation: name, returns: carried.map((b) => b.name), ok: params.some(isHeight) || appends });
    }
  };
  for (const exported of mod ? checker.getExportsOfModule(mod) : []) {
    const sym = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    if (sym.flags & ts.SymbolFlags.Class) {
      for (const p of checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(sym))) {
        if (p.name.startsWith("#") || !p.valueDeclaration) continue;
        signaturesOf(`${exported.name}.${p.name}`, checker.getTypeOfSymbol(p), (r) => out.returns.push(r));
      }
    } else if (sym.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Variable)) {
      signaturesOf(exported.name, checker.getTypeOfSymbolAtLocation(sym, sf), (r) => out.returns.push(r));
    }
  }
  // DR-25: a READ is a base read, or any function in this root that hands one of its
  // own parameters to a READ at a height position - found to a fixed point, so a
  // private wrapper is a read too. Map: declaration node -> height parameter indexes.
  const reads = new Map();
  const calls = [];
  for (const f of files) {
    const fsf = program.getSourceFile(f);
    const collect = (n) => {
      if (ts.isCallExpression(n)) calls.push({ f, fsf, n });
      ts.forEachChild(n, collect);
    };
    collect(fsf);
  }
  const heightIndexes = (sig, d) => {
    if (isBaseRead(d)) {
      return sig.getParameters().map((q, i) => (isHeight(checker.getTypeOfSymbol(q)) ? i : -1)).filter((i) => i >= 0);
    }
    return reads.get(d) ?? [];
  };
  for (let changed = true; changed;) {
    changed = false;
    for (const { n } of calls) {
      const sig = checker.getResolvedSignature(n);
      const d = declOf(sig);
      const idx = d ? heightIndexes(sig, d) : [];
      if (idx.length === 0) continue;
      const fn = enclosingFunction(n);
      if (!fn) continue;
      for (const i of idx) {
        const o = ownerOfParam(n.arguments[i], fn);
        if (!o) continue;
        const mine = new Set(reads.get(o.fn) ?? []);
        if (!mine.has(o.index)) {
          mine.add(o.index);
          reads.set(o.fn, [...mine]);
          changed = true;
        }
      }
    }
  }
  for (const { f, fsf, n } of calls) {
    const sig = checker.getResolvedSignature(n);
    const d = declOf(sig);
    const idx = d ? heightIndexes(sig, d) : [];
    const fn = enclosingFunction(n);
    for (const i of idx) {
      if (!ownerOfParam(n.arguments[i], fn)) {
        out.fabricated.push({ file: rel(f), line: lineOf(fsf, n), read: d.name ? d.name.getText() : "(anonymous)" });
      }
    }
  }
  for (const f of files) {
    const fsf = program.getSourceFile(f);
    const visit = (n) => {
      if (ts.isPropertyDeclaration(n) && ts.isClassLike(n.parent)) {
        const t = checker.getTypeAtLocation(n);
        const readonly = (ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Readonly) !== 0;
        const mutable = !isRecordPort(t) && isWritableType(t);
        if (!readonly || mutable) out.held.push({ file: rel(f), line: lineOf(fsf, n), field: n.name.getText(fsf), readonly, mutable });
      }
      ts.forEachChild(n, visit);
    };
    visit(fsf);
  }
  return out;
}

// ---- sc3 --------------------------------------------------------------------
function sc3Findings(file) {
  const sf = program.getSourceFile(file);
  const found = [];
  const elementOf = (t) =>
    checker.getIndexTypeOfType(t, ts.IndexKind.Number) ?? (t.aliasTypeArguments?.[0]) ?? (checker.getTypeArguments?.(t)?.[0]);
  const isCurrencyCollection = (t) => {
    if (!t) return false;
    const e = elementOf(t);
    return e !== undefined && parts(e).every((c) => has(c, CURRENCY));
  };
  const isCardinality = (e) =>
    ts.isPropertyAccessExpression(e) && (e.name.text === "length" || e.name.text === "size") &&
    isCurrencyCollection(checker.getTypeAtLocation(e.expression));
  const COMPARE = new Set([ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.LessThanEqualsToken,
    ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken]);
  const visit = (n) => {
    if ((ts.isNumericLiteral(n) && Number(n.text) === 2) || (ts.isBigIntLiteral(n) && Number(n.text.slice(0, -1)) === 2)) {
      found.push({ file: rel(file), line: lineOf(sf, n), how: "the-number-two" });
    }
    if (ts.isBinaryExpression(n) && COMPARE.has(n.operatorToken.kind) &&
        ((isCardinality(n.left) && ts.isNumericLiteral(n.right)) || (isCardinality(n.right) && ts.isNumericLiteral(n.left)))) {
      found.push({ file: rel(file), line: lineOf(sf, n), how: "cardinality-branch" });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

// ---- reach: R-22 / F1 / SEAM-27 - UnitRegistry.features is MOD-13's alone ---------------
const FEATURES_OWNER = "src/advisory";
const isFeaturesMethod = (d) => declaredAs(d, "src/catalog/unit-registry.ts", "features");
function reachFindings(file, here) {
  if (here === FEATURES_OWNER || here.startsWith(FEATURES_OWNER + "/")) return [];
  const sf = program.getSourceFile(file);
  const found = [];
  const add = (n, how) => found.push({ file: here, line: lineOf(sf, n), how });
  const visit = (n) => {
    if (ts.isCallExpression(n) && isFeaturesMethod(declOf(checker.getResolvedSignature(n)))) {
      add(n, "features-read");
    } else if ((ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) &&
               !(ts.isCallExpression(n.parent) && n.parent.expression === n)) {
      const at = ts.isPropertyAccessExpression(n) ? n.name : n.argumentExpression;
      if (checker.getSymbolAtLocation(at)?.declarations?.some(isFeaturesMethod)) add(n, "features-reference");
    } else if (ts.isBindingElement(n) && ts.isObjectBindingPattern(n.parent)) {
      const key = (n.propertyName ?? n.name).getText(sf);
      const prop = checker.getPropertyOfType(checker.getTypeAtLocation(n.parent), key);
      if (prop?.declarations?.some(isFeaturesMethod)) add(n, "features-reference");
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

// ---- ledgers: every AppendedFact alias in src/ is listed (RD-12) -----------------------
function discoveredLedgers(files, judgedAt) {
  const out = [];
  for (const f of files) {
    const sf = program.getSourceFile(f);
    const visit = (n) => {
      if (ts.isTypeReferenceNode(n) && n.typeArguments?.length === 2) {
        const s = checker.getSymbolAtLocation(n.typeName);
        const target = s && (s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s);
        if (target?.name === "AppendedFact" && target.declarations?.some((d) => rel(d.getSourceFile().fileName) === "src/kernel/index.ts")) {
          const k = checker.getPropertyOfType(checker.getTypeFromTypeNode(n.typeArguments[1]), "kind");
          const kt = k && checker.getTypeOfSymbol(k);
          let alias = n.parent;
          while (alias && !ts.isTypeAliasDeclaration(alias)) alias = alias.parent;
          if (kt?.isStringLiteral()) out.push({ file: judgedAt(f), kind: kt.value, brand: alias?.name.text ?? null });
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
}
/** What the discovery says about a set of facts: kinds no list protects, owned elsewhere, or unbranded. */
const ledgerVerdict = (facts) => ({
  unlisted: facts.filter((x) => !KINDS.has(x.kind)),
  misowned: facts.filter((x) => KINDS.has(x.kind) && !x.file.startsWith(KIND_OWNER.get(x.kind) + "/")),
  unbranded: facts.filter((x) => !BRANDS.some((b) => b.name === x.brand && b.owner === x.file)),
});
const LEDGER_FACTS = discoveredLedgers(SRC, rel);

process.stdout.write(JSON.stringify({
  fixtures,
  mint: {
    src: [...SRC, ...SRC_DTS].flatMap(mintFindings),
    fixtures: Object.fromEntries([...MINT, ...MINT_DTS].map((f) => [rel(f), mintFindings(f)])),
  },
  forge: {
    src: SRC.flatMap((f) => forgeFindings(f, rel(f))),
    fixtures: Object.fromEntries(FORGE.map((f) => [rel(f), forgeFindings(f, rel(f))])),
    owners: Object.fromEntries(OWNERS.map((f) => [mirrored(f), forgeFindings(f, mirrored(f))])),
  },
  surface: {
    src: surfaceOf(CATALOG_DIR, resolve(CATALOG_DIR, "index.ts")),
    ledgers: Object.fromEntries(LEDGERS.map((l) => [l.root, surfaceOf(resolve(repo, l.root), resolve(repo, l.root, "index.ts"))])),
    fixtures: Object.fromEntries(SURFACE_CASES.map((c) => [c, surfaceOf(join(fx("catalog-surface"), c), join(fx("catalog-surface"), c, "index.ts"))])),
  },
  sc3: { src: SRC.flatMap(sc3Findings), fixtures: Object.fromEntries(SC3.map((f) => [rel(f), sc3Findings(f)])) },
  reach: {
    src: SRC.flatMap((f) => reachFindings(f, rel(f))),
    fixtures: Object.fromEntries(REACH.map((f) => [reachMirrored(f), reachFindings(f, reachMirrored(f))])),
  },
  ledgers: {
    discovered: LEDGER_FACTS,
    ...ledgerVerdict(LEDGER_FACTS),
    fixtures: Object.fromEntries(DISCOVERY.map((f) => [discoveryMirrored(f), ledgerVerdict(discoveredLedgers([f], discoveryMirrored))])),
  },
}));
