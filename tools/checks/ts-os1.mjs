/**
 * OS-1's illegal shapes in one TS/JS source file, PARSED - the TS/JS half of
 * `phase4-checks.py objects` (gate.py runs it at every commit; the seal sweep runs it).
 *
 * Why this exists (IR-40; framework trial finding MF-26). The 2.3.0 template checked
 * TS/JS with line regexes and brace counting: any `name(...) {` line inside a class
 * was a method, so `if (x === null) {` was a method named `if`, and `=(?!=|>)` read
 * the third `=` of `===` as a default argument - six false OS-1 violations on correct
 * MOD-03 code. Braces in strings or comments, and `class` in a comment, moved its idea
 * of where a class begins and ends.
 *
 * The four rules, with the template's names and messages, decided over the AST of
 * every class (declaration or expression) in the file:
 *   OS-1_default_argument  a parameter - or a destructured binding inside one -
 *                          with an initializer, on a constructor, method or accessor;
 *   OS-1_bag_parameter     a rest parameter, or `arguments` read inside a member;
 *   OS-1_undeclared_input  a member taking nothing whose return is a literal
 *                          (string, number, bigint, template without substitutions,
 *                          `new Date(...)`, or an array/object built only from those);
 *   OS-1_module_constant   a member reading a module-level variable whose
 *                          initializer is such a literal - resolved by SYMBOL, so a
 *                          parameter or local of the same name is not a read of it.
 *
 * Usage:  node tools/checks/ts-os1.mjs <file>
 * Output: [[rule, line, message], ...]
 */
import ts from "typescript";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  process.stderr.write("usage: ts-os1.mjs <file>\n");
  process.exit(2);
}
const program = ts.createProgram([file], {
  allowJs: true,
  noResolve: true,
  noLib: true,
  target: ts.ScriptTarget.ES2022,
  types: [],
});
const sf = program.getSourceFile(file) ??
  ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ES2022, true);
const checker = program.getTypeChecker();
const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
const out = [];
const add = (rule, n, msg) => out.push([rule, line(n), msg]);

const isLiteral = (e) => {
  while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression?.(e))) e = e.expression;
  if (!e) return false;
  if (ts.isStringLiteral(e) || ts.isNumericLiteral(e) || ts.isBigIntLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return true;
  if (ts.isPrefixUnaryExpression(e) && ts.isNumericLiteral(e.operand)) return true;
  if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "Date") return true;
  if (ts.isArrayLiteralExpression(e)) return e.elements.every(isLiteral);
  if (ts.isObjectLiteralExpression(e)) {
    return e.properties.every((p) => ts.isPropertyAssignment(p) && isLiteral(p.initializer));
  }
  return false;
};

// Module-level variables initialised to a literal: the constants OS-1 forbids a
// member to read.
const moduleConstants = new Set();
for (const st of sf.statements) {
  if (!ts.isVariableStatement(st)) continue;
  for (const d of st.declarationList.declarations) {
    if (ts.isIdentifier(d.name) && d.initializer && isLiteral(d.initializer)) {
      const s = checker.getSymbolAtLocation(d.name);
      if (s) moduleConstants.add(s);
    }
  }
}

const initializersIn = (name) =>
  ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)
    ? name.elements.flatMap((e) => (ts.isBindingElement(e) ? [...(e.initializer ? [e] : []), ...initializersIn(e.name)] : []))
    : [];

const checkMember = (cls, m) => {
  const params = m.parameters ?? [];
  for (const p of params) {
    if (p.initializer || initializersIn(p.name).length > 0) {
      add("OS-1_default_argument", p, "default argument — a default is a sealed scenario; hand it in");
    }
    if (p.dotDotDotToken) add("OS-1_bag_parameter", p, "rest/options bag — collaborators arrive as declared slots");
  }
  if (!m.body) return;
  const returns = [];
  const visit = (n) => {
    if (n !== m && ts.isFunctionLike(n) && !ts.isArrowFunction(n)) return; // a nested function's own scope
    if (ts.isIdentifier(n) && n.text === "arguments" && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) {
      add("OS-1_bag_parameter", n, "rest/options bag — collaborators arrive as declared slots");
    }
    if (ts.isIdentifier(n) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) {
      const s = checker.getSymbolAtLocation(n);
      if (s && moduleConstants.has(s)) {
        add("OS-1_module_constant", n, `reads module constant '${n.text}' — an undeclared input`);
      }
    }
    if (ts.isReturnStatement(n) && n.expression) returns.push(n.expression);
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(m.body, visit);
  if (ts.isArrowFunction(m) && !ts.isBlock(m.body)) returns.push(m.body);
  const takesNothing = params.length === 0 && !ts.isConstructorDeclaration(m);
  if (takesNothing && returns.length > 0 && returns.some(isLiteral)) {
    add("OS-1_undeclared_input", m, "takes nothing and returns a literal — that is an undeclared input; make it a constructor parameter");
  }
};

const visit = (n) => {
  if (ts.isClassDeclaration(n) || ts.isClassExpression(n)) {
    for (const m of n.members) {
      if (ts.isConstructorDeclaration(m) || ts.isMethodDeclaration(m) || ts.isGetAccessorDeclaration(m) ||
          ts.isSetAccessorDeclaration(m)) checkMember(n, m);
      if (ts.isPropertyDeclaration(m) && m.initializer && (ts.isArrowFunction(m.initializer) || ts.isFunctionExpression(m.initializer))) {
        checkMember(n, m.initializer);
      }
    }
  }
  ts.forEachChild(n, visit);
};
visit(sf);
process.stdout.write(JSON.stringify(out.sort((a, b) => a[1] - b[1])));
