/**
 * Class signatures of one TS/JS source file, PARSED - for the declaration comparison
 * that tools/seal.py and tools/phase4-checks.py run (OS-1, RD-24; gate.py runs it at
 * every commit).
 *
 * Why this exists (IR-34; framework trial finding MF-24). The 2.3.0 template guessed
 * TS/JS signatures with regular expressions: the first `class <word>` anywhere in the
 * text (comments included - "no definition outside this class can build one" became
 * a class named `can`), one class per file, and a method pattern that needs `)` to be
 * followed directly by `{` - so every TypeScript method with a return-type annotation
 * was invisible, and typed or destructured constructor parameters parsed as nothing.
 * The comparison was blind for TypeScript, and in a session rooted in the repo it
 * would have refused correct commits on violations that do not exist.
 *
 * Syntax only (createSourceFile, no program, no checker): cheap, and it reads exactly
 * what the declaration comparison is about - names.
 *
 * Rules, matching the Python path in intent:
 *   - every class declaration with a name, at any depth; comments are not code;
 *   - the constructor's parameters, where a destructured parameter `{ a, b }`
 *     contributes its binding names (the shape new-object.py generates);
 *   - public methods only: not `#private`, not `private` / `protected`.
 *
 * Usage:  node tools/checks/ts-signatures.mjs <file>
 * Output: {"<Class>": {"constructor": [names], "<method>": [names]}}
 */
import ts from "typescript";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  process.stderr.write("usage: ts-signatures.mjs <file>\n");
  process.exit(2);
}
const kind = /\.(js|mjs|cjs)$/.test(file) ? ts.ScriptKind.JS
  : file.endsWith(".jsx") ? ts.ScriptKind.JSX
  : file.endsWith(".tsx") ? ts.ScriptKind.TSX
  : ts.ScriptKind.TS;
const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ES2022, true, kind);

const bindingNames = (name) =>
  ts.isIdentifier(name)
    ? [name.text]
    : ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)
      ? name.elements.flatMap((e) => (ts.isBindingElement(e) ? bindingNames(e.name) : []))
      : [];
const paramNames = (params) => params.flatMap((p) => bindingNames(p.name));
const isPublic = (m) =>
  !(ts.getCombinedModifierFlags(m) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) &&
  !(m.name && ts.isPrivateIdentifier(m.name));

const out = {};
const visit = (node) => {
  if (ts.isClassDeclaration(node) && node.name) {
    const ops = {};
    for (const m of node.members) {
      if (ts.isConstructorDeclaration(m)) ops.constructor = paramNames(m.parameters);
      else if (ts.isMethodDeclaration(m) && isPublic(m) && ts.isIdentifier(m.name)) {
        ops[m.name.text] = paramNames(m.parameters);
      }
    }
    out[node.name.text] = ops;
  }
  ts.forEachChild(node, visit);
};
visit(sf);
process.stdout.write(JSON.stringify(out));
