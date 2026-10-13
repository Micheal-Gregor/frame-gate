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

*Widened 2026-10-11/12 (R-04, R-06; K7 rounds 4–5).* The check uses the type checker: every
export form, members at any depth, factory return types and construct signatures. The asserted
type counts as membership when it carries the brand, is a member-name literal, or has the
Projection SHAPE (a member callable with a `RecordHeight`). **Registered limit (IR-27):** a plain
`boolean` function that tests shape cannot be told apart from any other boolean function, and is
pinned by a `limit-` fixture rather than presented as covered.

OBJ-34 `DifficultyAdvisory` is stateless, pure, and computable at a height. Every property a reader
might re-derive the family from admits it. If it rejoins, δ becomes consumable wherever a Projection
is consumed and owner ruling DG-F1 is defeated **without anyone editing a line that mentions
difficulty**. The list is the definition; the absent predicate is what keeps it the definition.

**BC-01-3 — `AppendedFact` has no mutator through the base view.**

> A fixture that assigns to a field of an `AppendedFact` **must fail to compile, with exactly the
> read-only-assignment diagnostic (TS2540) naming the field**.

Checked by running the compiler over a fixture and requiring that ONE diagnostic, a parse-level
refusal rather than a runtime throw. "The fact was corrected" must have no expression through the
base type.

*Amended 2026-10-11 (R-04, K7 round 4).* The original statement also claimed "a subclass cannot
introduce one". That was never true: `AppendedFact` is an interface, and an implementer or an
extending interface can add a mutable member. The claim is **withdrawn, not tested**. Its actual
scope is registered as IR-23. Separately, "requiring diagnostics" became "requiring the diagnostic"
(DR-09): any unrelated compile error satisfied the old check.

**BC-01-4 — a `Gate` without `ON_FAIL` is malformed at parse.**

> A fixture declaring a Gate that omits `onFail` **must fail to compile, with exactly the
> missing-required-property diagnostic (TS2741) naming `onFail`**, and `onFail` must be typed to
> exactly one `Unknown` member. *(Diagnostic pinned 2026-10-11, R-04 / DR-09.)*

A gate that can fail without saying in which of the five ways re-opens the collapse OBJ-04 exists to
prevent.

**BC-01-5 — `RecordHeight` is a total order that never decreases, and exposes no arithmetic.**

> `compare` is total, antisymmetric and transitive over a discovered sample; `succeeds` is false for
> equal and earlier heights; the module exports no add/subtract/delta over heights.

*Restated 2026-10-12 (R-09, owner; K7 round 5 / DR-14), so a detector can decide it.* "No
arithmetic" means: no exported callable at any depth takes a `RecordHeight` and returns a plain
`number`, and none takes a `RecordHeight` and returns a `RecordHeight` unless every return hands
back one of its own height parameters unchanged (a SELECTION, such as `latest(a, b)`). Orderings
(`-1 | 0 | 1`), booleans, other result types, and callables that take no height (`height(n)`)
are outside the prohibition. The old form, "two heights in, a height out", missed a delta, an
offset, a successor and a fold.

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

## MOD-03 `catalog/` — currency order, units, declarations (OBJ-05, OBJ-06, OBJ-13; R-10, R-11)

**Axioms carried:** SC-3 / SC-5 (the currency set is data; the number two appears nowhere; one code
path quantified over the order), INV-PROV (a declared classification is never produced by a
derivation, and an inferred one is never written), RFD-04 (the order is configuration, not a
fact), and OBJ-13's as-of rule (read the declaration in force at a height, never "the current
one").

Written **before** the classes, and watched failing against typed stubs.

**BC-03-1 — the currency order is total, finite, and has a least element, for any size.**
> A `CurrencyOrder` over N distinct currencies, for every N in a discovered sample (1, 3, 5, never
> a hard-coded pair): `least()` is the first; `predecessors(c)` is exactly the currencies cheaper
> than `c`; the least has none. An empty list, or a repeated currency (a tie), is refused at
> construction. A currency from another order is refused, not answered.

**BC-03-2 — REF-01: a derivation producing a Declaration is malformed at parse.**
> A fixture that computes a classification and returns it as a `Declaration` fails to compile,
> with the pinned diagnostic. No source file outside the ledger asserts a value TO a declaration
> type (`as`), decided by resolving the asserted type, not by its spelling.

**BC-03-3 — HOOK-07 (author half, R-11): only a HUMAN author can declare.**
> `declare(..., "ENGINE")` and `declare(..., author: Author)` each fail to compile with the pinned
> diagnostic. A caller that narrows through ports' `mayDecide` compiles (positive control).

