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

## Round 5 — the R-04 fix round, after K7 round 4 RETURN (drift 5)

Run on committed tree `9eb68b9` on the Windows gate host. Each mutation was killed or survived
under the declared `test_select` command. Every restore was verified with `git diff --quiet` plus
an empty `git status --porcelain`, and a failed restore would have aborted the run. Every selected
test was confirmed green on the clean tree first, so a kill cannot be a permanent error. P1–P3 are
the three K5 variants K7 named in CC-6.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| P1 | Kernel exports an arrow-const membership predicate | KILLED (test) | `test_kernel_exports_no_projection_membership_predicate` |
| P2 | Kernel re-exports a local predicate through `export { looks as shaped }` | KILLED (test) | same |
| P3 | Kernel predicate asserts a type ALIAS of `Projection` | KILLED (test) | same |
| P4 | Kernel exports height arithmetic as an arrow const | KILLED (test) | `test_kernel_exposes_no_height_arithmetic` |
| P5 | Kernel exports height arithmetic through an alias and a specifier | KILLED (test) | same |
| P6 | `AppendedFact.payload` loses `readonly` | KILLED (test) | `test_assigning_to_an_appended_fact_field_does_not_compile` |
| P7 | `mutate-fact` fixture broken for an UNRELATED reason (bad import path), DR-09's shape | KILLED (test) | same; the old `count > 0` passed this |
| P8 | `gate-without-onfail` fixture gains an unrelated error | KILLED (test) | `test_gate_without_on_fail_does_not_compile` |
| P9 | Export detector reverts to `getPropertyOfType` (its own first-run bug) | KILLED (test) | `test_the_membership_detector_sees_every_export_form` |
| P10 | Export detector sees function declarations only | KILLED (test) | same |
| P11 | Spawn resolver decides by the callee's local NAME | KILLED (test) | `test_a_renamed_import_does_not_hide_a_spawn` |
| P12 | Real tree gains an aliased spawn of a name | KILLED (test) | `test_the_real_tools_and_tests_trees_spawn_only_node` |
| P13 | Real tree gains an element-access spawn of a name | KILLED (test) | same |
| P14 | Spawn resolver admits every command as the Node binary | KILLED (test) | `test_spawning_a_command_name_is_a_portability_defect` |
| P15 | Python sweep merges function scopes (`ast.walk` semantics) | KILLED (test) | `test_python_launches_are_resolved_through_bindings` |
| P16 | Python sweep loses `getattr` resolution | KILLED (test) | same |
| P17 | `rederive.py` launches the split command again | KILLED (test) | `test_the_python_the_declared_commands_reach_spawns_only_node` |
| P18 | `reported()` skips `respell` | KILLED (test) | `test_the_constructor_absolutises_and_respells_the_host_separator` |
| P19 | `rederive_invoke` reverts to `npx tsx` | KILLED (test) | `test_the_declared_rederive_invoke_launches_node` |

**Nineteen of nineteen killed.** The first pass, on `d85974d`, killed seventeen. P15 survived for
want of a fixture that merging scopes would wrongly ADMIT (it only made the check stricter), and P19
survived because `rederive.py`'s runtime refusal runs only when a vector exists, which no module has
before MOD-04. Both were closed by test (`violating-sibling-scope.py`, and a guard on the declared
command), committed, and the whole battery re-run.

**P18 is round 4's N2.** It was disclosed then as unkillable because "on this host `path.sep` is
already `/`". On the gate's host it is killed. The disclosure was correct about Linux and is now
moot where it mattered.

## Round 6 — the R-06 fix round, after K7 round 5 RETURN (drift 5)

