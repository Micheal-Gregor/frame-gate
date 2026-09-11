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

---

## Round 2 — MOD-02, after the REF-02 rename (K7 round 1 remediation)

Re-run on the committed tree at the rename. Baseline `tsc=0 vitest=0`, 7 tests passing.
All six mutations still die by test; restores verified against HEAD.

| # | Mutation | tsc | vitest | Verdict |
|---|---|---|---|---|
| M1 | Ports exemption deleted | 0 | 1 | killed by test |
| M2 | Containment replaced with a name scan | 0 | 1 | killed by test |
| M3 | Separator guard dropped from `contains` | 0 | 1 | killed by test |
| M4 | Unresolved specifier classified `internal` | 0 | 1 | killed by test (3 tests) |
| M5 | `resolves-outside-src` arm removed | 0 | 1 | killed by test |
| M6 | Re-exports and dynamic imports ignored | 0 | 1 | killed by test |

### The check the rename made possible, and what it exposed

Before the rename, `vitest -t "<REF-02 §5 name>"` selected nothing, so CC-6's rule — *delete the
guarded call and the named test must fail* — could not be run at all. It can now. Running each
mutation against **the declared selector alone**:

| Mutation | REF-02 named test via `test_select` |
|---|---|
| M1 | passes — killed instead by `test_external_reached_through_ports_module_succeeds` |
| M2 | passes — killed by `test_lookalike_directory_is_not_exempted_by_name` |
| M3 | passes — killed by the lookalike test |
| M4 | **fails — the named test kills it** |
| M5 | passes — killed by `test_import_resolving_outside_src_is_a_violation` |
| M6 | passes — killed by `test_reexport_and_dynamic_import_are_scanned` |

**One of six.** The §5-named test asserts one property: a module outside `ports/` importing an
external yields exactly one violation with reason `unresolved-builtin`. Only a mutation that breaks
*that* assertion kills it. The other five properties — exemption correctness, containment precision,
coverage of packages that resolve, coverage of re-export and dynamic forms — are guarded by tests
**§5 does not name**, which exist only because the builder wrote them.

This is not a weakness in the suite; the suite is stronger than the specification requires. It is a
weakness in **what the specification binds**. A reviewer or a CI step that runs `test_select` per
§5 row — which is exactly what the emission contract describes — would see five of these six
mutations survive and read the guard as covered.

Recorded here and raised in `F-supersession-proposals.md` as a secondary observation on SP-1: a
single `Test name` per guard is a floor, not a coverage claim, and CC-6 should either run the full
suite or §5 should bind more than one case per guard.

---

## Round 3 — MOD-01 `kernel/`

Run on the committed tree at `3f5a30f`. Baseline `tsc=0 vitest=0`, 16 tests passing.
All restores verified against HEAD; tree matched HEAD after the run.

| # | Mutation | tsc | vitest | Verdict |
|---|---|---|---|---|
| K1 | A sixth `Unknown` member added | 0 | 1 | **killed by test** |
| K2 | An `Unknown` member renamed | 2 | 1 | **killed by test** (build also red) |
| K3 | `AppendedFact` fields made mutable | 0 | 1 | **killed by test** |
| K4 | `Gate.onFail` made optional | 0 | 1 | **killed by test** |
| K5 | An exported `isProjection` type predicate added | 0 | 1 | **killed by test** |
| K6 | `DifficultyAdvisory` added to the member list | 0 | 1 | **killed by test** |
| K7 | `succeeds()` made true for equal heights | 0 | 1 | **killed by test** |
| K8 | Height arithmetic (`distance`) exported | 0 | 1 | **killed by test** |

**Eight of eight die by test.** K2 was additionally caught at build; because the *test* also kills
it, no compiler-evading variant was required — the rule about build-only kills does not bite here.

### K5 and K6 are the ones that matter

They are the mutation form of this build's self-reliance point. Both are the sort of change that
looks like a small convenience:

- **K5** adds an `isProjection(v): v is Projection<unknown>` — five lines, obviously useful, and it
  lets any caller ask "is this a Projection?" and get an answer computed **from shape**. OBJ-34 is
  stateless, pure and height-taking, so shape says yes.
