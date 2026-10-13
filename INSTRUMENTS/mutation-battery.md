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

## Round 9 — the R-14 fix pass, after MOD-03's gate closed

Run on committed tree `d60b999` on the Windows gate host, with the round-5 discipline. Two
fixtures were added before the run, because the wrapper read was caught by two rules at once and
disabling either rule alone would have survived: `wrapper-read-plain/` isolates the wrapper rule,
and `module-cache-human/` isolates the HUMAN-needs-an-append rule.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| T1 | mint: overload signatures not flagged | KILLED (test) | `test_declaration_from_derivation_is_malformed` |
| T2 | mint: ambient declarations and `.d.ts` files not flagged | KILLED (test) | same |
| T3 | forge: the `kind` key decided by TEXT again (RD-13) | KILLED (test) | `test_only_the_catalog_builds_or_appends_a_catalog_entry` |
| T4 | forge: class fields / getters carrying a kind not flagged | KILLED (test) | same |
| T5 | surface: reads no longer followed through wrappers | KILLED (test) | `test_no_operation_answers_the_current_declaration` |
| T6 | surface: a HUMAN parameter admits without an append again | KILLED (test) | same |
| T7 | surface: field writability judged by mutator methods only | KILLED (test) | same |
| T8 | height: collection parameters not counted | KILLED (test) | `test_the_height_detector_sees_every_export_form` |
| T9 | height: object parameters not counted | KILLED (test) | same |
| T10 | height: Promise returns not unwrapped | KILLED (test) | same |
| T11 | height/shape: `undefined` not stripped (optional forms) | KILLED (test) | same |
| T12 | selection: an `undefined` branch no longer admitted (R-09) | KILLED (test) | `test_the_membership_detector_sees_every_export_form` (the conforming-selections control) |
| T13 | spawn: `.cts/.tsx/.jsx` dropped from the sweep | KILLED (test) | `test_every_loadable_extension_is_swept` |
| T14 | python: `import *` no longer binds launchers | KILLED (test) | `test_python_launches_are_resolved_through_bindings` |
| T15 | isolation: backtick specifiers no longer read | KILLED (test) | `test_external_import_outside_ports_is_malformed` |
| T16 | isolation: a computed specifier no longer refused | KILLED (test) | same |
| T17 | **a REGISTERED LIMIT closed silently** (forge treats a `string` kind as a catalog kind) | KILLED (test) | `test_only_the_catalog_builds_or_appends_a_catalog_entry` (the `limit-dynamic-kind` pin) |

**Seventeen of seventeen killed on the first pass.** T17 is the R-15 mechanism proving itself: a
change to what a detector claims to decide cannot happen silently, because the limit's pin turns
red and the scope statement has to be re-registered.

## Round 10 — MOD-05 `facts/` slice 1 (commitments, REF-06), before its K7 gate

Run on committed tree `cf5280a` on the Windows gate host, with the round-5 discipline: tree
clean before the run, baselines green, and every restore verified against HEAD. Each planting
also ran `tsc`, so that a kill made only by the compiler would show as "build only". None did.
C14–C16 plant the defect in REAL source rather than in a fixture: the owner-scoped rules
(BC-05-6) are tested where the code lives.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| C1 | zero in force answers `null`, not BOTTOM (cast past the compiler) | KILLED (test) | `test_no_commitment_folds_to_bottom_never_null` |
| C2 | two in force: the first is CHOSEN instead of `uncomputable` (R-20) | KILLED (test) | `test_two_effective_commitments_are_uncomputable_not_chosen` |
| C3 | two in force: the LATEST is chosen (the preference F2 forbids) | KILLED (test) | same |
| C4 | the invalidation reader is never asked (R-19) | KILLED (test) | `test_an_invalidated_commitment_is_not_in_force` |
| C5 | the reader is asked at the commitment's own height, not the read's | KILLED (test) | same |
| C6 | the fold ignores the currency | KILLED (test) | `test_a_commitment_answers_only_for_its_own_unit_and_currency` |
| C7 | the fold ignores the unit | KILLED (test) | same |
| C8 | a non-HUMAN entry is read as a commitment | KILLED (test) | `test_only_the_ledgers_own_human_entries_count` |
| C9 | a commitment minted on read at the wrong height (off by one) | KILLED (test) | `test_a_commitment_is_in_force_from_its_height_on` |
| C10 | `commit` appends twice | KILLED (test) | `test_each_commit_appends_exactly_one_entry` |
| C11 | `commit`'s author widened to any string (OBJ-31 closed at parse) | KILLED (test) | `test_a_non_human_author_cannot_commit` |
| C12 | `commit` takes the engine's reason, `basis?: unknown` (REF-06 on a real act) | KILLED (test) | `test_no_act_signature_accepts_diagnostic` |
| C13 | the invalidation slot is not checked at construction (OS-1) | KILLED (test) | the isolation test's declared-slots case |
| C14 | the CATALOG builds a commitment-kind entry, planted in `src/catalog/` | KILLED (test) | `test_only_the_catalog_builds_or_appends_a_catalog_entry` |
| C15 | the FACTS module builds a declaration-kind entry, planted in `src/facts/` | KILLED (test) | same |
| C16 | a Commitment minted by assertion in `src/catalog/`, outside its ledger | KILLED (test) | `test_declaration_from_derivation_is_malformed` |
| C17 | REF-06: acts no longer found to a fixed point (direct appends only) | KILLED (test) | `test_no_act_signature_accepts_diagnostic` |
| C18 | REF-06: an inline closure's append no longer belongs to its method | KILLED (test) | same |
| C19 | REF-06: a function type's RETURN no longer inspected | KILLED (test) | same |
| C20 | REF-06: a constrained type parameter judged by flag alone | KILLED (test) | same |
| C21 | REF-06: the class-field form dropped (RD-12) | KILLED (test) | same |
| C22 | **a REGISTERED LIMIT closed silently** (calls through an interface followed) | KILLED (test) | same (the `limit-call-through-port` pin) |
| C23 | forge: every kind's owner collapsed to "any ledger root", with a cross-ledger forge planted in `src/catalog/` | **SURVIVED** | — |

**C23 survived, and it was a real gap.** C14 and C15 prove the forge rule catches a cross-ledger
forge planted in `src/`, but nothing pinned the OWNER logic itself. With ownership collapsed,
the catalog could build commitments and every test stayed green, because no such code exists
in `src/` for a test to see. **Fix (`82b1fbd`):** fixtures under
`tests/fixtures/ledger-owners/src/<root>/` are judged AT the path they mirror. Each root builds
its own kind (conforming) and not the other's (violating). The forge test pins all four.

**Re-run on `82b1fbd`:**

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| C14 | as above | KILLED (test) | `test_only_the_catalog_builds_or_appends_a_catalog_entry` |
| C15 | as above | KILLED (test) | same |
| C23 | as above | KILLED (test) | same (the ownership pin) |
| C24 | ownership collapsed in the DETECTOR alone, with no `src/` plant | KILLED (test) | same (the ownership pin) |

**Twenty-four of twenty-four killed after one fix.** IR-44 (one tree for every check) is a
tooling fix with no automated test. It is verified by its own run: the false
`OS-12_no_isolation_test` disappeared. The patch script asserted that no bare `ls-files`
remained when it ran, but nothing in the repo stops one from returning. That is recorded as
unpinned, not as covered.