**BC-03-4 — REF-01+: a HUMAN declaration is appended and read as of a height.**
> After `declare(u, L, "HUMAN")` at height h, `declarationAt(u, h')` returns it for every h' ≥ h,
> and `NoSubject` for every h' < h. A re-declaration at h2 is returned from h2 on, while heights
> in [h, h2) still return the first. **History is never rewritten.** No exported operation answers
> "the current declaration": every operation returning a declaration either takes a
> `RecordHeight` or is the HUMAN-only append.

**BC-03-5 — R-10: independence is a HUMAN act read as of a height.**
> No act in force means `NoSubject` (not licensed). An act asserting independence is returned
> from its height on, and a later act withdrawing it (`false`) is returned from its own height.
> HOOK-07's author half guards it exactly as it guards `declare`.

**BC-03-6 — SC-3: the number two appears nowhere.**
> No numeric literal equal to 2 in `src/` (OI-4's mechanical review check), decided over the AST.

**BC-03-7 — OS-12, every class in isolation.** Each class is constructed from its declared
inputs only, every public operation is called, and for each declared input two calls that
differ only in that input give different answers.

**Watched failing, 2026-10-12.**

- **Against typed stubs** (final signatures, operations throwing, constructors validating
  nothing): **24 failed / 30**, `tsc` clean. Every behavioural base case and every isolation test
  was red on its own subject.
- **The 6 that stayed green were the parse-level and structural ones.** The stub's TYPES are their
  deliverable, which is the MOD-01 lesson: "a base case green at stub time proves only that it was
  written after the thing it checks." So each was watched failing against a deliberately WRONG
  stub, applied and restored from in-memory copies (the tree was uncommitted), with the sources
  verified byte-identical afterwards:

| Wrong stub | Base case | Result |
|---|---|---|
| W1 `Declaration` not nominal (brand removed) | BC-03-2 `test_declaration_from_derivation_is_malformed` | RED |
| W2 `declare` / `declareIndependence` take any author string | BC-03-3 `test_a_non_human_author_cannot_declare` | RED |
| W3 the ledger offers `currentDeclaration(unit)` | BC-03-4 `test_no_operation_answers_the_current_declaration` | RED |
| W4 `export const PAIR = 2` in the currency order | BC-03-6 `test_the_number_two_appears_nowhere` | RED |
| W5 the catalog imports `src/advisory/` | REF-01a `test_no_write_path_from_difficulty_to_declaration_or_gate_condition` | RED |

- **An isolation-test defect found while counting.** The first count showed the two ledger
  isolation suites with **0 tests**, not red. They built their `Unit` through `UnitRegistry` at
  load time, so the registry's stub threw before collection. That was also an OS-12 defect: an
  isolation test that needs a second class is not testing one class. Fixed by naming the `Unit`
  (an operation input) directly.

## MOD-05 `facts/`, slice 1: commitments (OBJ-12 Commitment, OBJ-31 CommitGate; R-18..R-20)

**Axioms carried:**

- **RC-3 / SC-2:** the effective commitment is a fold over the append-only record, recomputed per
  call and never stored.
- **ER-1 / ER-2:** BOTTOM is a value in the closed Unknown family, never `null`, never coalesced,
  never defaulted. It is `NoSubject` (IR-42).
- **ER-4:** proposals never close; no act signature accepts a diagnostic (REF-06).
- **INV-PROV:** a commitment is a HUMAN act.
- **F2:** two effective commitments is a defect, answered `uncomputable` (R-20).

Written before the class, and watched failing against typed stubs.

**BC-05-1 — the effective commitment is a fold, per (unit, currency), as of a height.**
> With no commitment for `(u, c)` at `h`, the fold answers `NoSubject` (BOTTOM). After
> `commit(u, c, "HUMAN")` at height h₀, it answers that commitment at every h ≥ h₀ and `NoSubject`
> before h₀. A commitment for another unit, or another currency, never answers for `(u, c)`.
> Entries that are not the ledger's own (another module's facts, a non-HUMAN entry) never count.

**BC-05-2 — supersession is read through the declared invalidation reader (R-19).**
> A commitment the reader reports invalidated at `h` does not count at `h`. Superseding (invalidate
> c₁, then commit c₂) answers c₂ from c₂'s height on, and c₁ in between.

**BC-05-3 — two effective commitments is `uncomputable("two-effective-commitments")` (R-20).**
> Two commitments for `(u, c)`, neither invalidated at `h`, answer `uncomputable` with that boundary.
> Neither is chosen, and the answer is not BOTTOM.

