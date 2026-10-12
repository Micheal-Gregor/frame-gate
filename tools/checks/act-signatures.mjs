/**
 * REF-06 (BC-05-5): no act signature accepts a diagnostic. "The diagnostic proposes;
 * it never closes a gate" - if an act can take it, the smallest possible run becomes
 * unexecutable without one. The Diagnostic type does not exist until MOD-10, so the
 * rule is stated over what would admit it: an OPEN parameter type.
 *
 * SCOPE (R-15) - what this checker decides, and what it registers. K7 scores it
 * against this statement; a limit is pinned by a `limit-` fixture it must NOT flag.
 *   acts  An ACT is a function-like with a body - function, method, class-field
 *         arrow, function expression, accessor, constructor - that calls
 *         RecordPort.append, or calls (or `new`s) another act, to a fixed point.
 *         A call inside an inline closure belongs to the closure AND to every
 *         function lexically enclosing it up to the nearest class member or
 *         top-level function, so a closure handed to forEach still makes its
 *         method an act. Acts are FOUND, never listed.
 *         DECIDES, in src/: every parameter of every act has a CLOSED type - not
 *         `any`, `unknown`, `object`, `Object`, `{}`, nor a type parameter that is
 *         unconstrained or constrained only to one of those; and none of those
 *         reached through a union member, an intersection made only of them, an
 *         array / tuple / library-generic type argument, an index signature, a
 *         public property declared in user code, or the RETURN of a function type
 *         (what the act receives by calling it - a callback's own parameters are
 *         what the act hands out, not what it accepts).
 *         LIMITS: a call through an interface or injected port signature is not
 *         followed - the implementation is judged where it is declared
 *         (limit-call-through-port.ts); an indirect call (`.call`, `.apply`,
 *         `Reflect.apply`) is not followed (limit-indirect-call.ts).
 *         BOUNDARY: RecordPort.append is the substrate, generic over its entry, not
 *         an act - a diagnostic written straight to the record is a forge, and the
 *         forge rule gains the Diagnostic brand when MOD-10 builds it. A primitive
 *         is closed: a diagnostic serialized into a string is a string. Code
 *         outside src/ is not read, except this rule's fixtures.
 *
 * Out of process and plain JavaScript for the reasons fixture-compiles.mjs gives
 * (heap inside a vitest worker; no loader, no shim, no platform - IR-21).
 *
 * Usage:  node tools/checks/act-signatures.mjs
 */
import ts from "typescript";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rel = (f) => relative(repo, f).split(sep).join("/");

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

