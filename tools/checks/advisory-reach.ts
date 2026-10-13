/**
 * BC-13-2 - who reaches MOD-13 `advisory/` (REF-01a's second half, S-17, DG-F1).
 *
 * The rule: nothing reads the difficulty advisory. Stated as a reach: no source file outside
 * src/advisory/ names a module that RESOLVES into it, in any form.
 *
 * SCOPE (R-15) - what this checker decides, and what it registers. K7 scores it against this
 * statement; a limit is pinned by a `limit-` fixture it must NOT flag.
 *   DECIDES, in every loadable source file given (.ts/.mts/.cts/.tsx/.js/.mjs/.cjs/.jsx) outside the
 *   target root: these specifier forms - an import or re-export declaration (type-only included),
 *   `import x = require(...)`, a call whose callee is the identifier `require`, a dynamic
 *   `import(...)`, a type query `import("...").T`, and a triple-slash `/// <reference path=...>` -
 *   quoted or backtick, RESOLVED (RD-13, never name-matched) and tested for CONTAINMENT in the
 *   target root on the FILE's identity: its real path, in its true case, so a case-variant spelling
 *   on a case-insensitive host is the same file (K7 round 21, F3). A computed specifier in a dynamic
 *   import or a `require` call is refused as unresolvable, so the rule stays checkable.
 *   LIMITS, each pinned by a limit- fixture it must not flag: an advisory handed in at runtime
 *   through a structural type, which no specifier names (limit-structural-handoff.ts; DG-F1 against
 *   a composed object is the composition root's, Phase 5); `require` is decided by its callee's NAME,
 *   so an aliased require (limit-aliased-require.cjs), a `createRequire` result
 *   (limit-create-require.mjs) and `module.require` (limit-module-require.cjs) are not read.
 *   BOUNDARY: the files handed in - the caller hands no .d.ts, and src/ holds none (the mint rule
 *   refuses a hand-written declaration file, DR-23); a fixture is judged AS IF at the src/ path it
 *   mirrors.
 */
import ts from "typescript";
import { realpathSync } from "node:fs";
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
  const root = identity(target);
  for (const { path, text } of files) {
    const at = judgedAt(path);
    if (contains(root, identity(at))) continue;
    for (const { form, specifier } of specifiersOf(path, text)) {
      if (specifier === null) {
        out.push({ file: path, specifier: "(computed)", form, reason: "unresolvable" });
        continue;
      }
      // A triple-slash reference names a FILE path, not a module: resolved as a path.
      const resolved = form === "reference" ? resolve(dirname(at), specifier) : resolveSpecifier(at, specifier).resolved;
      if (resolved !== null && contains(root, identity(resolved))) out.push({ file: path, specifier, form, reason: "reaches-target" });
    }
  }
  return out;
}

/** A path as the file system knows it - its real path, in its true case - or as spelled, when there is no such file. */
function identity(path: string): string {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}
