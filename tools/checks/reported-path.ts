/**
 * A path as REPORTED by a check: absolute, and spelled with forward slashes on
 * every host.
 *
 * K7 round 3 (CC-4) found the reason this type exists. The external-isolation
 * detector returned a raw `path.resolve()` string, so an assertion like
 * `v.file.endsWith("src/facts/index.ts")` was true on POSIX and false on Windows.
 * The test asserted a PLATFORM where it meant to assert a PROPERTY, and the suite
 * was green only on the host it was written on.
 *
 * A brand makes that class unwritable rather than merely fixed: a violation's
 * reported path cannot be assigned a raw string, `reported()` is the only way to
 * make one, and `tsc --noEmit` sits inside test_command - so the guard runs
 * wherever the gate runs.
 *
 * RD-12: this pins the RULE (a reported path is platform-stable), not the two
 * assertions that happened to break.
 */
import { resolve, sep } from "node:path";

declare const REPORTED: unique symbol;

export type ReportedPath = string & { readonly [REPORTED]: true };

/**
 * The respelling, with the host separator passed IN rather than read from the
 * environment.
 *
 * This is the only way to test the arm that matters. The build happens on Linux,
 * where `sep` is already '/' and the respelling is the identity - so a mutation
 * that deletes it survives every test that can run here, and the defect ships to
 * the host that does have a different separator. Taking the separator as an
 * argument makes the Windows arm reachable from a Linux test. A platform you
 * cannot run is still a platform you can pass in.
 */
export function respell(absolute: string, hostSep: string): string {
  return absolute.split(hostSep).join("/");
}

/**
 * The only constructor. Absolutises first - comparison and containment are
 * meaningless between paths that are not both absolute - then respells the
 * host's separator as '/'. On POSIX the respelling is the identity.
 */
export function reported(p: string): ReportedPath {
  return respell(resolve(p), sep) as ReportedPath;
}