const SRC = walk(resolve(repo, "src"), /\.(ts|mts|cts|tsx|js|mjs|cjs|jsx)$/);
const FIXTURES = walk(resolve(repo, "tests/fixtures/acts"), /\.ts$/);
const program = ts.createProgram([...SRC, ...FIXTURES], {
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
const isLib = (sf) => program.isSourceFileDefaultLibrary(sf) || sf.fileName.includes("/node_modules/");
const lineOf = (n) => n.getSourceFile().getLineAndCharacterOfPosition(n.getStart()).line + 1;

// ---- what an act is -----------------------------------------------------------
const declOf = (sig) => (sig && (sig.getDeclaration?.() ?? sig.declaration)) || undefined;
/** An overload signature resolves to its implementation; an interface member stays itself. */
function implOf(d) {
  if (!d || d.body || !d.name) return d;
  const s = checker.getSymbolAtLocation(d.name);
  return s?.declarations?.find((x) => ts.isFunctionLike(x) && x.body) ?? d;
}
const isRecordAppend = (d) =>
  d !== undefined &&
  rel(d.getSourceFile().fileName) === "src/ports/index.ts" &&
  d.name && ts.isIdentifier(d.name) && d.name.text === "append" &&
  d.parent && ts.isInterfaceDeclaration(d.parent) && d.parent.name.text === "RecordPort";
/** An inline closure: an arrow or function expression that is not itself a class field. */
const isClosure = (n) => (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && !ts.isPropertyDeclaration(n.parent);
/** The function-likes a call belongs to: its innermost, then outward through inline closures. */
function ownersOf(node) {
  const out = [];
  for (let fn = node.parent; fn; fn = fn.parent) {
    if (ts.isFunctionLike(fn) && fn.body) {
      out.push(fn);
      if (!isClosure(fn)) break;
    }
  }
  return out;
}

const calls = [];
for (const f of [...SRC, ...FIXTURES]) {
  const visit = (n) => {
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
      calls.push({ owners: ownersOf(n), target: implOf(declOf(checker.getResolvedSignature(n))) });
    }
    ts.forEachChild(n, visit);
  };
  visit(program.getSourceFile(f));
}
const acts = new Set();
for (let grew = true; grew; ) {
  grew = false;
  for (const c of calls) {
    if (!(isRecordAppend(c.target) || acts.has(c.target))) continue;
    for (const o of c.owners) if (!acts.has(o)) { acts.add(o); grew = true; }
  }
}

function nameOf(fn) {
  const classOf = (n) => {
    let p = n.parent;
    while (p && !ts.isClassLike(p) && !ts.isObjectLiteralExpression(p)) p = p.parent;
    return p && ts.isClassLike(p) ? (p.name?.text ?? "<class>") : "{}";
  };
  if (ts.isConstructorDeclaration(fn)) return `${classOf(fn)}.constructor`;
  if ((ts.isMethodDeclaration(fn) || ts.isGetAccessor(fn) || ts.isSetAccessor(fn)) && fn.name) return `${classOf(fn)}.${fn.name.getText()}`;
  if (ts.isFunctionDeclaration(fn)) return fn.name?.text ?? "<default>";
  if (fn.parent && ts.isPropertyDeclaration(fn.parent)) return `${classOf(fn.parent)}.${fn.parent.name.getText()}`;
  if (fn.parent && ts.isVariableDeclaration(fn.parent) && ts.isIdentifier(fn.parent.name)) return fn.parent.name.text;
  return `<closure:${lineOf(fn)}>`;
}

// ---- what an open type is -------------------------------------------------------
/** The types every value - a diagnostic included - is assignable to. */
function topOf(t) {
  if (t.flags & ts.TypeFlags.Any) return "any";
  if (t.flags & ts.TypeFlags.Unknown) return "unknown";
  if (t.flags & ts.TypeFlags.NonPrimitive) return "object";
  if (t.flags & ts.TypeFlags.Object) {
    const s = t.getSymbol();
    if (s?.name === "Object" && s.declarations?.some((d) => isLib(d.getSourceFile()))) return "Object";
    if (checker.getPropertiesOfType(t).length === 0 && t.getCallSignatures().length === 0 &&
        t.getConstructSignatures().length === 0 && checker.getIndexInfosOfType(t).length === 0) return "empty-object";
  }
  return undefined;
}
/** Every place inside `t` a diagnostic could be accepted, as { path, how }. */
function openIn(t, path, seen, out) {
  if (t.flags & ts.TypeFlags.TypeParameter) {
    const c = checker.getBaseConstraintOfType(t);
    if (!c || c === t || topOf(c)) out.push({ path, how: "type-parameter" });
    else openIn(c, path, seen, out);
    return;
  }
  const top = topOf(t);
  if (top) { out.push({ path, how: top }); return; }
  if (t.isUnion()) { for (const c of t.types) openIn(c, path, seen, out); return; }
  if (t.isIntersection()) {
    const tops = t.types.map(topOf);
    if (tops.every(Boolean)) { out.push({ path, how: tops[0] }); return; }
  } else if (!(t.flags & ts.TypeFlags.Object)) {
    return; // primitives, literals, enums: closed
  }
  if (seen.has(t)) return;
  seen.add(t);
  const listLike = checker.isArrayType(t) || checker.isTupleType(t);
  if (listLike) {
    for (const a of checker.getTypeArguments(t)) openIn(a, `${path}[]`, seen, out);
  } else if (t.objectFlags & ts.ObjectFlags.Reference && t.target?.symbol?.declarations?.some((d) => isLib(d.getSourceFile()))) {
    checker.getTypeArguments(t).forEach((a, i) => openIn(a, `${path}<${i}>`, seen, out));
  }
  if (!listLike) for (const info of checker.getIndexInfosOfType(t)) openIn(info.type, `${path}[key]`, seen, out);
  for (const sig of t.getCallSignatures()) openIn(checker.getReturnTypeOfSignature(sig), `${path}()`, seen, out);
  for (const p of checker.getPropertiesOfType(t)) {
    const d = p.valueDeclaration ?? p.declarations?.[0];
    if (!d || isLib(d.getSourceFile())) continue;
    if (d.name && ts.isPrivateIdentifier(d.name)) continue;
    if (ts.getCombinedModifierFlags(d) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;
    openIn(checker.getTypeOfSymbol(p), `${path}.${p.name}`, seen, out);
  }
}

// ---- report ---------------------------------------------------------------------
const actsIn = (f) => [...acts].filter((a) => a.getSourceFile().fileName === program.getSourceFile(f).fileName);
const judge = (fn) =>
  fn.parameters.flatMap((p) => {
    const out = [];
    openIn(checker.getTypeAtLocation(p), "", new Set(), out);
    return out.map((o) => ({ file: rel(fn.getSourceFile().fileName), line: lineOf(p), act: nameOf(fn), param: p.name.getText(), ...o }));
  });
const names = (f) => actsIn(f).map((a) => `${rel(f)}:${nameOf(a)}`);

process.stdout.write(JSON.stringify({
  acts: { src: SRC.flatMap(names).sort(), fixtures: Object.fromEntries(FIXTURES.map((f) => [rel(f), names(f).sort()])) },
  src: SRC.flatMap((f) => actsIn(f).flatMap(judge)),
  fixtures: Object.fromEntries(FIXTURES.map((f) => [rel(f), actsIn(f).flatMap(judge)])),
}));