**BC-05-4 — `commit` is a HUMAN act at parse (OBJ-31 closed_by HUMAN_ACT; INV-PROV).**
> `commit(u, c, "ENGINE")` fails to compile with the pinned diagnostic. A caller narrowed through
> `mayDecide` compiles. Each `commit` appends exactly one entry.

**BC-05-5 — REF-06: no act signature accepts a diagnostic.**
> Every act in `src/` (an operation that appends to the record) takes only closed parameter types,
> never `any`, `unknown`, `object`, `{}` or an unconstrained type parameter, any of which would
> admit a diagnostic. Decided by the type checker, with positive-control fixtures. When MOD-10
> builds the Diagnostic type, the rule gains its brand explicitly.

**BC-05-6 — the ledger's acts and reads obey the catalog's rules (R-12, BC-03-4).**
> No code outside `src/facts/` builds or appends an entry whose type carries the commitment kind.
> No exported operation answers "the current commitment" (every commitment-returning operation
> takes a RecordHeight or is the HUMAN append). No class holds mutable state other than its
> record port. These are the same checks as MOD-03's, now applied to every ledger.

**BC-05-7 — OS-12, the class in isolation.**
> `CommitmentLedger` is constructed with its declared inputs (`record`, `invalidations`) and
> nothing else. Every operation is called, and each declared input is varied with the answers
> asserted to differ. `commit` is invariant to `invalidations`, as its contract row declares.

### MOD-05 slice 2 — the draw context (OBJ-16), under R-21..R-24

Written before the class, and watched failing against typed stubs.

**BC-05-8 — REF-05: a draw with no declaration in force is refused (R-21).**
> `recordDraw(u, features, scope, condition, h, author)` reads the declaration in force for `u` at
> `h` through the declared reader. When none is in force, it answers `Refuse(no-declaration)` and
> appends NOTHING. Any other Unknown the reader answers is passed through unchanged, never
> collapsed into the refusal. Named test: `test_draw_without_declaration_is_refused`.

**BC-05-9 — the recorded declaration is the one in force AT THE DRAW HEIGHT, recorded by its
height (R-21, S-08, SEAM-10).**
> A draw at `h` records the height of the declaration in force at `h`. A re-declaration appended
> after the draw does not change what any recorded draw context says, read at any height. A
> draw context whose declaration is read "now" is the defect this exists to prevent.

**BC-05-10 — draw-time features are given and recorded as given (R-22).**
> The context records the caller's features. A later change to the caller's object does not change
> the record. No code in `src/` outside MOD-13 calls `UnitRegistry.features` (F1, SEAM-27, DG-F1).
> That is decided by resolution, with fixtures judged at the `src/` path they mirror.

**BC-05-11 — scope and condition are carried, not interpreted (R-23).**
> The context records the scope's height and the condition's identity string exactly as given.
> MOD-05 makes no check that needs to know what either one is. Recording a scope spends nothing
> (O-4 is held, owned by MOD-11).

**BC-05-12 — the resolution label is a later append, read as of a height (R-24).**
> A context with no label answers `NoSubject` for its resolution: the label is not known at draw
> time, and its absence is not a refusal. One label answers its value from its own height on. Two
> labels answer `uncomputable("two-resolution-labels")`. A label for another context never
> counts.

**BC-05-13 — draws are read as of a height, per unit.**
> `drawsAsOf(u, h)` answers exactly the draw contexts for `u` appended at or below `h`, in append
> order. Another unit's draws and another module's facts never appear.

**BC-05-14 — OS-12, the class in isolation.**
> `DrawContextLog` is constructed with its declared inputs (`record`, `declarations`) and nothing
> else. Every operation is called, and each declared input is varied with the answers asserted
> to differ.

BC-05-5 (REF-06) and BC-05-6 (the ledger rules) apply to the draw context and the label as they
do to commitments: their kinds are owned by `src/facts`, their brands are minted only by
`DrawContextLog`, and every operation returning one takes a height or appends.

### MOD-05 slice 3 — candidates (OBJ-11), under R-18 and R-25..R-28

Written before the class, and watched failing against typed stubs. Every cross-module decider
is injected (R-18, R-25): admission (MOD-04), the signature check (MOD-12), the scope ceiling
(MOD-11), plus MOD-03's currency order and independence reader. MOD-05's own commitment fold
is injected too, so that `from` is checked against the same answer MOD-04 reads.

**BC-05-15 — one guarded append, and an unreachable draw costs nothing (S-01, REF-03).**
> `appendCandidate` is the only operation that appends a candidate. Outside `src/facts`, no
> candidate-kind entry is built or appended (BC-05-6). When admission answers an Unknown, that
> answer is returned unchanged (MOD-04 names the cheapest BOTTOM predecessor), NOTHING is
> appended, and no later decider is asked.

