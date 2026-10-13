/**
 * BC-13-2 - who reaches MOD-13 `advisory/` (REF-01a's second half, S-17, DG-F1).
 *
 * The rule: nothing reads the difficulty advisory. Stated as a reach: no source file outside
 * src/advisory/ names a module that RESOLVES into it, in any form.
 *
 * SCOPE (R-15) - what this checker decides, and what it registers. K7 scores it against this
 * statement; a limit is pinned by a `limit-` fixture it must NOT flag.
 *   DECIDES, in every loadable source file given (.ts/.mts/.cts/.tsx/.js/.mjs/.cjs/.jsx) outside the
 *   target root: every module specifier - an import or re-export declaration (type-only included),
 *   `import x = require(...)`, `require(...)`, a dynamic `import(...)`, a type query
 *   `import("...").T`, and a triple-slash `/// <reference path=...>` - quoted or backtick, RESOLVED
 *   (RD-13, never name-matched) and tested for CONTAINMENT in the target root. A computed specifier
 *   (a dynamic import or require of anything but a literal) is refused as unresolvable, so the rule
 *   stays checkable.
 *   LIMITS: an advisory handed in at runtime through a structural type, which no specifier names
 *   (limit-structural-handoff.ts) - DG-F1 against a composed object is the composition root's
 *   (Phase 5).
 *   BOUNDARY: the files handed in; a fixture is judged AS IF at the src/ path it mirrors.
 */
import ts from "typescript";
import { dirname, resolve } from "node:path";
import { contains, resolveSpecifier } from "./external-isolation.js";

export interface ReachFinding {
  /** The file judged, as the caller named it. */
  readonly file: string;
  readonly specifier: string;
  readonly form: "declaration" | "import-equals" | "require" | "dynamic-import" | "type-query" | "reference";
  readonly reason: "reaches-target" | "unresolvable";
}

/** Every specifier the source text names, with its form; a computed one as `null`. */
function specifiersOf(file: string, text: string): { readonly form: ReachFinding["form"]; readonly specifier: string | null }[] {
  const kind = /\.(js|mjs|cjs|jsx)$/.test(file) ? ts.ScriptKind.JS : /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, kind);
  const found: { form: ReachFinding["form"]; specifier: string | null }[] = sf.referencedFiles.map((r) => ({ form: "reference" as const, specifier: r.fileName }));
  const literal = (e: ts.Node | undefined): string | null => (e !== undefined && ts.isStringLiteralLike(e) ? e.text : null);
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined) {
      found.push({ form: "declaration", specifier: literal(node.moduleSpecifier) });
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      found.push({ form: "import-equals", specifier: literal(node.moduleReference.expression) });
    } else if (ts.isImportTypeNode(node)) {
      const arg = node.argument;
      found.push({ form: "type-query", specifier: ts.isLiteralTypeNode(arg) ? literal(arg.literal) : null });
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      found.push({ form: "dynamic-import", specifier: literal(node.arguments[0]) });
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require") {
      found.push({ form: "require", specifier: literal(node.arguments[0]) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/**
 * Every specifier in `files` that resolves into `target`, or cannot be resolved. `judgedAt` maps a
 * file to the path it is judged at (a fixture mirrors a src/ path); by default, its own.
 */
export function reachesInto(target: string, files: readonly { readonly path: string; readonly text: string }[], judgedAt: (path: string) => string = (p) => p): ReachFinding[] {
  const out: ReachFinding[] = [];
  for (const { path, text } of files) {
    const at = judgedAt(path);
    if (contains(target, at)) continue;
    for (const { form, specifier } of specifiersOf(path, text)) {
      if (specifier === null) {
        out.push({ file: path, specifier: "(computed)", form, reason: "unresolvable" });
        continue;
      }
      // A triple-slash reference names a FILE path, not a module: resolved as a path.
      const resolved = form === "reference" ? resolve(dirname(at), specifier) : resolveSpecifier(at, specifier).resolved;
      if (resolved !== null && contains(target, resolved)) out.push({ file: path, specifier, form, reason: "reaches-target" });
    }
  }
  return out;
}