Run on committed tree `8d8376c` on the Windows gate host, with the same discipline as round 5:
every selected test green on the clean tree first, each mutation run under the declared
`test_select`, every restore verified against HEAD, and the run aborts on a failed restore. The
nineteen round-5 mutations (P1–P19) were re-run because the detectors under them were rewritten
(P11 re-planted at its new anchor in `spawn-resolve.mjs`), plus twenty-one new ones (Q1–Q21)
aimed at this round's fixes.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| P1–P3, P6–P19 | Round 5's mutations, re-run | KILLED (test), all 17 | as in round 5 |
| **P4** | `later = (a, b) => (a > b ? a : b)` exported | **Equivalent: not a defect under R-09** | it is a SELECTION, legal like `latest`; re-planted as P4b |
| **P5** | `gap(a: H, b: H): H { return a; }` exported via specifier | **Equivalent: not a defect under R-09** | it returns an input; re-planted as P5b |
| P4b | two heights in, a MANUFACTURED height out (`height(a + b)`) | KILLED (test) | `test_kernel_exposes_no_height_arithmetic` |
| P5b | manufactured height through an alias and a specifier | KILLED (test) | same |
| Q1 | `AppendedFact.author` loses `readonly` | KILLED (test) | `test_assigning_to_an_appended_fact_field_does_not_compile` |
| Q2 | `AppendedFact.at` loses `readonly` | KILLED (test) | same |
| Q3 | `refuse` dropped from the runtime kind list | KILLED (test) | `test_is_unknown_answers_whether_not_which` (also a `tsc` error: the `Record` misses a kind) |
| Q4 | Kernel exports a STRUCTURAL-shape predicate | KILLED (test) | `test_kernel_exports_no_projection_membership_predicate` |
| Q5 | Kernel exports a predicate four members deep | KILLED (test) | same |
| Q6 | Kernel exports a factory returning a predicate | KILLED (test) | same |
| Q7 | Kernel exports a delta (two heights → number) | KILLED (test) | `test_kernel_exposes_no_height_arithmetic` |
| Q8 | Kernel exports a bare unwrap (height → number), R-09 | KILLED (test) | same |
| Q9 | Kernel exports a successor | KILLED (test) | same |
| Q10 | Kernel exports a rest fold | KILLED (test) | same |
| Q11 | Selection test admits everything | KILLED (test) | `test_the_height_detector_sees_every_export_form` |
| Q12 | Selection test reads only a conditional's true branch | KILLED (test) | same (the disguised-selection fixture) |
| Q13 | Membership loses the SHAPE arm | KILLED (test) | `test_the_membership_detector_sees_every_export_form` |
| Q14 | Spawn resolver ignores the `shell` option | KILLED (test) | `test_shell_true_hands_any_command_to_a_shell` |
| Q15 | Spawn resolver loses the `Reflect.apply` arm | KILLED (test) | `test_call_apply_and_reflect_apply_do_not_hide_a_spawn` |
| Q16 | Python sweep forgets the asyncio launchers | KILLED (test) | `test_python_launches_are_resolved_through_bindings` |
| Q17 | Python sweep stops following module rebinding | KILLED (test) | same |
| Q18 | Isolation sweep loses the ImportEquals arm (WI-01) | KILLED (test) | `test_external_import_outside_ports_is_malformed` |
| Q19 | Isolation sweep reads `.ts` only again (WI-01) | KILLED (test) | same |
| Q20 | Fixture compiler discovers no `AppendedFact` members (vacuity) | KILLED (test) | `test_assigning_to_an_appended_fact_field_does_not_compile` |
| Q21 | Real tree gains a spawn through `.call` | KILLED (test) | `test_the_real_tools_and_tests_trees_spawn_only_node` |

**Forty planted, thirty-eight killed as planted. The two survivors are equivalent mutants under
the owner's ruling.** P4 and P5 were written in round 5 as "height arithmetic", but each returns
one of its own inputs. R-09 makes that a legal selection, so reporting them as survivors would
misdescribe the detector, and so would deleting them quietly. They were re-planted as the
manufacturing forms they were meant to be, and both died. That is the ruling working as stated:
the line moved, and the battery found exactly where.

## Round 7 — MOD-03 `catalog/`, before its first K7 gate

Run on committed tree `641baeb` on the Windows gate host, with the round-5 discipline (baseline
green, declared `test_select`, every restore verified against HEAD). The first pass, on
`ff52074`, **killed 15 of 19**. The four survivors were the ones predicted before the run,
behavioural holes rather than equivalent mutants:

- **R9** — the as-of read ignored *which unit*. Every test declared for a single unit.
- **R10 / R11** — a forged `ENGINE` entry shaped like a catalog act, appended to the SHARED
  record by any module, was read back as a HUMAN declaration or independence act. That is INV-PROV
  broken at runtime while HOOK-07 stays green at parse.
- **R14** — unit features were mutable, and "read-only" was only a comment.