**BC-05-16 — `from` is the effective commitment immediately below, as of the append height
(R-26).**
> Above the least currency, `from` must be the commitment the fold answers for `(unit, the
> currency immediately below)` at the append height. A superseded one, another unit's, one two
> currencies below, or BOTTOM all answer `Refuse(malformed-from)`, with nothing appended. At
> the least currency, `from` must be BOTTOM, and only when an independence act asserting
> independence is in force at that height (R-10). No act, a withdrawn license, or a Commitment
> `from` answers `Refuse(malformed-from)`. BOTTOM is `NoSubject` (IR-42), so a `from` of any
> other Unknown member does not compile.

**BC-05-17 — the signature is checked by MOD-12, over the whole proposal (R-27, HOOK-04).**
> The injected check receives the proposal, `from` included, and the signature as an opaque
> value. Its Unknown answer is returned unchanged, and nothing is appended. MOD-05 computes no
> digest.

**BC-05-18 — the scope ceiling is asked on the same path (R-25, REF-16, SEAM-04).**
> The injected ceiling's Unknown answer is returned unchanged, and nothing is appended.

**BC-05-19 — refusal order (R-28).**
> Admission, then `from`, then signature, then ceiling. The first failure answers, and each
> decider after it is not asked.

**BC-05-20 — an admitted, well-formed, signed, within-ceiling candidate is appended once.**
> Exactly one entry. It carries the unit, the currency, the condition identity, the seed, the
> signature, and `from` by its height, or `NoSubject` for BOTTOM.

