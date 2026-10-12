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
 * BC-01-3 (append-only) and BC-01-4 (ON_FAIL) - were RED ON A CLEAN TREE.
 *
 * RD-12: this pins the RULE, not that one call site. `fork` is admitted because it
 * launches Node by construction - it takes a module path, never a command.
 *
 * RD-13, as K7 round 4 (CC-6 / DR-07) found it was NOT honoured: the previous
 * version read the callee's NAME, so an aliased import, an element access or a
 * destructured rename walked past it, and it never read a .py file while
 * tools/rederive.py launched `npx` by name. The decision now belongs to resolvers
 * that know which function a call IS:
 *
 *   TS/JS   tools/checks/spawn-resolve.mjs - the type checker resolves each call's
 *           signature; a spawn is a call declared in Node's child_process module.
 *   Python  tools/checks/spawn-portability.py - Python's own parser, resolving
 *           through import bindings, for the .py files the declared commands reach.
 *
 * Both run in their own process (heap; IR-21). This module is the typed front: it
 * brands every reported path (IR-19) and is where the one registered exception to
 * the rule lives - the python3 launch below (tools/checks/spawn-exceptions.json).
 */
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reported, type ReportedPath } from "./reported-path.js";

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

interface RawViolation {
  file: string;
  line: number;
  callee: string;
  defect: SpawnDefect;
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const brand = (raw: readonly RawViolation[]): readonly SpawnViolation[] =>
  raw.map((v) => ({ file: reported(v.file), line: v.line, callee: v.callee, defect: v.defect }));

/** Every scope in ONE resolver process: one program, one load of @types/node. */
export function findSpawnPortabilityViolationsIn(
  scopes: readonly SpawnScope[],
): readonly (readonly SpawnViolation[])[] {
  const request = JSON.stringify({
    scopes: scopes.map((s) => ({
      roots: s.roots.map((r) => resolve(r)),
      exclude: s.exclude.map((e) => resolve(e)),
    })),
  });
  const raw = execFileSync(
    process.execPath,
    [resolve(repo, "tools/checks/spawn-resolve.mjs"), request],
    { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  const parsed = JSON.parse(raw) as { results: RawViolation[][] };
  return parsed.results.map(brand);
}

export function findSpawnPortabilityViolations(scope: SpawnScope): readonly SpawnViolation[] {
  const [only] = findSpawnPortabilityViolationsIn([scope]);
  return only ?? [];
}

/**
 * The Python half. `"declared"` sweeps the .py files the commands in
 * .metaframework/project.json reach; otherwise the given files or directories.
 *
 * REGISTERED EXCEPTION (IR-25): this is the one launch in the tree that is not the
 * Node binary. Python's parser is the only resolver for Python, and `python3` is
 * already a host dependency of the declared rederive_all command.
 */
export function findPythonSpawnViolations(
  target: "declared" | readonly string[],
): { files: readonly ReportedPath[]; violations: readonly SpawnViolation[] } {
  const args = target === "declared" ? ["--declared", "--root", repo] : target.map((t) => resolve(t));
  const raw = execFileSync("python3", [resolve(repo, "tools/checks/spawn-portability.py"), ...args], {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const parsed = JSON.parse(raw) as { files: string[]; violations: RawViolation[] };
  return { files: parsed.files.map((f) => reported(f)), violations: brand(parsed.violations) };
}
