/**
 * BC-02-1 - the external-isolation detector (REF-02, ER-5).
 *
 * The rule, stated without naming any external:
 *
 *   For every module specifier imported by a file under src/: RESOLVE it. If the
 *   resolution lands outside src/, or fails to resolve because the specifier names
 *   a runtime builtin, the import is EXTERNAL. An external import is admitted only
 *   from a file contained in src/ports/.
 *
 * RD-13 - this detector RESOLVES and tests CONTAINMENT. It does not scan specifier
 * text. A name-scan is defeated by sibling spellings: '../ports/index.js' and
 * './../ports/index.js' denote one file and read as two names. Containment is
 * computed on normalised absolute paths, so 'src/ports/../facts/x.ts' cannot pose
 * as a ports file either.
 *
 * The type system cannot express "only MOD-02 may import node:crypto" - TypeScript
 * has no notion of which module is allowed to name what. That is precisely why this
 * check exists as an AST pass and why it runs inside the test command rather than
 * beside it (ADR-001).
 *
 * SCOPE (R-15). DECIDES, in every loadable source file under src/ (.ts/.mts/.cts/.tsx/
 * .js/.mjs/.cjs/.jsx): import, re-export, `import x = require`, `require()` and dynamic
 * `import()` specifiers - quoted or backtick - resolved and tested for containment;
 * a computed specifier is refused as unresolvable. No registered limits.
 */
import ts from "typescript";
import { readdirSync, statSync } from "node:fs";
import { isAbsolute, join, resolve, sep } from "node:path";
import { reported, type ReportedPath } from "./reported-path.js";

export interface ExternalImportViolation {
  /**
   * Platform-stable (K7 round 3, CC-4). Containment below is computed on the
   * HOST-spelled absolute path, because that is what `sep` compares; only the
   * path that leaves this module is respelled, so a caller's assertion means the
   * same thing on every host.
   */
  readonly file: ReportedPath;
  readonly specifier: string;
  readonly reason: "resolves-outside-src" | "unresolved-builtin";
}

export interface IsolationScope {
  readonly srcRoot: string;
  readonly portsRoot: string;
}

export interface SpecifierResolution {
  readonly kind: "internal" | "external";
  readonly resolved: string | null;
}

/** Normalised absolute path. Containment is only meaningful between two of these. */
const norm = (p: string): string => resolve(p);

/**
 * True iff `child` is `parent` or lies beneath it. The separator suffix is what
 * stops `src/portsmith/x.ts` from counting as contained in `src/ports`.
 */
export function contains(parent: string, child: string): boolean {
  const p = norm(parent);
  const c = norm(child);
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep);
}

/** A specifier this sweep cannot read; never resolves, so it is reported as external. */
const UNRESOLVABLE = "<computed specifier>";

const host: ts.ModuleResolutionHost = {
  fileExists: (f) => ts.sys.fileExists(f),
  readFile: (f) => ts.sys.readFile(f),
};

const COMPILER_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  // A .js/.mjs file under src/ is source too (WI-01), so a specifier that lands
  // on one must resolve as INTERNAL rather than fall through as unresolved.
  allowJs: true,
};

/**
 * Every extension the runtime can load as source (WI-01, K7 rounds 4-5: the
 * sweep read `*.ts` only, so an external named from a `.mjs` beside it was never
 * seen). Declaration files carry no runtime imports and are skipped.
 */
const SOURCE = /\.(ts|mts|cts|tsx|js|mjs|cjs|jsx)$/;
const scriptKind = (file: string): ts.ScriptKind =>
  /\.(js|mjs|cjs)$/.test(file) ? ts.ScriptKind.JS
    : file.endsWith(".jsx") ? ts.ScriptKind.JSX
    : file.endsWith(".tsx") ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;

/**
 * Resolve one specifier as seen from one file, and classify it.
 *
 * A specifier is INTERNAL iff it resolves to a real file. Whether that file is
 * inside src/ is a separate question, answered by `contains` at the call site -
 * keeping the two apart is what lets the sibling-spelling test assert that both
 * spellings produce the same resolved path.
 */
export function resolveSpecifier(fromFile: string, specifier: string): SpecifierResolution {
  const r = ts.resolveModuleName(specifier, norm(fromFile), COMPILER_OPTIONS, host);
  const resolved = r.resolvedModule?.resolvedFileName;
  if (resolved === undefined) {
    // Unresolvable from disk: a runtime builtin (node:crypto) or a missing package.
    // Both are external to this source tree; neither may be named outside ports/.
    return { kind: "external", resolved: null };
  }
  return { kind: "internal", resolved: norm(resolved) };
}

/** Every loadable source file beneath `root`, excluding declaration files. */
function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== "node_modules") walk(full);
      } else if (SOURCE.test(name) && !/\.d\.(ts|mts|cts)$/.test(name)) {
        out.push(norm(full));
      }
    }
  };
  walk(norm(root));
  return out.sort();
}

/** Every module specifier this file imports or re-exports, in source order. */
function specifiersOf(file: string): string[] {
  const text = ts.sys.readFile(file);
  if (text === undefined) return [];
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, scriptKind(file));
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      found.push(node.moduleSpecifier.text);
    } else if (
      // `import fs = require("node:fs")` (WI-01): a TypeScript import form that is
      // neither an ImportDeclaration nor a call, and was invisible to this sweep.
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      found.push(node.moduleReference.expression.text);
    } else if (
      // `require("node:fs")` in a CommonJS source file.
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require" &&
      node.arguments.length === 1 &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      found.push(node.arguments[0].text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      // A no-substitution template (`node:crypto` in backticks) names a module exactly as
      // a quoted string does (K7 round 7, WI-05); isStringLiteral alone missed it.
      found.push(node.arguments[0].text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] !== undefined
    ) {
      // A specifier computed at runtime cannot be resolved here, so it is refused rather
      // than assumed internal: the rule must be checkable.
      found.push(UNRESOLVABLE);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

export function findExternalIsolationViolations(
  scope: IsolationScope,
): readonly ExternalImportViolation[] {
  if (!isAbsolute(scope.srcRoot) || !isAbsolute(scope.portsRoot)) {
    throw new Error("IsolationScope roots must be absolute: containment is not a text comparison");
  }
  const violations: ExternalImportViolation[] = [];
  for (const file of sourceFiles(scope.srcRoot)) {
    // The permitted site is decided by CONTAINMENT of the resolved file path,
    // never by whether the path string looks like a ports path.
    if (contains(scope.portsRoot, file)) continue;
    for (const specifier of specifiersOf(file)) {
      const r = resolveSpecifier(file, specifier);
      if (r.resolved === null) {
        violations.push({ file: reported(file), specifier, reason: "unresolved-builtin" });
      } else if (!contains(scope.srcRoot, r.resolved)) {
        violations.push({ file: reported(file), specifier, reason: "resolves-outside-src" });
      }
    }
  }
  return violations;
}