**BC-05-21 — candidates are read as of a height (S-09, SEAM-22, MOD-12's lineage).**
> `candidatesAsOf(u, c, condition, h)` answers by condition IDENTITY, never a window: only that
> unit, currency and condition, at or below `h`, in append order. `derivedFrom(k, h)` answers
> the candidates whose `from` is commitment `k`. `countsAsOf(u, h)` answers one count per
> currency, in currency order, zeros included: counts only, never summed and never divided.

**BC-05-22 — OS-12, the class in isolation.**
> `CandidateLedger` is constructed with its declared inputs (`record`, `commitments`,
> `currencies`, `independence`, `admission`, `signatures`, `ceiling`) and nothing else. Every
> operation is called, and each input it reads is varied with the answers asserted to differ.

### MOD-05 fix round (K7 round 8 → R-31)

Written before the change, and watched failing.

**BC-05-23 — REF-05 on the path that costs: no candidate without a draw context, so none
without a declaration (DR-27, R-31).**
> `appendCandidate`'s proposal carries the `DrawContext` it was drawn under. A proposal without
> one does not compile. A context cannot be built outside `DrawContextLog` (BC-05-6 mint), and
> `recordDraw` mints none when no declaration is in force. With a real `DeclarationLedger`
> holding nothing for the unit, the draw is refused, there is no context, and no candidate can
> be appended. The declaration is never re-read on the candidate path (F1 S-14).

**BC-05-24 — the bound context must be this draw's (R-31).**
> A context for another unit or another condition, or one recorded above the append height,
> answers `Refuse(context-mismatch)`, and nothing is appended. The candidate records the
> context by its height.

**BC-05-25 — the record says which declaration a candidate was drawn under (DR-28, SEAM-10).**
> Take two draw contexts for one (unit, condition), recorded under different declarations, and
> one candidate drawn under the second. The candidate's context, read by key, names the second
> declaration.

**BC-05-26 — refusal order, amended (R-31 supersedes BC-05-19's order).**
> Admission, then context, then `from`, then signature, then ceiling. The first failure answers,
> and every decider after it is not asked.

**BC-05-27 — OBJ-31 as a value (WI-06).**
> `COMMIT_GATE` states: the condition is a human act present for (unit, currency); it is closed by
> `HUMAN_ACT`; its proposals are `Diagnostic` and `Observation`; it records `Commitment`; on
> failure it refuses with guard `commit-gate`. It is frozen.

### MOD-05 work items after its gate (K7 round 9 → R-32, R-33)

Written before the change, and watched failing.

**BC-05-28 — S-01 holds through a WRAPPED relay (WI-07, R-32).**
> A helper that builds the appended entry from one of its own parameters, as
> `record.append(Object.freeze({ author, payload }))` with `payload: T`, relays that parameter. A
> caller handing it a candidate payload is a second candidate append path, and the paths map
> shows it. A DESTRUCTURED relay is a registered limit, pinned by a `limit-` fixture that must
> stay unflagged.

**BC-05-29 — one draw, one candidate (WI-08, R-33).**
> A draw context already bound by a candidate in force as of the append height answers
> `Refuse(context-spent)`, and nothing is appended. Context checks run in order (another unit,
> another condition, or newer → `context-mismatch`; then spent), all before `from`. An unused
> older context still binds, carrying its own draw's declaration.

### MOD-01 work item WI-10 (R-35) — written before the change, watched failing

**BC-01-6 — the kernel mints Projection membership, by name.**
> `asProjection(member, compute)` is the one door into the family. `member` is typed by the
> ten-name list, so `asProjection("DifficultyAdvisory", ...)` fails to compile (TS2345) while a
> listed member compiles. The joined value computes at a height and is frozen. The kernel still
> exports no membership predicate and no height arithmetic. The fixture compiler discovers every
> kernel fixture instead of naming three (RD-12).


## MOD-04 `reachability/` — OBJ-24 Reachability, OBJ-29 ReachabilityGate (the concept)

Carried: REF-03 (`test_draw_without_cheaper_commitment_is_refused`), HOOK-01, VEC-01, SEAM-01/02/03,
F1 S-13, IR-42's forward constraint, R-34 (naming in the witness set), R-35 (the join). Written
before the classes, and watched failing.

**BC-04-1 — REF-03: a draw with no commitment below it is refused, before anything costs.**
> When any currency strictly cheaper than `c` lacks a commitment for `u` as of `h`, the gate
> answers `Refuse(unreachable)`. Composed with MOD-05 (HOOK-01 at the candidate append), no
> candidate is appended and no later decider is asked.

**BC-04-2 — the fold: reachable iff every strictly cheaper currency HAS a commitment (IR-42).**
> Every predecessor's answer must BE a Commitment: `NoSubject` (BOTTOM) and
> `uncomputable("two-effective-commitments")` (R-20) both leave the currency unmet. At the least
> currency the predecessor set is empty and the fold answers reachable. That is the identity of
> the fold, not a branch: no code compares a currency to a particular member of the order.

**BC-04-3 — one evaluation, with its witnesses (R-34, F2).**
> One evaluation answers the verdict, one witness per strictly cheaper currency in cost order
> (its effective commitment, or the Unknown the fold gave), and, when unreachable, the cheapest
> unmet currency. The gate's `admit` derives from that same evaluation, never a second one.

**BC-04-4 — as of a height, recomputed per call (OBJ-24 is a Projection).**
> A commitment appended after `h` does not make `c` reachable at `h`, and it does at its own
> height. Reachability joins the family through the kernel (`asProjection("Reachability", ...)`,
> R-35) and stores nothing.

**BC-04-5 — a currency outside the order is not "unreachable".**
> MOD-03's refusal for a currency it does not know passes through unchanged. It is never
> collapsed into `Refuse(unreachable)`.

**BC-04-6 — OBJ-29 as a value.**
> `REACHABILITY_GATE` states: condition `reachable(u, c) = true`, closed by `DERIVATION`, no
> proposals, records `Candidate`, on failure `refuse("unreachable")`. It is frozen, and the
> gate's refusal equals its `onFail`.

**BC-04-7 — one reachability site, and no per-currency branch (CLAUDE.md; F2 OBJ-29; S-13).**
> Outside `src/reachability/`, no code folds effective commitments over currencies: a read
> returning a Commitment, inside an iteration. Nowhere in `src/` is a currency compared to a
> PARTICULAR member of the order (the least, an indexed member, a literal). Both are decided by
> resolution, with fixtures judged at the path they mirror.

**BC-04-8 — OS-12, both classes in isolation.**

**BC-04-9 — VEC-01, computed from MOD-04 and re-derived (R-36).**
> Over a three-currency order c1 < c2 < c3, for commitment sets {}, {c1}, {c1,c2} × requested c1,
> c2, c3, admission holds iff every currency strictly below the requested one carries a commitment,
> vacuously at the least: {} → ADMIT, R, R; {c1} → ADMIT, ADMIT, R; {c1,c2} → ADMIT, ADMIT, ADMIT.
> The vector is COMPUTED by the harness from the real fold, never hand-written. Its `impl_sha`
> pins `src/reachability/reachability.ts`, and `rederive.py VEC-01` recomputes it. A harness
> handed the wrong entry refuses to run.

### MOD-04 fix round (K7 round 10 → R-38) — written before the change, watched failing

**BC-04-10 — the branch rule decides the destructured member (DR-30).**
> `const [least] = order.currencies(); c === least`, and the same through a `const` one hop, are
> per-currency branches. Two currencies destructured from DATA are not. A class field holding the
> least currency is a registered limit.

**BC-04-11 — PC-05: a refusal is attributable by construction (DR-31).**
> REF-03's named row holds on the orchestrated path: no candidate created, and no later decider
> asked. `evaluate(u, c, h)` asked again at the refusal's height gives the same evaluation, which
> names the cheapest unmet currency.

**BC-04-12 — the five omitted forms are decided (DR-32).**
> A commitment read inside a helper that returns a boolean or a commitment, and is called from
> (or handed to) an iteration, is a second reachability check; so are `Array.from(xs, fn)` and a
> library Set's or Map's iteration. A Projection from a generic launder, or `asProjection`
> reached by `call`, `apply` or `Reflect.apply`, is refused. A helper returning another verdict
> type is a registered limit.

### MOD-04 work items after its gate (K7 round 11 → R-39) — each rule stated by MEANING, its spellings enumerated (MF-34)

**BC-04-13 — the branch rule: a currency compared to a member picked by POSITION from the loaded
order, however either side is spelled (WI-11).**
> The pick: an index, `.at(literal)`, an array destructuring, or an object destructuring whose
> key RESOLVES to a numeric position (`0`, `"0"`, `[0]`, `[K]` where `K` is a numeric const). The
> currency side: bare, or widened by `as`, `satisfies`, angle brackets, `String(c)`, a template
> `${c}`, `.toString()` or `.valueOf()`. One `const` re-binding is one hop; the destructuring is
> the pick, not a hop. Data compared to data is never a branch. Registered: a rest element read
> back by a literal index.

**BC-04-14 — no Projection outside the kernel's door, in any spelling (WI-12).**
> `asProjection` reached indirectly, recognised by its TYPE: as the receiver of call, apply or
> bind (directly, by alias, by property, by parameter), or as an argument to a LIBRARY function
> (`Reflect.apply`, `Function.prototype.call.call`). Also refused: a Projection-typed position
> filled by `any`, and a user type guard asserting a Projection. Registered: `asProjection` handed
> to a USER higher-order function.

**BC-04-15 — a reader handed to an iteration, in any spelling (WI-13).**
> The argument's TYPE decides, not its syntax: if any of its call signatures is declared by a
> reader (an identifier, a method reference, a factory's result, or `.bind`), it is a second
> check. A read-wrapping helper whose result is boolean or nullish is a reader. Registered: a
> reader called from a USER-written iteration helper.

**BC-04-16 — every §5 Test name of every built module selects exactly ONE case (S3 §5 (B); WI-14).**
> Decided over the S3's own §5 table and the suite's own titles, never a list: a substring match
> by any other title is the defect DR-36 found.


## MOD-12 `lineage/` — slice A: MOD-05 work items (R-40, R-41), written before the change, watched failing

**BC-05-30 — a least-currency candidate may inherit from another unit's commitment (R-40, F3).**
> At the least currency, `from` is BOTTOM (licensed, R-10), or ANOTHER unit's commitment that the
> fold answers for that unit and currency as of the append height. A superseded commitment of
> another unit, the SAME unit's own commitment, or a commitment of another unit not in force,
> answers `Refuse(malformed-from)`. Above the least currency, R-26 is unchanged.

**BC-05-31 — a commitment names the candidate it accepts (R-41, F4, S-07, SEAM-11).**
> `commit(candidate, "HUMAN")` appends one commitment whose unit and currency are the candidate's,
> and which records the candidate by height. There is no way to commit without a candidate, and
> committing with a non-HUMAN author does not compile.

**BC-05-32 — the lineage reader, record-only (R-41).**
> `derivedFrom(commitment, h)` answers the candidates whose `from` is that commitment, and
> `acceptedBy(candidate, h)` the commitments that accepted that candidate, each as of `h`, in
> append order. It needs only the record: no fold, no decider.

**Watched failing, 2026-10-13.** Every test now commits over the REAL facts path
(`tests/support/fact-world.ts`): a commitment accepts a candidate that was drawn, declared and
from-checked, so no test can commit what the system could never commit.

- **Against the unchanged MOD-05** (`commit(unit, currency, author)`, no `candidate` field, no
  lineage reader, least currency BOTTOM-only): **43 failed** across the facts, reachability and
  isolation suites, and **16 type errors**. Each is at the new `commit(candidate, author)`
  signature, at the payload's `candidate`, or at the missing `LineageReader`. The type errors are
  BC-05-31's parse-level half: committing without a candidate does not compile.
- **Not every red was its own subject.** BC-05-30's NEGATIVE cases (superseded, not yet in force,
  the unit's own) are refusals the old code also gave, because it refused every commitment at the
  least currency. They were red only through setup. They pin the new branch's limits, and the
  battery proves them. BC-05-30's positive case and BC-05-32 were red on their subjects.
- **Corrected before the source changed, by reading the reds.** (1) The "not yet in force" case
  drew its context above the append height, so `context-mismatch` would have answered, not the
  from-check. The context is now drawn before it. (2) The own-unit rule was pinned only at the
  same currency, so a check comparing the (unit, currency) pair would survive. u's own commitment
  at c1 is now refused as an inheritance at c0. (3) Added: a HUMAN commitment-kind entry naming no
  candidate is not read as a commitment (the recognizer's R-41 clause).
- **After the change:** `tsc` clean, **188 / 188**; VEC-01 re-derives unchanged.


## MOD-12 `lineage/` — slices B and C, one rung (R-43..R-48), written before the classes, watched failing

**BC-12-1 — REF-04 (INV-SIG): a signature omitting the lineage digest is refused.**
> At parse: a `SignatureMaterial` without `lineage` does not compile (the "without" form cannot be
> emitted). At runtime: a signature formed over a material WITHOUT the lineage (a constructed
> artefact) answers `Refuse(malformed-signature)` on MOD-05's append path, and nothing is appended.
> Positive: a signature covering the lineage verifies, and the candidate is appended.

**BC-12-2 — a signature is the digest of its material (R-43).**
> `sign(materialOf(p))`, through the injected DigestPort and nothing else. It is deterministic, and
> it is SENSITIVE to every field of the proposal it covers: the bound draw context, the unit, the
> currency, the condition, the seed and `from`. A proposal differing in any one of them does not
> verify under the other's signature (R-44).

**BC-12-3 — a mismatch is `malformed-signature` (R-44), asked in MOD-05's order (R-31).**
> Through the real CandidateLedger: after admission, context and from, before the ceiling; nothing
> is appended; the ceiling is not asked.

**BC-12-4 — a BOTTOM-from candidate's lineage is a typed marker (R-45).**
> Its material's lineage is BOTTOM. The same fields signed as derived and as BOTTOM give different
> signatures, and neither verifies the other's proposal.

**BC-12-5 — the signature binds THE commitment (F2's rationale; VEC-05's rule).**
> K is invalidated and re-committed as K'. A signature formed against K does not verify the same
> proposal re-pointed at K'. The lineage digest covers the whole commitment, its accepted candidate
> included (R-41): two commitments for one (unit, currency) have different lineage digests.

**BC-12-6 — VEC-05, computed from MOD-12 and re-derived (R-36).**
> One candidate's material held fixed, signed WITH its lineage digest and WITHOUT it (the
> constructed artefact). Both values are recorded with the pinned digest's identifier, and they
> are asserted UNEQUAL, never compared by a distance (IR-06).

**BC-12-7 — OBJ-32 as a value, and HOOK-04 registered at MOD-12.**
> `SIGNATURE_GATE` is the descriptor F1/F2 state: a derivation closes it, it takes no proposals,
> it records Candidate, and it fails as `refuse("malformed-signature")`. HOOK-04 is the real
> SignatureGate, injected as MOD-05's signature check: the registration runs MOD-12 → MOD-05, and
> MOD-05 imports nothing of MOD-12 (the S3's "registration placement is load-bearing").

**BC-12-8 — OBJ-28: the scope is the transitive closure over `from`, through acceptances (R-42).**
> Of commitment K, as of a height: the candidates whose `from` is K; the commitments accepting any
> of them; the candidates from those; and so on, to a fixed point. The count is the number of
> candidates. It is one rule with no depth, recomputed per call: a Projection joined once,
> through the kernel, as "InvalidationScope". It sees nothing appended above its height.

**BC-12-9 — REF-07 (RC-4): no invalidation before its scope is derived and displayed.**
> At parse: `invalidate` takes only a DisplayedScope, which only `display` mints (R-48). An
> undisplayed scope value, or a look-alike, does not compile. At runtime: a display derived at a
> height other than the act's answers `Refuse(scope-before-act)`, and nothing is appended (R-47).
> Positive: derive and display at h, invalidate at h, and the invalidation is appended.

**BC-12-10 — OBJ-18: the invalidation is one HUMAN append.**
> A non-HUMAN author does not compile. One entry is appended, naming the commitment by height and
> the height its scope was derived at. The renderer saw the scope BEFORE the append, and its
> return is never read.

**BC-12-11 — what is invalidated, as of a height (R-42, R-46, S-07).**
> From the invalidation's height on: K, every commitment that accepted a candidate in K's FROZEN
> scope (the closure as of `scopeAt`), and such a commitment made AFTER the invalidation (born
> superseded). Not: anything before the invalidation's height; a commitment outside the scope; a
> candidate derived above `scopeAt` and the commitments accepting it. `isInvalidated` and
> `invalidatedAsOf` answer from one derivation.

**BC-12-12 — MOD-05 reads it (R-19).**
> Wired as the CommitmentLedger's invalidation reader: after the invalidation, K and its downstream
> commitments fold to BOTTOM, reachability above them refuses, and a candidate whose `from` is K is
> `malformed-from`. A re-commitment at K's currency is then the one in force.

**Watched failing, 2026-10-13.** Against typed stubs (final signatures, operations throwing,
constructors validating nothing), with the detectors registering `src/lineage`:

- **30 failed / 218, `tsc` clean.** 28 were MOD-12's own: BC-12-1..12 and the three isolation
  tests, each red on its subject. One was the append-path map (BC-05-15): the stub appended
  nothing, so `invalidation` had no path. One was NOT a base case. The surface test pinned the list
  of ledger roots as `[catalog, facts]`, and I had not added `src/lineage`. That is a registration
  slip, fixed in the test before any source was written.
- **Two reds after the implementation, both the build's own rules catching me.** (1) The forge
  rule flagged `signature-gate.ts`: to hash the commitment I built an object whose `kind` carried
  the `"commitment"` literal, a commitment-shaped object outside `src/facts`. The lineage is now
  encoded positionally (IR-80); the `string`-typed-kind limit was not taken. (2) MOD-04's
  family-join test pinned the WHOLE join list as Reachability's. With OBJ-28 joining in MOD-12 that
  was an instance list. It now asserts each member's own join (BC-12-8 asserts InvalidationScope's).
- **After:** `tsc` clean, **218 / 218**; VEC-01 and VEC-05 re-derive.


## MOD-06 `condition/` (R-52..R-55; written before the classes, watched failing; one line each, R-50)

- **BC-06-1** OBJ-07: an identity is the port's digest of the WHOLE input set; key order is irrelevant; every component (a cited reference, its order, a nested value, an addition, a removal) changes it; equality is exact (R-52).
- **BC-06-2** OBJ-17: a revision is one HUMAN append (ENGINE does not compile); the condition in force is the last revision's, per (unit, currency), as of a height; NoSubject before any (IR-88).
- **BC-06-3** REF-10: a sample is asked for ONE identity (two do not compile); samples of one (unit, currency) are disjoint and exhaustive; Sample joins the family once, in MOD-06 (IR-87).
- **BC-06-4** closure: the first revision to ANOTHER condition after the first member, or the first acceptance of a member; not reopened by an invalidation; an off-condition draw joins its own closed sample (R-53, R-55).
- **BC-06-5** HOOK-06: an assembly with a member of another condition answers `refuse("mixed-conditions")`, through `samplesFor` too (IR-89).
- **BC-06-6** OBJ-27: chains are maximal head-to-end paths over edges made by least-currency commitments IN FORCE; as of a height; Chain joins the family once, in MOD-06 (R-54).
- **BC-06-7** MOD-05 work item: the lineage reader reads every candidate and every HUMAN commitment, as of a height (IR-90).

**Watched failing (MOD-06):** against typed stubs, 19 tests red plus `condition.test.ts` red at collection (7 cases; a module-level `identityOf` hit the stub), `tsc` clean. After: 245 / 245.


## MOD-07 `observation/` (R-58..R-60; written before the module, watched failing; one line each, R-50)

- **BC-07-1** OBJ-08: a Score is any finite number; NaN and the infinities answer `refuse("not-finite")`; no range is imposed (R-58).
- **BC-07-2** REF-09 / HOOK-02: an expression over a possibly-ABSENT component does not compile (`+`, `Math.max`, unary minus, a comparison); arithmetic over the scored components alone does. An all-ABSENT vector is accepted and stored, with nothing coerced.
- **BC-07-3** every configured component and only those: a missing one answers `refuse("missing-component")`, an unknown one `refuse("unknown-component")`, nothing appended; stored in the configured order, each with its own author (R-59).
- **BC-07-4** the latest observation as of a height is in force, NoSubject before any; a later vector may not score an Undischargeable component (`refuse("undischargeable")`); only well-formed entries are read (R-60).
- **BC-07-5** read component by component: a value, or NoSubject for an unconfigured name; `isAbsent`; the discharge condition; each component's author; the scored components (ABSENT omitted, never zeroed); `isAllAbsent`.

**Watched failing (MOD-07):** against typed stubs, 6 MOD-07 cases red, the isolation file red at collection, and the append-path map red; `tsc` clean once one test line was narrowed. After: 257 / 257.