Each was closed by a test (`test_a_declaration_answers_only_for_its_own_unit`,
`test_an_entry_not_authored_by_a_human_is_never_read_as_a_declaration`,
`test_independence_answers_only_for_a_human_act_on_its_own_unit`,
`test_unit_features_are_read_only`), committed, and the whole battery re-run:

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| R1 | `CurrencyOrder` accepts an empty list | KILLED (test) | `test_currency_order_refuses_an_empty_or_tied_order` |
| R2 | `CurrencyOrder` accepts a tie | KILLED (test) | same |
| R3 | `predecessors` includes the currency itself | KILLED (test) | `test_currency_order_answers_for_every_size` |
| R4 | a foreign currency gets `[]`, not a refusal | KILLED (test) | `test_a_currency_from_another_order_is_refused_not_answered` |
| R5 | `least()` is the most expensive | KILLED (test) | `test_currency_order_answers_for_every_size` |
| R6 | `declare` skips the level check | KILLED (test) | `test_an_unconfigured_level_is_refused_not_appended` |
| R7 | `declarationAt` returns the earliest, not the one in force | KILLED (test) | `test_redeclaration_never_rewrites_history` |
| R8 | `declarationAt` mints the wrong height | KILLED (test) | `test_human_authored_declaration_append_succeeds` |
| R9 | `declarationAt` ignores which unit | KILLED (test) | `test_a_declaration_answers_only_for_its_own_unit` |
| R10 | `declarationAt` accepts a non-HUMAN entry | KILLED (test) | `test_an_entry_not_authored_by_a_human_is_never_read_as_a_declaration` |
| R11 | `independenceAt` accepts a non-HUMAN entry | KILLED (test) | `test_independence_answers_only_for_a_human_act_on_its_own_unit` |
| R12 | `independenceAt` returns the earliest act | KILLED (test) | `test_independence_is_a_human_act_in_force_as_of_a_height` |
| R13 | `unit(id)` answers every id | KILLED (test) | `unit answers differently when units differs` (OS-12) |
| R14 | unit features returned mutable | KILLED (test) | `test_unit_features_are_read_only` |
| R15 | `declare` appends BEFORE checking the level | KILLED (test) | `test_an_unconfigured_level_is_refused_not_appended` |
| R16 | the catalog learns there are two | KILLED (test) | `test_the_number_two_appears_nowhere` |
| R17 | `Declaration` loses its brand | KILLED (test) | `test_declaration_from_derivation_is_malformed` |
| R18 | `declare` takes any author | KILLED (test) | `test_a_non_human_author_cannot_declare` |
| R19 | the record slot is not checked at construction (OS-1) | KILLED (test) | `refuses a record that does not offer append and readAsOf` (OS-12) |

**Nineteen of nineteen killed.**


### Supersession of round 7's R10 / R11 claim (2026-10-12, after K7 round 6)

Round 7 records R10/R11 as closing "INV-PROV broken at runtime". **That is not true, and the record
above is left as written.** The tests added there reject an entry that says `author: "ENGINE"`. K7
round 6 (E3) showed that an entry which simply says `author: "HUMAN"`, appended to the shared
record by any module, is still read back as a catalog act. The breach is open as **DR-18**. The two
tests remain correct for what they test: an honest non-HUMAN entry is rejected.

## Round 8 — MOD-03's fix round, after K7 round 6 RETURN (drift 5)

Run on committed tree `8242fd1` on the Windows gate host, with the round-5 discipline. Each
mutation disables one rule of one new checker, or plants a real violation in `src/`, and runs the
named test that rule exists to keep red.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| S1 | reads certify an entry at an unconfigured level again (R-12) | KILLED (test) | `test_an_entry_at_an_unconfigured_level_is_never_certified` |
| S2 | mint: any-flow rule off | KILLED (test) | `test_declaration_from_derivation_is_malformed` |
| S3 | mint: generic-launder rule off | KILLED (test) | same |
| S4 | mint: type-parameter-cast rule off (wrapped generics) | KILLED (test) | same |
| S5 | mint: type-guard rule off | KILLED (test) | same |
| S6 | mint: ts-directive rule off | KILLED (test) | same |
| S7 | forge: spread rule off | KILLED (test) | `test_only_the_catalog_builds_or_appends_a_catalog_entry` |
| S8 | forge: replay (append) rule off | KILLED (test) | same |
| S9 | forge: shorthand-kind rule off | KILLED (test) | same |
| S10 | surface: fabricated-height rule off | KILLED (test) | `test_no_operation_answers_the_current_declaration` |
| S11 | surface: held-state rule off | KILLED (test) | same |
| S12 | surface: free functions excluded from the returns rule | KILLED (test) | same (the module-cache fixture, added before this run because the free-function fixture was caught twice) |
| S13 | sc3: cardinality rule off | KILLED (test) | `test_the_number_two_appears_nowhere` |
| S14 | sc3: back to `.ts` only | KILLED (test) | same |
| S15 | brand lookup regresses to the first computed key (`[Symbol.iterator]`) | KILLED (test) | same (the conforming fixture goes red) |
| S16 | OS-1: default-argument rule off | KILLED (test) | `test_a_default_argument_is_flagged_on_a_parameter_and_in_a_destructuring` |
| S17 | OS-1: module constants matched by NAME, not symbol | KILLED (test) | `test_a_module_constant_read_is_resolved_by_symbol_not_name` |
| S18 | `src/` outside the catalog forges a catalog entry (planted) | KILLED (test) | `test_only_the_catalog_builds_or_appends_a_catalog_entry` |
| S19 | `src/` mints a Declaration by double assertion (planted) | KILLED (test) | `test_declaration_from_derivation_is_malformed` |
| S20 | the catalog exports a free function reading "now" (planted) | KILLED (test) | `test_no_operation_answers_the_current_declaration` |
| S21 | a catalog class gains a mutable cache (planted) | KILLED (test) | same |
| S22 | the catalog learns how many currencies there are (planted) | KILLED (test) | `test_the_number_two_appears_nowhere` |

**Twenty-two of twenty-two killed on the first pass.**
