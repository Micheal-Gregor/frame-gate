# Axioms & Base Cases — The Frame Gate build

Rule: the base case is written BEFORE the feature and **watched failing**, against a typed stub.
The red count is recorded. A base case pins a **RULE, not an instance** — a guard over "the five
members" is a reflective scan over every member discovered from source, because a hard-coded list
lets the sixth member skate.

## MOD-02 `ports/` — the single external boundary

**Axiom carried:** ER-5 external isolation. Every external is *cited* in `src/ports/` and *defined*
nowhere. Any other module naming a record driver, renderer client, dispatch mechanism, author source
or hash library is **malformed at parse** — caught at build, never at runtime.

**Base case BC-02-1 — the rule, stated without reference to any particular external.**

> For every module specifier imported by a file under `src/`: resolve it. If the resolution lands
> outside `src/`, or fails to resolve because the specifier names a runtime builtin, the import is
> **external**. An external import is admitted only from a file contained in `src/ports/`.

Three properties this phrasing buys, each of which a weaker phrasing loses:

1. **It names no external.** There is no allow-list of `pg`, `node:crypto`, or any renderer client to
   fall out of date. A dependency added next year is caught the day it is imported.
2. **It resolves and tests containment** (RD-13). It does not scan specifier text. String detectors
   are defeated by sibling spellings — `'../ports/index.js'` and `'./../ports/index.js'` denote one
   file and a name-scan sees two. Both are asserted equivalent in the base case below.
3. **Containment is computed on normalised absolute paths**, so `src/ports/../facts/x.ts` cannot pose
   as a ports file.

**Acceptance test:** `test_external_import_outside_ports_is_malformed` (REF-02),
with its positive counterpart `test_external_reached_through_ports_module_succeeds` (REF-02+).

**Watched failing:** yes — recorded below.

| Base case | Test | Red at | Green at |
|---|---|---|---|
| BC-02-1 refusal | `test_external_import_outside_ports_is_malformed` | stub, 4/4 red | detector body |
| BC-02-1 positive | `test_external_reached_through_ports_module_succeeds` | stub, 4/4 red | detector body |
| BC-02-1 RD-13 tripwire | `test_sibling_specifier_spellings_resolve_to_one_file` | stub, 4/4 red | detector body |
| BC-02-1 self-check | `test_the_real_src_tree_has_no_external_isolation_violation` | stub, 4/4 red | detector body |
| BC-02-1 lookalike | `test_lookalike_directory_is_not_exempted_by_name` | added at battery-preview | same commit |

## Log

- **2026-09-09 — opened at the MOD-02 rung.**
- **2026-09-09 — BC-02-1 watched failing.** Four tests written against a typed stub
  (`tools/checks/external-isolation.ts`, signature final, body throwing). **Red count: 4 failed / 4.**
  Typecheck clean at the moment of the red count, so the red was the base case and not the toolchain —
  an earlier run showed 3 tsc errors from a missing `@types/node`, which were fixed before the count
  was recorded. A red count taken over a broken toolchain proves nothing.
- **2026-09-09 — BC-02-1 green.** Detector body implemented; 4/4 pass, typecheck clean.
  `src/ports/index.ts` written afterward, so the self-check ran over a real tree rather than an
  empty one. The mutation battery is what turns "green" into evidence.

- **2026-09-09 — BC-02-1 strengthened before the battery.** Planning the mutation set exposed a hole:
  a name-scan mutation (`file.includes("ports")`) survived all four tests. `src/portsmith/` contains
  the substring and is not the ports module, so a name scan exempts it and misses the violation. Added
  `test_lookalike_directory_is_not_exempted_by_name` and the fixture. **This is the base case pinning
  a RULE rather than an instance** — the rule is containment, and nothing was testing that it was
  containment rather than a name that happened to agree with containment on the fixtures I had.


## MOD-01 `kernel/` — the three bases, the closed family, the height

**Axioms carried.** OBJ-01 append-only by absence · OBJ-02 the Projection family is a **membership
list, not a property** · OBJ-03 `ON_FAIL` mandatory · OBJ-04 `Unknown` closed at five · OBJ-10 the
only legitimate cache key. MOD-01 has **no §5 refusal row, no vector, no hook** — `N/A-by-absence`
on CT-4/5/6. That does not make it unguarded: the module's stated job is "the parse-level rules that
make an append-only violation, a memoization violation, and an `ON_FAIL`-omission unwritable", and
base cases pin those whether or not §5 names a test.