- **K6** adds `DifficultyAdvisory` to the member list — one line, and it reads like completing an
  enumeration someone forgot.

Either one readmits difficulty to the family, making δ consumable wherever a Projection is consumed,
and **defeats owner ruling DG-F1 without editing a line that mentions difficulty**. Nothing about
the rest of the suite would change colour. These two mutations are the only thing standing between
that ruling and a plausible-looking edit.

### Two checks that also had to be killed

The absence properties — `..._exports_no_projection_membership_predicate` and
`..._exposes_no_height_arithmetic` — were **green throughout the red phase**, because absence is
honestly true of a stub. They are pinned here instead: K5 and K8 add exactly what they forbid, and
both die. An absence property that no mutation attacks is a property nobody has tested.

---

## Round 4 — portability, after K7 round 3 RETURN (drift 4)

The gate ran the declared suite for the first time (CC-4 `"mechanical": true`, exit 1) and found
what two rounds of reading could not: **the suite was green only on the host that wrote it.** Two
defects, both platform, both in code the previous rounds had passed.

The mutations below attack the *rule*, not the two call sites. The build happens on Linux and the
gate runs on Windows; a fix that repaired only the instances would ship the same class at MOD-03.

| # | Mutation | Result | Killed by |
|---|---|---|---|
| N1 | `respell` returns the path unchanged | KILLED (test) | `test_windows_separators_are_respelled_as_forward_slashes` |
| N2 | `reported()` skips `respell`, returns `resolve()` raw | **SURVIVED** | — see below |
| N3 | Spawn check inverts its node-binary test (admits names, flags node) | KILLED (test) | 4 cases |
| N4 | Spawn check flags every spawn — passes by refusing everything | KILLED (test) | `test_spawning_the_node_binary_or_forking_is_admitted` |
| N5 | Spawn check text-matches `"npx"` instead of reading the argument | KILLED (test) | `test_any_command_name_is_a_defect_not_just_the_one_that_broke` |
| N6 | Spawn check ignores its exclude list | KILLED (test) | `test_the_real_tools_and_tests_trees_spawn_only_node` |
| N7 | Kernel test goes back to spawning `npx.cmd` | KILLED (test) | `test_the_real_tools_and_tests_trees_spawn_only_node` |
| N8 | External-isolation casts around the brand to report a raw host path | **SURVIVED** | — see below |
| N8b | External-isolation reports the raw host path, no cast | KILLED (tsc) | type error at `file` |
| N9 | Spawn check admits a shell command string | KILLED (test) | `test_handing_a_command_string_to_a_shell_is_a_portability_defect` |
| N10 | Spawn check narrows its file sweep to `.mjs`/`.cjs`, skipping the `.ts` tests | KILLED (test) | 3 cases |

**Nine of eleven killed. Two survive, for one reason, and it is disclosed rather than repaired.**

### The two survivors are the same survivor

On this host `path.sep` is already `/`, so `respell` is the identity and `reported(p)` is
extensionally equal to `resolve(p)`. **No test that can run here can tell them apart.** N2 deletes
the respelling at the one composition site; N8 casts past the brand. Both are invisible on Linux
and both die on any host where the separator differs — which is the host the gate runs on, and the
host neither can be run on from here.

This is the declared self-reliance point of `tools/checks/reported-path.ts`, and it is guarded by
construction rather than by test:

- `respell` — which does all the work — **is** tested on both arms, because the separator is passed
  in rather than read from the environment. A platform you cannot run is still a platform you can
  pass in, and that is the whole reason the function takes an argument it appears not to need.
- `reported` is one line, has no branches, and is the **only** place in the tree that asserts the
  `ReportedPath` brand. N8's cast is not a mutation of the guard; it is someone deliberately writing
  `as unknown as ReportedPath`, which defeats any brand in any language and is visible on sight.
- N8b — the *accidental* form, assigning a raw string — is killed by the compiler, and `tsc --noEmit`
  sits inside `test_command`, so it is killed wherever the gate runs.

Claiming these two as kills would be claiming a run this host cannot perform. K7 round 2 credited
disclosure of exactly this shape; the alternative is a battery that reports green by not looking.