## Round 11 — MOD-05 `facts/` slice 2 (the draw context), before its K7 gate

Run on committed tree `594e28f` with the round-5 discipline; each planting also ran `tsc`, and
none was killed by the compiler alone. Before the run, two claims that no fixture pinned were
pinned (`5be9ce9`, `594e28f`), applying round 10's lesson: the element-key REFERENCE form of
the features reach, and NON-empty discovery verdicts. The misowned-ledger fixture's alias is
named `Commitment`, so a brand is pinned as its name AND its owner.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| D1 | a refused draw appends before refusing | KILLED (test) | `test_draw_without_declaration_is_refused` |
| D2 | another Unknown from the reader collapsed into the refusal | KILLED (test) | `test_another_unknown_from_the_reader_is_passed_through_not_collapsed` |
| D3 | the declaration read at a made-up "now", not the draw height (S-08) | KILLED (test) | `test_the_recorded_declaration_is_the_one_in_force_at_draw_time` |
| D4 | the draw height recorded instead of the declaration's height | **SURVIVED** | — |
| D5 | features stored by reference: the caller can still change the record | KILLED (test) | `test_features_are_recorded_as_given_and_frozen` |
| D6 | the scope replaced by the draw height (interpreted, not carried) | KILLED (test) | `test_scope_and_condition_are_carried_as_given` |
| D7 | the condition dropped | KILLED (test) | same |
| D8 | two labels: the first is CHOSEN | KILLED (test) | `test_two_labels_are_uncomputable_not_chosen` |
| D9 | a label for another draw counts | KILLED (test) | `test_a_label_for_another_draw_does_not_count` |
| D10 | the label read at a made-up "now": visible before its own height | KILLED (test) | `test_a_label_answers_from_its_own_height_on` |
| D11 | no label answers a default resolution instead of NoSubject | KILLED (test) | `test_an_unlabelled_draw_has_no_resolution_yet` |
| D12 | `label` does not append (minted at the context's height) | KILLED (test) | `test_no_operation_answers_the_current_declaration` (the surface rule, statically) |
| D13 | `drawsAsOf` ignores the unit | KILLED (test) | `test_draws_are_read_per_unit_as_of_a_height` |
| D14 | `drawsAsOf` mints at the wrong height (off by one) | KILLED (test) | `test_a_redeclaration_does_not_rewrite_a_recorded_draw` |
| D15 | the declarations slot is not checked at construction (OS-1) | KILLED (test) | the isolation test's declared-slots case |
| D16 | `label` takes the engine's reason, `basis?: unknown` (REF-06 on a new act) | KILLED (test) | `test_no_act_signature_accepts_diagnostic` |
| D17 | reach: destructuring no longer seen | KILLED (test) | `test_no_module_but_advisory_reads_unit_features` |
| D18 | reach: element-access references no longer seen (RD-13 sibling spelling) | KILLED (test) | same (the pre-battery element-key fixture) |
| D19 | reach: the owner exemption widened to every root | KILLED (test) | same |
| D20 | **a REGISTERED LIMIT closed silently** (reach decided by callee TEXT) | KILLED (test) | same (the `limit-cast-member` pin) |
| D21 | discovery: `unlisted` always empty | KILLED (test) | `test_every_appended_fact_kind_is_a_listed_ledger` (the non-empty pin) |
| D22 | discovery: ownership no longer checked | KILLED (test) | same |
| D23 | discovery: a brand matched by NAME alone, any file | KILLED (test) | same (the alias named `Commitment` in the catalog) |
| D24 | `fabricated`: back to innermost-function-only (IR-49's false positive returns) | KILLED (test) | `test_no_operation_answers_the_current_declaration` |
| D25 | `fabricated`: a captured LOCAL accepted as the caller's | KILLED (test) | same (the `closure-made-up-height` case) |

**D4 survived, and the gap was the test's design.** It drew exactly AT each declaration's own
height, so "the draw height" and "the declaration's height" were the same number, and
recording the wrong one was invisible. **Fix (`a968e65`):** draws are made strictly above each
declaration. **Re-run on `a968e65`:** D3 KILLED (test), D4 KILLED (test).

**Twenty-five of twenty-five killed after one fix.** D21–D23 would all have survived without
the pre-battery pins: a verdict asserted only as empty is not tested by a mutation that
empties it.

## Round 12 — MOD-05 `facts/` slice 3 (candidates), before MOD-05's K7 gate

Run on committed tree `038282c` with the round-5 discipline. Each planting also ran `tsc`, and
none was killed by the compiler alone. Before the run, three claims that no test would notice
breaking were pinned (`038282c`):

- a Commitment `from` at the least currency WHILE licensed (the license masked it);
- IR-55's passthrough of a non-"none" Unknown;
- BOTTOM stored as a fresh value, not the caller's mutable object.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| E1 | admission never asked | KILLED (test) | `test_an_unreachable_draw_appends_nothing_and_asks_no_one_else` |
| E2 | the signature asked before `from` is checked | KILLED (test) | `test_refusals_answer_in_order_and_later_deciders_are_not_asked` |
| E3 | the ceiling asked before the signature | KILLED (test) | same |
| E4 | every decider asked up front: an unreachable draw costs something | KILLED (test) | `test_an_unreachable_draw_appends_nothing_and_asks_no_one_else` |
| E5 | a second candidate append path (a backfill) inside `src/facts` | KILLED (test) | `test_each_ledger_kind_has_exactly_one_append_path` |
| E6 | `from` checked against the REQUESTED currency's fold, not the one below | KILLED (test) | `test_from_must_be_the_effective_commitment_immediately_below` |
| E7 | "immediately below" read as the LEAST currency | KILLED (test) | same |
| E8 | any commitment accepted as `from` (identity not compared) | KILLED (test) | `test_a_superseded_commitment_is_not_a_from` |
| E9 | the fold read at a made-up "now", not the append height | KILLED (test) | `test_no_operation_answers_the_current_declaration` (the surface rule, statically - no behavioural test sees it) |
| E10 | the license read at a made-up "now" | KILLED (test) | `test_bottom_from_needs_an_independence_license_at_the_least_currency` |
| E11 | a withdrawn license still counts | KILLED (test) | same |
| E12 | a Commitment accepted as `from` at the least currency | KILLED (test) | same (the pre-battery licensed case) |
| E13 | the fold's `uncomputable` collapsed into `malformed-from` (IR-55) | KILLED (test) | `test_an_unanswerable_from_check_passes_the_unknown_through` (pre-battery) |
| E14 | BOTTOM stored as the caller's own object | KILLED (test) | `test_a_bottom_from_is_recorded_as_a_fresh_value` (pre-battery) |
| E15 | the signature check sees the proposal WITHOUT its `from` | KILLED (test) | `test_the_signature_check_sees_the_whole_proposal_and_its_refusal_passes_through` |
| E16 | the ceiling never asked | KILLED (test) | `test_draw_beyond_the_scope_ceiling_is_refused_on_the_append_path` |
| E17 | the signature not recorded on the candidate | KILLED (test) | `test_a_good_candidate_is_appended_once_with_its_lineage` |
| E18 | the append height recorded as `from`, not the commitment's height | KILLED (test) | same |
| E19 | `candidatesAsOf` ignores the condition identity (S-09) | KILLED (test) | `test_candidates_are_read_by_condition_identity_as_of_a_height` |
| E20 | `derivedFrom` answers every candidate | KILLED (test) | `test_derived_from_answers_the_lineage` |
| E21 | `countsAsOf` drops the currencies with no draws | KILLED (test) | `test_counts_are_per_currency_in_order_never_summed` |
| E22 | `countsAsOf` answers running totals (summed) | KILLED (test) | same |
| E23 | the ceiling slot not checked at construction (OS-1) | KILLED (test) | the isolation test's declared-slots case |
| E24 | `appendCandidate`'s proposal opened to an engine note (REF-06) | KILLED (test) | `test_no_act_signature_accepts_diagnostic` |
| E25 | paths: inline closures no longer climbed to their member | KILLED (test) | `test_each_ledger_kind_has_exactly_one_append_path` |
| E26 | **a REGISTERED LIMIT closed silently** (an `unknown` entry read as a candidate) | KILLED (test) | same (the `limit-untyped-entry` pin) |

**Twenty-six of twenty-six killed on the first pass.** E9 is why slice 3 registered the injected
readers as reads: a fold read at a made-up height left every behavioural test green, and only the
static surface rule saw it. E12–E14 would have survived without the pre-battery pins. That is the
third round in a row where checking "what would no test notice?" before the run found the gaps
the run would otherwise have reported.

## Round 13 — MOD-05's fix round (R-31), before K7 round 9

Run on committed tree `5b7e653` with the round-5 discipline. Two pins were added before the run:
the strict height edge (a context AT the append height is this draw's), and the typed-helper
path residue, registered with a `limit-` fixture.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| F1 | the context check removed: any draw context binds | KILLED (test) | `test_the_bound_context_must_be_this_draws` |
| F2 | another unit's context accepted | KILLED (test) | same |
| F3 | another condition's context accepted | KILLED (test) | same |
| F4 | a context newer than the append height accepted | KILLED (test) | same |
| F5 | a context AT the append height refused (non-strict) | KILLED (test) | same (the pre-battery equal-height case) |
| F6 | the context checked AFTER `from` (R-31's order) | KILLED (test) | `test_refusals_answer_in_order_and_later_deciders_are_not_asked` |
| F7 | the candidate records the append height, not its context's (SEAM-10's key) | KILLED (test) | `test_a_candidate_identifies_the_declaration_it_was_drawn_under` |
| F8 | the context made optional, past the compiler with `!`: REF-05 at parse lost | KILLED (test), +tsc | `test_no_candidate_without_a_declaration_in_force` |
| F9 | the context check skipped for a BOTTOM `from` (DR-27's shape, re-entered) | KILLED (test) | `test_refusals_answer_in_order_and_later_deciders_are_not_asked` |
| F10 | `paths`: relays no longer followed | KILLED (test) | `test_each_ledger_kind_has_exactly_one_append_path` |
| F11 | `paths`: relays found one level deep only (no fixed point) | KILLED (test) | same (the two-level relay) |
| F12 | `paths`: a TYPED helper followed too (the registered residue silently changed) | KILLED (test) | same (the `limit-typed-helper` pin) |
| F13 | **a REGISTERED LIMIT closed silently** (act-signatures recurses library members) | KILLED (test) | `test_no_act_signature_accepts_diagnostic` (the `limit-library-member` pin) |
| F14 | `COMMIT_GATE` closed by something other than a HUMAN act | KILLED (test), +tsc | `test_commit_gate_states_obj_31` |

**Fourteen of fourteen killed on the first pass.** F8 and F14 also failed `tsc`, but each was
killed by its test as well, so neither rests on the compiler. After the run, the module-close
clause map added the SEAM-19 parse pin and IR-61.


## Round 14 — MOD-05 work items WI-07 / WI-08 (R-32, R-33), before MOD-04 opens

Run on committed tree `77ff1ea` with the round-5 discipline.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| G1 | the spent check removed: a context binds many candidates | KILLED (test) | `test_a_draw_context_binds_one_candidate` |
| G2 | spent checked AFTER `from` | KILLED (test) | same |
| G3 | spent checked BEFORE the mismatch check | KILLED (test) | same |
| G4 | the spent read at a made-up "now" | KILLED (test) | `test_no_operation_answers_the_current_declaration` (statically: `#candidatesWhere` is a read by the wrapper fixed point) |
| G5 | `paths`: wrapped relays no longer followed (the argument itself only) | KILLED (test) | `test_each_ledger_kind_has_exactly_one_append_path` |
| G6 | `paths`: shorthand properties no longer read as the parameter they name | KILLED (test) | same (the plain wrapped fixture) |

**Six of six killed on the first pass.** No plausible single mutation closes the registered
destructured-relay limit: following a binding element still leaves the caller's argument
without a kind at its top level. Its pin stands guard against a future widening.

## Round 15 — MOD-04 `reachability/` (the concept), WI-10, the three new detectors, VEC-01

Run on committed tree `2b923c5` with the round-5 discipline. Before the run, the unpinned-claims
sweep (MF-30) added five pins (`2b923c5`):

- commits in a loop are appends, not folds (the height discriminator);
- a classic indexed `for` loop;
- `.at(literal)` as a particular member;
- the brand never leaves the kernel;
- the CHEAPEST of two unmet currencies is the one named.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| H1 | 'unmet' read as NOT-BOTTOM only: uncomputable admitted (IR-42) | KILLED (test) | `test_an_uncomputable_predecessor_is_unmet_not_bottom` |
| H2 | only the currency immediately below is checked | KILLED (test) | `test_skipping_a_currency_does_not_reach_past_it` |
| H3 | the least currency special-cased as a cardinality test (the forbidden branch) | KILLED (test) | `test_the_number_two_appears_nowhere` |
| H4 | witnesses dropped from the evaluation | KILLED (test) | `test_one_evaluation_answers_the_verdict_and_its_witnesses` |
| H5 | the DEAREST unmet currency named | KILLED (test) | `test_draw_without_cheaper_commitment_is_refused` |
| H6 | a verdict cached by subject, not by height (stored across extensions) | KILLED (test) | `test_reachability_is_as_of_a_height` |
| H7 | the least currency made unreachable (the fold's identity broken) | KILLED (test), +tsc | `test_the_least_currency_is_reachable_by_the_empty_fold` |
| H8 | admit evaluates a second time | KILLED (test) | `test_admit_derives_from_one_evaluation_never_a_second` |
| H9 | a currency outside the order collapsed into 'unreachable' | KILLED (test) | `test_a_currency_outside_the_order_is_passed_through` |
| H10 | the gate refuses with a guard other than its ON_FAIL | KILLED (test) | `test_reachability_gate_states_obj_29` |
| H11 | asProjection accepts any name (DG-F1's door opened) | KILLED (test) | `test_only_a_listed_member_joins_the_family` |
| H12 | the brand exported from the kernel | KILLED (test) | `test_the_brand_never_leaves_the_kernel` |
| H13 | joins: the module check removed | KILLED (test) | `test_projection_joins_follow_the_s3_partition` |
| H14 | joins: spread re-branding no longer seen | KILLED (test) | `test_projection_joins_follow_the_s3_partition` |
| H15 | sole site: the height discriminator dropped (appends read as folds) | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| H16 | sole site: only for-of loops counted | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| H17 | branch: the one const hop dropped | KILLED (test) | `test_no_code_branches_on_a_particular_currency` |
| H18 | a REGISTERED LIMIT closed silently (recursion read as an iteration) | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| H19 | a second reachability check planted in MOD-05's real source | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| H20 | the harness's entry check removed (impl_sha could pin the wrong file) | KILLED (test), +tsc | `test_the_harness_refuses_a_wrong_entry` |
| H21 | the fold changed after VEC-01 was pinned (impl_sha no longer the fold's) | KILLED (test) | `test_vec_01_re_derives_from_the_fold` |

**Twenty-one of twenty-one killed on the first pass.** Three of them would have survived without
the pre-battery pins:

- H5, the dearest unmet currency named: no test had two unmet;
- H12, the brand exported;
- H15, the height discriminator dropped.

H3, the least currency special-cased as a cardinality test, is caught by SC-3's existing rule,
written for MOD-03, now guarding MOD-04's "no per-currency branch". H19 plants a second
reachability check in MOD-05's REAL source, and the sole-site rule sees it there. H21 shows that
VEC-01's provenance is live: changing the fold by one comment character breaks its `impl_sha`.

## Round 16 — MOD-04's fix round (R-38), before K7 round 11

Run on committed tree `129d7b3` with the round-5 discipline. Before the run, four claims of the fix
that no fixture pinned were pinned:

- numeric-keyed object destructuring;
- `.apply` and `.bind` joins;
- Map iteration;
- a commitment-returning reader that closes over its height, found only through the fixed point.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| I1 | branch: binding elements no longer followed (DR-30 reopened) | KILLED (test) | `test_no_code_branches_on_a_particular_currency` |
| I2 | branch: numeric-keyed object destructuring dropped | KILLED (test) | `test_no_code_branches_on_a_particular_currency` |
| I3 | branch: 'the order' widened back to ANY Currency collection (data pairs flagged) | KILLED (test) | `test_no_code_branches_on_a_particular_currency` |
| I4 | branch: the order's one const hop dropped | KILLED (test) | `test_no_code_branches_on_a_particular_currency` |
| I5 | sole site: iterating owners narrowed back to Array | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| I6 | sole site: the reader fixed point removed | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| I7 | sole site: a reader handed by reference no longer seen | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| I8 | a REGISTERED LIMIT closed silently (any helper return type made a reader) | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| I9 | joins: generic launder no longer seen | KILLED (test) | `test_projection_joins_follow_the_s3_partition` |
| I10 | joins: only .call followed (apply / bind dropped) | KILLED (test) | `test_projection_joins_follow_the_s3_partition` |
| I11 | joins: Reflect.apply no longer followed | KILLED (test) | `test_projection_joins_follow_the_s3_partition` |
| I12 | REF-03 on the orchestrated path: admission asked after the signature (cost incurred) | KILLED (test) | `test_draw_without_cheaper_commitment_is_refused_on_the_orchestrated_path` |

**Twelve of twelve killed on the first pass.** I2, I10 and I5 (for Map) would have survived
without the pre-battery pins. I3 shows the narrowing to the LOADED order is load-bearing: widened
back to any Currency collection, the conforming data pair is flagged.

## Round 17 — MOD-04 work items WI-11..WI-14 (R-39), after its gate closed

Run on committed tree `b8cef86` with the round-5 discipline. Before the run, the sweep on this
fix's own claims (MF-30, MF-34) pinned five claimed spellings, and corrected one fixture of mine
that was not a limit: a GENERIC user higher-order function is decided by the launder rule.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| J1 | branch: a numeric-STRING key no longer a position | KILLED (test) | `test_no_code_branches_on_a_particular_currency` |
| J2 | branch: computed keys no longer resolved | KILLED (test) | `test_no_code_branches_on_a_particular_currency` |
| J3 | branch: the destructuring consumes the hop again (DR-33's k7-p3) | KILLED (test) | `test_no_code_branches_on_a_particular_currency` |
| J4 | branch: widening on the currency side no longer stripped | KILLED (test) | `test_no_code_branches_on_a_particular_currency` |
| J5 | branch: the template spelling dropped | KILLED (test) | `test_no_code_branches_on_a_particular_currency` |
| J6 | branch: any string treated as particular (data compared to data flagged) | KILLED (test) | `test_no_code_branches_on_a_particular_currency` |
| J7 | joins: the receiver judged by symbol only (DR-34 reopened) | KILLED (test) | `test_projection_joins_follow_the_s3_partition` |
| J8 | joins: asProjection as a LIBRARY argument no longer seen | KILLED (test) | `test_projection_joins_follow_the_s3_partition` |
| J9 | joins: any-flow no longer seen | KILLED (test) | `test_projection_joins_follow_the_s3_partition` |
| J10 | joins: user type guards no longer seen | KILLED (test) | `test_projection_joins_follow_the_s3_partition` |
| J11 | a REGISTERED LIMIT closed silently (asProjection as ANY function's argument) | KILLED (test) | `test_projection_joins_follow_the_s3_partition` |
| J12 | sole site: readers handed by reference no longer judged by TYPE | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| J13 | sole site: a .bind's receiver no longer consulted | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| J14 | sole site: a boolean-or-nullish helper no longer a reader | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| J15 | a REGISTERED LIMIT closed silently (any callback treated as an iteration) | KILLED (test) | `test_reachability_is_decided_in_one_place` |
| J16 | DR-36's shape re-created for REF-05: a second title containing its §5 name | KILLED (test) | `test_every_s5_name_of_a_built_module_selects_exactly_one_case` |
| J17 | a §5 name selecting NO case (the named test renamed away) | KILLED (test) | `test_every_s5_name_of_a_built_module_selects_exactly_one_case` |

**Seventeen of seventeen killed on the first pass.** J11 and J15 close a registered limit
silently, and each dies on its pin. J16 re-creates DR-36's collision for a DIFFERENT §5 name, and
J17 renames a §5 test away to nothing; the new rule-based test catches both, which a test fixing
only REF-03's title would not.

## Round 18 — MOD-12 slice A: the MOD-05 work items (R-40, R-41)

Run on committed tree `8bb9a69` with the round-5 discipline: every restore was verified against
HEAD, and the tree was clean after the run. Before the run, the sweep on slice A's own claims
(MF-30) found four that were unpinned, and pinned each: inheritance agreed BY HEIGHT, while a
successor is in force; an uncomputable donor passed through on the inheritance branch; a
look-alike candidate does not compile (`commit-a-look-alike.ts`, TS2345 on the brand); the
reader reads what the fold reads (a forged acceptance is not read). L4, L5 and L11 would have
SURVIVED without those pins.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| L1 | inheritance: the own-unit check dropped | KILLED (test) | `test_an_inherited_from_must_be_another_units_commitment_in_force` |
| L2 | inheritance: 'own' decided by the (unit, currency) pair, not the unit | KILLED (test) | `test_an_inherited_from_must_be_another_units_commitment_in_force` |
| L3 | inheritance: the fold not asked - the caller's commitment trusted | KILLED (test) | `test_an_inherited_from_must_be_another_units_commitment_in_force` |
| L4 | inheritance: in force, but not agreed BY HEIGHT | KILLED (test) | `test_an_inherited_from_must_be_another_units_commitment_in_force` |
| L5 | inheritance: an uncomputable donor collapsed into malformed-from | KILLED (test) | `test_an_unanswerable_from_check_passes_the_unknown_through` |
| L6 | inheritance removed (R-26 as first built) | KILLED (test) +tsc | `test_a_least_currency_candidate_may_inherit_from_another_units_commitment` |
| L7 | inheritance: the fold asked at the CANDIDATE's currency, not the donor's | KILLED (test) | `test_a_least_currency_candidate_may_inherit_from_another_units_commitment` |
| L8 | commit records the candidate's draw context, not the candidate | KILLED (test) | `test_each_commit_appends_exactly_one_entry` |
| L9 | recognizer: a commitment naming no candidate read (R-41 clause dropped) | KILLED (test) | `test_only_the_ledgers_own_human_entries_count` |
| L10 | recognizer: a non-HUMAN entry read as a commitment | KILLED (test) | `test_only_the_ledgers_own_human_entries_count` |
| L11 | reader: a second, looser commitment recognizer - no HUMAN clause (IR-76's divergence) | KILLED (test) | `test_the_lineage_reader_walks_derived_from_and_accepted_by` |
| L12 | reader: heights off by one (position, not position + 1) | KILLED (test) | `test_the_lineage_reader_walks_derived_from_and_accepted_by` |
| L13 | reader: derivedFrom matches every candidate that has a commitment as its from | KILLED (test) | `test_the_lineage_reader_walks_derived_from_and_accepted_by` |
| L14 | reader: the record slot not checked at construction (OS-1) | KILLED (test) | `LineageReader in isolation` |

**Fourteen of fourteen killed on the first pass.** L6 also fails `tsc`, and the test kills it.
L11 is IR-76's divergence: a reader with its own looser recognizer. Only the pin added in the
sweep kills it.

## Round 19 — MOD-12 `lineage/`: slices B and C, one rung (R-43..R-48)

Run on committed tree `b267347` with the round-5 discipline: every restore was verified against
HEAD, and the tree was clean after the run. Before the run, the sweep (MF-30, MF-34) pinned five
claims and spellings: REF-04's omission written as `undefined` and spread out, with the CAST
registered as a limit (IR-85); same height in BOTH directions; every invalidation counting, in
height order; the invalidation recognizer; BOTTOM as a fresh value in the material. M14 and
M22..M26 would have survived without those pins.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| M1 | sign: the seed left out of the encoding | KILLED | `test) (test_a_signature_is_the_digest_of_its_whole_material` |
| M2 | sign: the lineage left out of the encoding (REF-04 at runtime) | KILLED | `test) (test_signature_without_lineage_digest_is_refused` |
| M3 | lineage digest: the accepted candidate left out (R-41) | KILLED | `test) (test_a_signature_binds_the_commitment_it_derives_from` |
| M4 | lineage digest: the author left out | KILLED | `test) (test_a_signature_binds_the_commitment_it_derives_from` |
| M5 | material: BOTTOM is the caller's object, not a fresh value | KILLED | `test) (test_a_bottom_from_signature_covers_the_bottom_marker` |
| M6 | material: the lineage is never computed (always BOTTOM) | KILLED | `test) (test_signature_without_lineage_digest_is_refused` |
| M7 | check: always VERIFIED | KILLED | `test) (test_signature_without_lineage_digest_is_refused` |
| M8 | sign: the digest port bypassed (MOD-12 chooses the 'digest') | SURVIVED, then KILLED (test) on re-run at `958b688` | `test_a_signature_is_the_digest_of_its_whole_material` |
| M36 | OBJ-32's descriptor: closed by a human act | KILLED | `test) (test_signature_gate_states_obj_32` |
| M9 | closure: one level only (no fixed point) | KILLED | `test) (test_the_scope_is_the_closure_over_from_through_acceptances` |
| M10 | closure: acceptances not followed (R-42) | KILLED | `test) (test_the_scope_is_the_closure_over_from_through_acceptances` |
| M11 | count: the commitments, not the candidates | KILLED | `test) (test_the_scope_is_the_closure_over_from_through_acceptances` |
| M12 | closure: not in append order | KILLED | `test) (test_the_scope_is_the_closure_over_from_through_acceptances` |
| M13 | closure: read as of the commitment's own height, not the caller's | KILLED | `test) (test_the_scope_is_the_closure_over_from_through_acceptances` |
| M14 | REF-07: same height in ONE direction only (a later display passes) | KILLED | `test) (test_append_before_scope_derivation_is_refused` |
| M15 | REF-07: no height check at all | KILLED | `test) (test_append_before_scope_derivation_is_refused` |
| M16 | display: the renderer never called | KILLED | `test) (test_an_invalidation_is_one_human_append_after_its_display` |
| M17 | display: derived at the commitment's height, not the caller's | KILLED | `test) (test_an_invalidation_is_one_human_append_after_its_display` |
| M35 | invalidate: scopeAt recorded from the wrong field | KILLED | `test) (test_an_invalidation_is_one_human_append_after_its_display` |
| M18 | invalidated set: K itself left out | KILLED | `test) (test_what_is_invalidated_as_of_a_height` |
| M19 | invalidated set: the frozen bound removed (the scope grows after display) | KILLED | `test) (test_the_scope_is_frozen_where_it_was_displayed` |
| M20 | invalidated set: the frozen bound inverted | KILLED | `test) (test_what_is_invalidated_as_of_a_height` |
| M21 | invalidated set: born superseded dropped (R-46) | KILLED | `test) (test_what_is_invalidated_as_of_a_height` |
| M22 | invalidated set: only the first invalidation counts | KILLED | `test) (test_every_invalidation_counts_and_only_an_invalidation_is_read` |
| M23 | invalidated set: not in height order | KILLED | `test) (test_every_invalidation_counts_and_only_an_invalidation_is_read` |
| M24 | recognizer: a non-HUMAN invalidation read | KILLED | `test) (test_every_invalidation_counts_and_only_an_invalidation_is_read` |
| M25 | recognizer: an invalidation naming no scope height read | KILLED | `test) (test_every_invalidation_counts_and_only_an_invalidation_is_read` |
| M26 | recognizer: an invalidation naming no commitment read | KILLED | `test) (test_every_invalidation_counts_and_only_an_invalidation_is_read` |
| M27 | isInvalidated: a second rule (K only) diverging from the set | KILLED | `test) (test_what_is_invalidated_as_of_a_height` |
| M28 | fixtures: the two-directory list again (lineage's never compiled) | KILLED | `test) (test_signature_without_lineage_digest_is_refused` |
| M29 | mint: DisplayedScope unprotected (IR-79) | KILLED | `test) (test_declaration_from_derivation_is_malformed` |
| M30 | ledgers: src/lineage unlisted | KILLED | `test) (test_every_appended_fact_kind_is_a_listed_ledger` |
| M31 | MOD-05 imports MOD-12: a type import | KILLED | `test) (test_the_candidate_append_asks_the_signature_gate_hook_04` |
| M32 | MOD-05 imports MOD-12: a re-export from its surface | KILLED | `test) (test_the_candidate_append_asks_the_signature_gate_hook_04` |
| M33 | MOD-05 imports MOD-12: an import TYPE expression | KILLED | `test) (test_the_candidate_append_asks_the_signature_gate_hook_04` |
| M34 | harness: the 'without' signature computed WITH the lineage | KILLED | `test) (test_vec_05_re_derives_from_the_signature_gate` |

**Thirty-five of thirty-six on the first pass; M8 survived.** The test claimed "the digest is the
PORT's", but it compared two gates over two DIFFERENT materials. Each material's lineage is
digested by its own gate's port, so the signatures differed from the lineage alone, and a `sign`
that bypassed the port passed. The isolation test, which signs ONE material under two ports, would
have killed it, but the battery names the test that claims the property. The claim is now exact:
the same material under the other port is that port's digest of the same bytes. Committed as
`958b688`; re-run, M8 is KILLED. **36 / 36.** M31..M33 are MF-34's spellings of "MOD-05 imports
MOD-12" (a type import, a re-export, an import-type expression); all are resolved and killed.

## Round 20 — R-51's fix-now items, sized to the change (R-50)

On `ad33e1a`; restores verified.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| N1 | DR-37 undone below the least currency: agreement by height alone | KILLED (test) | `test_a_from_is_the_recorded_commitment_not_a_copy` |
| N2 | DR-37 undone on the inheritance branch | KILLED (test) | `test_a_from_is_the_recorded_commitment_not_a_copy` |
| N3 | DR-41: the closure ordered backwards | KILLED (test) | `test_the_scope_is_the_closure_over_from_through_acceptances` |
| N4 | DR-41: the invalidated set ordered backwards | KILLED (test) | `test_every_invalidation_counts_and_only_an_invalidation_is_read` |

**4 / 4.** MOD-12's gate is closed by owner triage (R-51).

## Round 21 — MOD-06 `condition/`, sized to its claims (R-50)

On `3da66a6`; restores verified. P13 (Chains' least-currency check dropped) was not planted: R-26 makes it an equivalent mutant (an above-least candidate derives only from the same unit).

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| P1 | identity: object keys not sorted | KILLED | `test) (test_a_condition_identity_is_the_digest_of_the_whole_input_set` |
| P2 | identity: a nested record's components dropped | KILLED | `test) (test_a_condition_identity_is_the_digest_of_the_whole_input_set` |
| P3 | identity: list order normalized away | KILLED | `test) (test_a_condition_identity_is_the_digest_of_the_whole_input_set` |
| P4 | identity: the digest port bypassed | KILLED | `test) (test_a_condition_identity_is_the_digest_of_the_whole_input_set` |
| P5 | revision recognizer: a non-HUMAN revision read | KILLED | `test) (test_a_revision_sets_the_condition_in_force` |
| P6 | condition in force: the FIRST revision, not the last | KILLED | `test) (test_a_revision_sets_the_condition_in_force` |
| P7 | HOOK-06 removed | KILLED | `test) (test_an_assembly_of_mixed_conditions_is_rejected_hook_06` |
| P8 | closure: a revision BEFORE the first member closes | KILLED | `test) (test_a_sample_closes_by_a_revision_or_a_commitment_whichever_is_first` |
| P9 | closure: a revision naming the SAME condition closes | KILLED | `test) (test_a_sample_closes_by_a_revision_or_a_commitment_whichever_is_first` |
| P10 | closure: a revision wins even when an acceptance came first | KILLED | `test) (test_a_sample_closes_by_a_revision_or_a_commitment_whichever_is_first` |
| P11 | samplesFor: a refused assembly skipped, not passed through | KILLED | `test) (test_an_assembly_of_mixed_conditions_is_rejected_hook_06` |
| P12 | chains: a commitment not in force makes an edge | KILLED | `test) (test_chains_are_maximal_paths_of_inheriting_units` |
| P14 | chains: paths stop at the first edge (not maximal) | KILLED | `test) (test_chains_are_maximal_paths_of_inheriting_units` |
| P15 | R-56 exception widened from the declaration to the whole file | KILLED | `test) (test_reachability_is_decided_in_one_place` |
| P16 | lineage reader: commitmentsAsOf reads a non-HUMAN commitment | KILLED | `test) +tsc (test_the_lineage_reader_reads_every_candidate_and_commitment` |

**15 / 15.**

## Round 22 — R-61's fix-now items, sized to the change (R-50)

On `52a508d`; restores verified.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| Q1 | DR-42 undone: an uncomputable fold read as no edge | KILLED (test) | `test_chains_surface_the_folds_unknown` |
| Q2 | DR-42 undone for the order: its refusal read as not-least | KILLED (test) | `test_chains_surface_the_folds_unknown` |
| Q3 | DR-43 undone: numbers through JSON again | KILLED (test) | `test_a_condition_identity_is_the_digest_of_the_whole_input_set` |
| Q4 | DR-43 half-done: -0 written as 0 | KILLED (test) | `test_a_condition_identity_is_the_digest_of_the_whole_input_set` |

**4 / 4.** MOD-06's gate is closed by owner triage (R-61).

## Round 23 — MOD-07 `observation/`, sized to its claims (R-50)

On `677b0e8`; restores verified.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| B1 | score: a non-finite number becomes a Score | KILLED | `test) (test_a_score_is_any_finite_number` |
| B2 | isAbsent: never true | KILLED | `test) (test_an_observation_is_read_component_by_component` |
| B3 | scoredComponents: ABSENT zeroed, not omitted | KILLED | `test) (test_all_absent_vector_is_accepted_and_stored` |
| B4 | observe: an unknown component accepted | KILLED | `test) (test_an_observation_states_every_configured_component` |
| B5 | observe: a missing component accepted | KILLED | `test) (test_an_observation_states_every_configured_component` |
| B6 | observe: recorded in the given order, not the configured one | KILLED | `test) (test_an_observation_states_every_configured_component` |
| B7 | observe: an Undischargeable component scored later | KILLED | `test) (test_the_latest_observation_is_in_force` |
| B8 | observationOf: the first, not the latest | KILLED | `test) (test_the_latest_observation_is_in_force` |
| B9 | recognizer: an entry with no components read | KILLED | `test) +tsc (test_the_latest_observation_is_in_force` |
| B10 | authorOf: the fact's author, not the component's | KILLED | `test) (test_an_observation_is_read_component_by_component` |
| B11 | observe: the caller's ABSENT kept, not a fresh copy | KILLED | `test) (test_an_observation_states_every_configured_component` |

**11 / 11.**

## Correction note (R-67, DR-49): rounds 19, 21 and 23's "Killed by" column

Those tables were transcribed by a parser that split `KILLED (test) (test_name)` at the FIRST parenthesis, so each "Result" cell reads `KILLED` and each "Killed by" cell reads `` `test) (test_name` ``. Read the result as `KILLED (test)` (`+tsc` where the cell shows it), and the killing test as the name after `(`. The rows are left as written; the verdicts they record are unchanged. Later tables are parsed by the full line pattern.

## Round 24 — R-67's fix-now item (DR-46), sized to the change (R-50)

On `3b02b49`; restores verified.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| D1 | read seam: the component count not checked | KILLED (test) | `test_only_complete_well_formed_vectors_are_read` |
| D2 | read seam: names and order not checked | KILLED (test) | `test_only_complete_well_formed_vectors_are_read` |
| D3 | read seam: a component's author not required | KILLED (test) | `test_only_complete_well_formed_vectors_are_read` |
| D4 | read seam: a non-finite number read as a score | KILLED (test) | `test_only_complete_well_formed_vectors_are_read` |
| D5 | read seam: any object read as ABSENT | KILLED (test) | `test_only_complete_well_formed_vectors_are_read` |
| D6 | read seam: any discharge accepted | KILLED (test) | `test_only_complete_well_formed_vectors_are_read` |

**6 / 6.** MOD-07's gate is closed by owner triage (R-67).

## Round 25, first pass — MOD-08 on `29b61c8`: E3 SURVIVED

12 / 13. E3 (no canonical order) survived `test_dispersion_depends_on_the_multiset_alone`: the test's second order, the reverse of the first, happens to sum to the same bits, so the claim "bit for bit, whatever the order" was pinned by an order that could not show the difference. The test now uses an order whose plain sum differs in the last bit; the battery re-runs in full on that commit, and only that record goes to battery_complete@1. (An earlier attempt on `f61ad1b` aborted after E1 because the owner's store appeared mid-run: the verified-restore check stopped it, as it should.)

## Round 25 — MOD-08 `statistics/`, sized to its claims (R-50), re-run in full after E3's pin

On `3e0bd46`; restores verified.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| E1 | BC-08-1 / REF-08: below THREE scored members, Undetermined(AE-3) | KILLED (test) | `test_dispersion_below_floor_returns_undetermined` |
| E2 | R-63: the SAMPLE standard deviation (n - 1) | KILLED (test) | `test_dispersion_below_floor_returns_undetermined` |
| E3 | BC-08-2 / VEC-03 rule iii: one canonical order, so the multiset alone decides | KILLED (test) | `test_dispersion_depends_on_the_multiset_alone` |
| E4 | BC-08-3 / rule iv: an ABSENT component contributes nothing | KILLED (test) | `test_only_scored_members_count_toward_the_floor` |
| E5 | BC-08-3: an unobserved member contributes nothing | KILLED (test) | `test_only_scored_members_count_toward_the_floor` |
| E6 | BC-08-7: an observation source's Unknown other than NoSubject is the answer | KILLED (test) | `test_the_samples_unknown_propagates_as_itself` |
| E7 | BC-08-4 / R-65: a sample closed by a revision is void | KILLED (test) | `test_a_revised_sample_is_void_for_statistics` |
| E8 | BC-08-4 / J3: a sample closed by a COMMITMENT is still measured | KILLED (test) | `test_a_revised_sample_is_void_for_statistics` |
| E9 | BC-08-5 / OBJ-21: location needs no floor | KILLED (test) | `test_location_is_the_mean_and_takes_no_threshold` |
| E10 | BC-08-3 / BC-08-5: the centre of nothing is NoSubject, not 0 | KILLED (test) | `test_only_scored_members_count_toward_the_floor` |
| E11 | BC-08-1: available tests the floor | KILLED (test) | `test_dispersion_below_floor_returns_undetermined` |
| E12 | BC-08-7 / SEAM-12: the sample's Unknown propagates as itself | KILLED (test) | `test_the_samples_unknown_propagates_as_itself` |
| E13 | IR-100: location is void for a revised sample | KILLED (test) | `test_a_revised_sample_is_void_for_statistics` |

**13 / 13.** The schema record is `INSTRUMENTS/battery-records/MOD-08-round-25.json`; it goes to battery_complete@1 (RD-28).

## Round 25, final — MOD-08 on the deterministic manifest (IR-101)

On `29a638e`; restores verified.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| E1 | BC-08-1 / REF-08: below THREE scored members, Undetermined(AE-3) | KILLED (test) | `test_dispersion_below_floor_returns_undetermined` |
| E2 | R-63: the SAMPLE standard deviation (n - 1) | KILLED (test) | `test_dispersion_below_floor_returns_undetermined` |
| E3 | BC-08-2 / VEC-03 rule iii: one canonical order, so the multiset alone decides | KILLED (test) | `test_dispersion_depends_on_the_multiset_alone` |
| E4 | BC-08-3 / rule iv: an ABSENT component contributes nothing | KILLED (test) | `test_only_scored_members_count_toward_the_floor` |
| E5 | BC-08-3: an unobserved member contributes nothing | KILLED (test) | `test_only_scored_members_count_toward_the_floor` |
| E6 | BC-08-7: an observation source's Unknown other than NoSubject is the answer | KILLED (test) | `test_the_samples_unknown_propagates_as_itself` |
| E7 | BC-08-4 / R-65: a sample closed by a revision is void | KILLED (test) | `test_a_revised_sample_is_void_for_statistics` |
| E8 | BC-08-4 / J3: a sample closed by a COMMITMENT is still measured | KILLED (test) | `test_a_revised_sample_is_void_for_statistics` |
| E9 | BC-08-5 / OBJ-21: location needs no floor | KILLED (test) | `test_location_is_the_mean_and_takes_no_threshold` |
| E10 | BC-08-3 / BC-08-5: the centre of nothing is NoSubject, not 0 | KILLED (test) | `test_only_scored_members_count_toward_the_floor` |
| E11 | BC-08-1: available tests the floor | KILLED (test) | `test_dispersion_below_floor_returns_undetermined` |
| E12 | BC-08-7 / SEAM-12: the sample's Unknown propagates as itself | KILLED (test) | `test_the_samples_unknown_propagates_as_itself` |
| E13 | IR-100: location is void for a revised sample | KILLED (test) | `test_a_revised_sample_is_void_for_statistics` |

**13 / 13.** Schema record `INSTRUMENTS/battery-records/MOD-08-round-25.json`, manifest `sha256:96d0c9d8…`, handed to battery_complete@1.

## Round 26 — MOD-09 `calibration/`, sized to its claims (R-50)

On `cabe897`; restores verified.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| C1 | REF-11: an empty Accepted is no-bar on the population branch; the rule is not consulted | KILLED (test) | `test_bar_with_empty_population_returns_bottom` |
| C2 | REF-11: an empty PassedOver is no-bar on the population branch | KILLED (test) | `test_bar_with_empty_population_returns_bottom` |
| C3 | R-69: the rule's no-bar is the answer as given, with the rule's own cause | KILLED (test) | `test_the_injected_rule_decides_separation` |
| C4 | OBJ-22: θ comes with the sample size behind it - both populations' scored members | KILLED (test) | `test_the_injected_rule_decides_separation` |
| C5 | AE-5: the rule is handed Accepted's scores, then PassedOver's | KILLED (test) | `test_the_injected_rule_decides_separation` |
| C6 | HOOK-08: PassedOver's own exclusion count rides on every return | KILLED (test) | `test_exclusion_counts_present_on_both_populations` |
| C7 | HOOK-03 / REF-12: θ is a branded Threshold; a plain number is not one | KILLED (test) +tsc | `test_threshold_assignment_is_malformed` |
| C8 | REF-13 / X21: an invalidated commitment no longer accepts its candidate | KILLED (test) | `test_invalidated_commitment_moves_to_passed_over` |
| C9 | SEAM-10: the level is the declaration recorded at draw time, not the current one | KILLED (test) | `test_membership_reads_the_declaration_recorded_at_draw_time` |
| C10 | One bar per level: levels are never merged | KILLED (test) | `test_membership_reads_the_declaration_recorded_at_draw_time` |
| C11 | OBJ-23: a member of an open sample is in neither population | KILLED (test) | `test_passed_over_is_read_from_closed_samples` |
| C12 | SEAM-23: a sample closed by a revision contributes to PassedOver | KILLED (test) | `test_passed_over_is_read_from_closed_samples` |
| C13 | R-70: an ABSENT component is excluded, never scored | KILLED (test) | `test_exclusion_counts_present_on_both_populations` |
| C14 | SEAM-09 / ST-F2: an exclusion is counted on the side it would have joined | KILLED (test) | `test_exclusion_counts_present_on_both_populations` |
| C15 | an observation source's Unknown other than NoSubject is the answer, never 'unobserved' | KILLED (test) | `test_populations_are_computed_as_of_a_height` |
| C16 | OBJ-23: each population reads in candidate-height order | KILLED (test) | `test_passed_over_is_read_from_closed_samples` |

**16 / 16.** Schema record `INSTRUMENTS/battery-records/MOD-09-round-26.json`, manifest `sha256:c796e270…`, handed to battery_complete@1. A first pass aborted after C4 on a console-encoding error in the runner (cp1252 could not print "θ"), restores verified; this is the full re-run.

## Round 27 — MOD-10 `diagnostic/`, and MOD-05's R-76 work item, each sized to its claims (R-50)

On `6de9daa`; restores verified.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| G1 | MOD-10: VEC-04 / OBJ-42: one withheld entry per absent axis, carried in the value | KILLED (test) | `test_the_diagnostic_is_two_independent_axes` |
| G2 | MOD-10: R-73: n is the scored members behind the spread, not the sample's size | KILLED (test) | `test_the_dispersion_axis_is_the_measured_spread` |
| G3 | MOD-10: SEAM-12: the dispersion source's own Unknown is the cause, never re-worded | KILLED (test) | `test_the_dispersion_axis_is_the_measured_spread` |
| G4 | MOD-10: R-74: equality meets the bar | KILLED (test) | `test_the_location_axis_meets_or_falls_below_the_bar` |
| G5 | MOD-10: SEAM-13: θ = ⊥ withholds location with the bar's own no-bar as the cause | KILLED (test) | `test_the_location_axis_meets_or_falls_below_the_bar` |
| G6 | MOD-10: PC-07 / R-74: the location axis carries the bar whole, its exclusion counts included | KILLED (test) | `test_the_location_axis_meets_or_falls_below_the_bar` |
| G7 | MOD-10: R-72: the latest sample - the one holding the most recent candidate | KILLED (test) | `test_the_latest_sample_is_read_per_component` |
| G8 | MOD-10: R-75: the bar is read at the level in force at the height, not the sample's draw-time level | KILLED (test) | `test_the_bar_is_read_at_the_level_in_force` |
| G9 | MOD-10: BC-10-7: an Unknown other than an absence is the answer, never 'withheld' | KILLED (test) | `test_an_unknown_other_than_an_absence_is_the_answer` |
| G10 | MOD-10: IR-115: a diagnostic of nothing drawn is NoSubject | KILLED (test) | `test_the_latest_sample_is_read_per_component` |
| G11 | MOD-05: R-76 / REF-06: an act parameter carrying the Diagnostic brand is flagged | KILLED (test) | `test_no_act_signature_accepts_diagnostic` |
| G12 | MOD-05: R-76: a DiagnosticValue minted outside MOD-10 is flagged (BRANDS) | KILLED (test) | `test_an_unknown_other_than_an_absence_is_the_answer` |

**12 / 12.** Schema records `INSTRUMENTS/battery-records/MOD-10-round-27.json` (manifest `sha256:ad98f3fd…`) and `MOD-05-round-27.json` (manifest `sha256:acfd124d…`), each handed to battery_complete@1.

## Round 28, first pass — MOD-11 and MOD-05 (R-78) on `4d8b3bf`: H2 and H3 SURVIVED

On `4d8b3bf`; restores verified.

| ID | Mutation | Result | Killed by |
|---|---|---|---|
| H1 | MOD-11: REF-16: the (N+1)th draw is refused - remaining must be above zero | KILLED (test) | `test_draw_beyond_scope_ceiling_is_refused` |
| H2 | MOD-11: R-77: a superseded scope admits no draw | SURVIVED | `test_draw_beyond_scope_ceiling_is_refused` |
| H3 | MOD-11: HOOK-05: a draw is charged only to its own unit's scope | SURVIVED | `test_draw_beyond_scope_ceiling_is_refused` |
| H4 | MOD-11: R-78: draws recorded under a scope are charged against it | KILLED (test) | `test_draw_beyond_scope_ceiling_is_refused` |
| H5 | MOD-11: R-78 (R-25 amended): a candidate is its draw's scope's currency | KILLED (test) | `test_a_candidate_is_its_draws_scopes` |
| H6 | MOD-11: REF-15: a stop condition while θ = ⊥ is Refuse(no-bar) | KILLED (test) | `test_stop_condition_without_bar_is_refused` |
| H7 | MOD-11: R-79 / AE-05: with none requested, the stop member does not exist | KILLED (test) | `test_stop_condition_without_bar_is_refused` |
| H8 | MOD-11: I-5: hasStopCondition reads the member's presence | KILLED (test) | `test_stop_condition_without_bar_is_refused` |
| H9 | MOD-11: R-81: a Scope is authorized only from a form of the same height | KILLED (test) | `test_authorization_without_ratio_is_refused` |
| H10 | MOD-11: IR-123: a ceiling below one is malformed | KILLED (test) | `test_governing_scope_and_remaining` |
| H11 | MOD-11: R-77 / I-2: the governing scope is the latest appended | KILLED (test) | `test_governing_scope_and_remaining` |
| H12 | MOD-11: REF-18: the ratio's arity is the currency set, zeros included | KILLED (test) | `test_ratio_as_quotient_is_malformed` |
| H13 | MOD-11: HOOK-09: with no ratio there is no form | KILLED (test) | `build answers differently when ratio differs` |
| F1 | MOD-05: R-78 / HOOK-05: the draw asks the scope gate before anything is recorded | KILLED (test) | `test_draw_beyond_scope_ceiling_is_refused` |
| F2 | MOD-05: R-78: the candidate append checks its DRAW's scope | KILLED (test) | `test_a_candidate_is_its_draws_scopes` |
| F3 | MOD-05: R-78: drawsUnder charges only the draws recorded under that scope | KILLED (test) | `test_draw_beyond_scope_ceiling_is_refused` |

**14 / 16.** H2 is a test gap: BC-11-1's superseded scope was also spent, so it was refused either way. H3 is an EQUIVALENT mutant: `admitsDraw` reads the governing scope by the drawing unit, so another unit's scope never matches it, and the explicit unit check was redundant. Fix: H2 pinned test-first (a superseded scope with remaining admits nothing), the redundant clause removed, and the round re-run in full. The schema records from this pass are not receipted.

