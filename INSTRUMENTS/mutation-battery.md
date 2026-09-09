# Mutation Battery — The Frame Gate build

A battery re-plants the defect shapes the tests exist to kill. It runs on a **committed tree** —
an untracked tree cannot be git-restored, and a battery whose restores fail silently proves nothing.
Every restore is verified against HEAD; the run aborts on a failed restore. "BUILT & GREEN" without
a battery is an unverified claim, and a battery with no record is indistinguishable from none.

## Round 1 — MOD-02 `ports/` · guard `tools/checks/external-isolation.ts` (REF-02, ER-5)

Baseline before mutation: `tsc=0 vitest=0`, 7 tests passing.

| # | Mutation | tsc | vitest | Verdict |
|---|---|---|---|---|
| M1 | The ports exemption (`if (contains(scope.portsRoot, file)) continue;`) deleted | 0 | 1 | **killed by test** |
| M2 | Containment replaced with a name scan (`file.includes("ports")`) — the RD-13 defeat | 0 | 1 | **killed by test** |
| M3 | Separator guard dropped from `contains`, so `src/portsmith` passes as `src/ports` | 0 | 1 | **killed by test** |
| M4 | An unresolved specifier classified `internal` instead of `external` | 0 | 1 | **killed by test** (3 tests) |
| M5 | The `resolves-outside-src` arm removed | 0 | 1 | **killed by test** |
| M6 | Only static import declarations scanned; re-exports and dynamic imports ignored | 0 | 1 | **killed by test** |

Post-battery restore verification: **tree matches HEAD**.

**No mutation was caught only at build**, so no compiler-evading variant was required. All six die by
test, which is the stronger result: an unused-variable kill proves the compiler noticed, not that the
suite would.

### The two that survived the first pass

M5 and M6 **survived** when the battery first ran against the seven-test suite's predecessor, and both
survivals were real:

- **M5** — no fixture imported a package that actually *resolves*. Every fixture used a builtin, which
  does not resolve, so only the `unresolved-builtin` arm was ever exercised. The `resolves-outside-src`
  arm — the one that catches every `node_modules` dependency — had no test at all.
- **M6** — no fixture used `export … from` or a dynamic `import()`. Both are ways to name an external,
  and the detector's handling of them was unverified.

Fixtures `package/` and `reexport/` were added with the two acceptance tests that kill them, and the
battery was re-run to green. **The suite was passing and the guard was not sound**; that gap is
precisely what the battery exists to expose and is invisible from a green run.

A third would-be survivor was caught earlier, while *planning* the battery rather than running it: a
name-scan mutation survived the original four tests because no fixture had a path containing the
substring `ports` that was not the ports module. `src/portsmith/` and
`test_lookalike_directory_is_not_exempted_by_name` were added before the first commit. Recorded here
because "found while planning" is not the same evidence as "killed while running", and the
distinction should not be lost.

### Harness

`/tmp/battery.sh` — restore-verify-mutate-run-restore, aborting on any restore that does not match
HEAD. Mutations are applied by separate scripts so the mutation itself is reviewable rather than
inlined in a shell string.