**BC-01-1 — `Unknown` is closed at exactly five, checked reflectively.**

> Discover the family's members **from source**, and assert the set is exactly
> `refuse · no-subject · uncomputable · undetermined · latent`.

A test asserting "there are five" against a hard-coded list of five is a tautology: it passes when a
sixth is added because it never looked. The check parses the union declaration and compares the
discovered set. **Adding a sixth member breaks it; so does renaming one.** RD-12 — pin the rule, not
the instance.

**BC-01-2 — the kernel exports no Projection membership predicate.** *(the self-reliance point)*

> No exported declaration answers "is this a Projection?" from shape. Checked by **resolving the
> AST** and rejecting any exported type-predicate asserting the family or a member — not by scanning
> names, which RD-13 forbids as load-bearing.

OBJ-34 `DifficultyAdvisory` is stateless, pure, and computable at a height. Every property a reader
might re-derive the family from admits it. If it rejoins, δ becomes consumable wherever a Projection
is consumed and owner ruling DG-F1 is defeated **without anyone editing a line that mentions
difficulty**. The list is the definition; the absent predicate is what keeps it the definition.

**BC-01-3 — `AppendedFact` has no mutator, and a subclass cannot introduce one.**

> A fixture that assigns to a field of an `AppendedFact` subtype **must fail to compile**.

Checked by running the compiler over a fixture and requiring diagnostics — a parse-level refusal,
not a runtime throw. "The fact was corrected" must have no expression in the type system.

**BC-01-4 — a `Gate` without `ON_FAIL` is malformed at parse.**

> A fixture declaring a Gate that omits `onFail` **must fail to compile**, and `onFail` must be typed
> to exactly one `Unknown` member.

A gate that can fail without saying in which of the five ways re-opens the collapse OBJ-04 exists to
prevent.

**BC-01-5 — `RecordHeight` is a total order that never decreases, and exposes no arithmetic.**

> `compare` is total, antisymmetric and transitive over a discovered sample; `succeeds` is false for
> equal and earlier heights; the module exports no add/subtract/delta over heights.

**Watched failing:** recorded below.

| Base case | Test | Red at | Green at |
|---|---|---|---|
| BC-01-1 closed family | `test_unknown_family_is_closed_at_five_by_source` | stub, 7/9 red | implementation |
| BC-01-2 no predicate | `test_kernel_exports_no_projection_membership_predicate` | stub, 7/9 red | implementation |
| BC-01-3 no mutator | `test_assigning_to_an_appended_fact_field_does_not_compile` | stub, 7/9 red | implementation |
| BC-01-4 ON_FAIL | `test_gate_without_on_fail_does_not_compile` | stub, 7/9 red | implementation |
| BC-01-5 height order | `test_record_height_is_a_total_order_that_never_decreases` | stub, 7/9 red | implementation |

- **2026-09-10 — BC-01-1..5 watched failing, then green.** **Red count: 7 failed / 9**, typecheck
  clean at the moment of the count.

  The first stub was written with the constraints already in it and produced only 4 red — because a
  type declaration *is* the deliverable for this module, so writing it into the stub meant the base
  cases were green before the implementation existed. **A base case green at stub time proves only
  that it was written after the thing it checks.** The stub was rewritten deliberately wrong — three
  Unknown members, an empty member list, mutable fields, no `onFail` — and every base case then went
  red on its own subject.

  Two remained green throughout and legitimately so: `..._exports_no_projection_membership_predicate`
  and `..._exposes_no_height_arithmetic` are **absence** properties, and absence is honestly true of
  a stub. They are pinned by mutation instead — the battery adds what they forbid and requires them
  to fail.

  Two defects were found in the checks themselves before any were trusted. A comment in the
  `mutate-fact` fixture contained the characters `@ts-expect-error`, which TypeScript parsed as a
  real directive and used to **suppress the very diagnostic the fixture existed to produce** — the
  test would have passed for the wrong reason. And `-compare(b,a)` yields `-0` where `compare`
  returns `0`, which `Object.is` distinguishes from `+0`; the antisymmetry assertion now sums rather
  than negates.

  The fixture compile runs in **its own process**. TypeScript builds the 61-file type graph in
  ~370ms standalone and exhausts the heap inside a vitest worker; the work is identical, the host is
  not. Spawning it keeps the check inside `test_command`, so it stays a gate.
