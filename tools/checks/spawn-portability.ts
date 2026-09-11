/**
 * Every child process this repo starts must be the NODE BINARY.
 *
 * The rule, stated without naming a platform:
 *
 *   A spawn whose command is a NAME is resolved by the host - through PATH, through
 *   PATHEXT, through a shim - and the hosts disagree. A spawn whose command is
 *   `process.execPath` is the interpreter already running, at an absolute path, on
 *   every host. Only the second is portable. A spawn that takes a COMMAND STRING
 *   (`exec`, `execSync`) is worse still: it is parsed by cmd.exe on one host and by
 *   sh on another, and the two disagree about quoting before the program even runs.
 *
 * Why this check exists (K7 round 3, CC-4). The kernel's fixture compile spawned
 * `npx.cmd`. Node has refused to spawn `.cmd` without a shell since the fix for
 * CVE-2024-27980, so on Windows it threw EINVAL and the two base cases it fed -
 * BC-01-3 (append-only) and BC-01-4 (ON_FAIL) - were RED ON A CLEAN TREE. A named
 * guard test that is red before any mutation cannot distinguish a kill from a
 * permanent error, so the guards were unverified by any run the gate could perform.
 *
 * RD-12: this pins the RULE, not that one call site. The build happens on Linux
 * and the gate runs on Windows; without a rule the next module ships the same
 * defect. `fork` is admitted because it launches Node by construction - it takes a
 * module path, never a command.
 *
 * RD-13: this RESOLVES nothing and scans no names - it reads the AST and asks what
 * the first ARGUMENT is. A text scan for "npx" would pass the moment someone wrote
 * a different command name, which is the same defect wearing another spelling.
 */
import ts from "typescript";
import { readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { reported, type ReportedPath } from "./reported-path.js";

/** Takes a command string handed to a shell. Never portable. */
const SHELL_FORMS = new Set(["exec", "execSync"]);
/** Takes a command plus an argv array. Portable iff the command is the node binary. */
const ARGV_FORMS = new Set(["execFile", "execFileSync", "spawn", "spawnSync"]);
/** Launches Node by construction: the first argument is a module path. */
const ADMITTED_FORMS = new Set(["fork"]);

export type SpawnDefect = "shell-command-string" | "command-is-not-the-node-binary";

export interface SpawnViolation {
  readonly file: ReportedPath;
  readonly line: number;
  readonly callee: string;
  readonly defect: SpawnDefect;
}

export interface SpawnScope {
  readonly roots: readonly string[];
  /** Directories whose contents are subject matter rather than code that runs. */
  readonly exclude: readonly string[];
}

const contained = (parent: string, child: string): boolean => {
  const p = resolve(parent);
  const c = resolve(child);
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep);
};

function sourceFiles(root: string, exclude: readonly string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (exclude.some((e) => contained(e, dir))) return;
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
      } else if (/\.(ts|mts|mjs|cjs|js)$/.test(name) && !name.endsWith(".d.ts")) {
        if (!exclude.some((e) => contained(e, full))) out.push(resolve(full));
      }
    }
  };
  walk(resolve(root));
  return out.sort();
}

/** The rightmost name of a callee: `execFileSync` and `cp.execFileSync` both give one. */
function calleeName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return null;
}

/** True only for the expression `process.execPath` - nothing that merely looks like it. */
function isNodeBinary(arg: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(arg) &&
    ts.isIdentifier(arg.expression) &&
    arg.expression.text === "process" &&
    arg.name.text === "execPath"
  );
}

export function findSpawnPortabilityViolations(scope: SpawnScope): readonly SpawnViolation[] {
  const exclude = scope.exclude.map((e) => resolve(e));
  const violations: SpawnViolation[] = [];
  for (const root of scope.roots) {
    for (const file of sourceFiles(root, exclude)) {
      const text = ts.sys.readFile(file);
      if (text === undefined) continue;
      const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
      const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node)) {
          const name = calleeName(node.expression);
          if (name !== null && !ADMITTED_FORMS.has(name)) {
            const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
            const first = node.arguments[0];
            if (SHELL_FORMS.has(name)) {
              violations.push({
                file: reported(file),
                line,
                callee: name,
                defect: "shell-command-string",
              });
            } else if (ARGV_FORMS.has(name) && (first === undefined || !isNodeBinary(first))) {
              violations.push({
                file: reported(file),
                line,
                callee: name,
                defect: "command-is-not-the-node-binary",
              });
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
  }
  return violations;
}
