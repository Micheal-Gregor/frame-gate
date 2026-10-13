# Completion Ledger — The Frame Gate build

A module is COMPLETE only when every applicable box is checked (S3 §11 checklist).
Deferred-undischarged vectors block completion BY RULE. K7 confirms or returns — builder
statuses are claims.

**BUILT** = code exists and its suite is green. **COMPLETE** = additionally CT-1..CT-6 discharged,
every deferred vector computed from the real implementation and independently re-derived.

| Module | CT-1 | CT-2 | CT-3 | CT-4 | CT-5 | CT-6 | PC enum | Status |
|---|---|---|---|---|---|---|---|---|
| MOD-02 ports | pass | pass | pass | REF-02 pass (7 tests) | n/a-by-absence | n/a-by-absence | PC-02 enumerated | **BUILT** — `k7-pass-2`; reopened by round 3 CC-4 (POSIX-only path assertions), remediated |
| MOD-01 kernel | pass | pass | pass | n/a-by-absence | n/a-by-absence | n/a-by-absence | PC-04 enumerated | **BUILT** — gate closed `closed-by-owner-5` (K7 round 5 RETURN, drift 5; executed). R-06 fixes committed `8d8376c`, battery round 6 clean; drift block lifted by owner (R-08). Re-scored at MOD-03's gate |
| MOD-03 catalog | pass | pass | pass | REF-01, REF-01a, REF-01+ (BC-03-2..4) | n/a-by-absence | HOOK-07 author half at parse; call-chain half registered (IR-30) | PC-02 | **BUILT** — gate closed `closed-by-owner-7` (K7 round 7 RETURN, drift 5, Fable 5.1); R-14 fixes committed; drift block lifted for MOD-04 by owner (R-16) once the battery is recorded |
| MOD-05 facts | pass | pass | pass | REF-05 (BC-05-8), REF-06 (BC-05-5) | n/a-by-absence | n/a-by-absence: MOD-05 owns no hook. Its candidate append is the trigger site of HOOK-01 (MOD-04), HOOK-04 (MOD-12) and HOOK-05 (MOD-11), reached through injected deciders (R-18, R-25), so each hook is discharged by its owner | PC-01, PC-03 enumerated | **BUILT** — three slices (commitments `cf5280a`, draw context `e05d9cd`, candidates `7105559`); batteries 10–12 at 24/24, 25/25 and 26/26; suite 143/143. K7 round 8 RETURN (drift 5) → fix round R-31 → **K7 round 9 PASS (drift 7)** on `00a654f`; tag `k7-pass-9` (owner). Open: WI-07 (relay forms), WI-08 (IR-59 context age), WI-09 (cosmetic); IR-53 upstream (R-30) |
| MOD-04 reachability | pass | pass | pass | REF-03 (BC-04-1): its §5 name selects exactly one case (IR-74); the orchestrated path is covered by `test_an_unreachable_draw_is_refused_on_the_orchestrated_path`, which §5 does not name (ODG-FG-08's observation) | VEC-01 **COMPUTED** (R-36): from the real fold through `tools/vectors/run.ts`, impl_sha pinning `src/reachability/reachability.ts`; `rederive.py --all` re-derives it (BC-04-9) | HOOK-01 at the candidate append (BC-04-1, composed with MOD-05) | PC-05 enumerated (R-38): every refusal attributable by construction - `ReachabilityGate.evaluate(u, c, h)` is a pure as-of fold, so a refusal is re-attributed by asking again at its height (BC-04-11); the aggregating refusal stream is deployment (Developer), carried forward | **BUILT** — gate closed `closed-by-owner-11` (R-39; K7 rounds 10 and 11 RETURN, drift 6, Fable 5.1); VEC-01 computed and re-derived; work items WI-11..WI-14 done, battery 17; drift block lifted for the next module once battery 17 is recorded (R-39) |
| MOD-12 lineage | pass | pass | pass | REF-04 (BC-12-1) and REF-07 (BC-12-9), each at parse AND at runtime, each §5 name selecting one case (IR-74) | VEC-05 COMPUTED and re-derived (BC-12-6): the two signatures asserted UNEQUAL, the digest named (IR-06) | HOOK-04 (BC-12-7): the real SignatureGate is MOD-05's injected signature check; a registration, not an import, decided over the S3's hook table | PC-05 enumerated (IR-86): every MOD-12 refusal is attributable by construction - `malformed-signature` by recomputing a pure check from the proposal, `scope-before-act` by the displayed height against the act's; the invalidation records `scopeAt`; aggregation and alerting are deployment | **BUILT** — batteries 18 (14/14) and 19 (36/36); K7 round 12 RETURN, triaged by the owner (R-51): gate `closed-by-owner-12`. Carried: R-47's single-writer residue (IR-84) |
| MOD-06 condition | pass | pass | pass | REF-10 (BC-06-3): at parse (one identity) and by disjointness; its §5 name selects one case | n/a-by-absence (S3) | HOOK-06 (BC-06-5): divergence injected, a mixed assembly answers `refuse("mixed-conditions")` | PC-01 enumerated: every MOD-06 read refolds the record at a height, so cost grows with the record; retention is deployment's (S3 §8) | **BUILT** — battery 21 (15/15); K7 round 13 RETURN, triaged by the owner (R-61): gate `closed-by-owner-13` |
| MOD-07 observation | pass | pass | pass | REF-09 (BC-07-2): at parse, by type, over the decided spellings; coercions a registered limit (IR-94); its §5 name selects one case. REF-09+ (all-ABSENT accepted and stored) | n/a-by-absence (S3) | HOOK-02: the type system's, registered where its objects live (one module, C0 P-1) | PC-01 enumerated: observations are appended and never deleted, and every read refolds the record (S3 §8) | **BUILT** — battery 23 (11/11); K7 round 14 RETURN, triaged by the owner (R-67): gate `closed-by-owner-14` |
| MOD-08 statistics | pass | pass | pass | REF-08 (BC-08-1); its §5 name selects one case | VEC-03 COMPUTED from MOD-08 (statistic sample-sd, R-63) and re-derived by a second method (BC-08-6); the n = 2 row carries no number | n/a-by-absence (S3 §7 registers no MOD-08 hook) | PC-04 enumerated: both axes refold per read at a height; a height-keyed cache is permitted, none is kept | **BUILT** — battery 25 13/13 (receipt ACCEPT); K7 round 15 **PASS** (drift 7; k7 and full-review receipts ACCEPT); tag `k7-pass-15` on 4b55994 |
| MOD-09 calibration | | | | REF-11..REF-14 | VEC-02, VEC-06, VEC-07 | HOOK-03, HOOK-08 | PC-04 | NOT_STARTED |
| MOD-10 diagnostic | | | | n/a | VEC-04 | n/a | PC-04, PC-07 | NOT_STARTED |
| MOD-11 spend | | | | REF-15..REF-19 | n/a | HOOK-05, HOOK-09 | PC-05, PC-06 | NOT_STARTED |
| MOD-13 advisory | | | | n/a | n/a | n/a | n/a | NOT_STARTED |

## Deferred vectors — each blocks its module, each carries its discharge condition

| VEC | Module | Discharge condition |
|---|---|---|
| VEC-01 | MOD-04 | Compute from MOD-04 against a fixture record; re-derive independently before COMPLETE |
| VEC-02 | MOD-09 | Rows 1-3 computable at build. **Row 4 is uncomputable until AE-5's separation rule closes. MOD-09 cannot reach COMPLETE before then** — designed incompleteness, not a defect, and C5 must read this row rather than the status alone |
| VEC-03 | MOD-08 | Compute once DG-F5 selects a statistic. **Rows 2-3 are regression vectors for that choice, not conformance vectors for the spec** (C4-F1 / IR-05) — the spec pins the floor, not the spread |
| VEC-04 | MOD-10 | Compute from MOD-10; the (absent, absent) row must reproduce the S1 minimal worked example step 6 |
| VEC-05 | MOD-12 | Compute with the external digest pinned. **Assert the inequality, not a literal hex**, until the pin is confirmed against the declared `hex-sha256` encoding (C4-F2 / IR-06) |
| VEC-06 | MOD-09 | Compute from MOD-09 and MOD-12 jointly; re-derive before COMPLETE |
| VEC-07 | MOD-09 | Compute from MOD-09; re-derive before COMPLETE |

**None defers to Phase 5.** Every row above discharges inside this build except VEC-02 row 4, whose
condition is an upstream ambiguity (AE-5) and not a target-environment fact.

## MOD-02 status - BUILT, blocked on K7

Every builder-side obligation is discharged: base case written first and watched failing (4/4 red
against a typed stub), guard implemented, 7 tests green, typecheck clean, mutation battery of six run
on a committed tree with all restores verified against HEAD and all six killed by test.

**BUILT is not COMPLETE.** The distinct conformance gate has not run, so no drift score exists and no
`k7-pass-1` tag may be created - `gate.py` refuses a tag whose verdict is absent, and that refusal was
**exercised rather than assumed**: the tag was attempted, denied, and deleted. The builder does not
score its own conformance, so this row stays open.

**Blocked on:** the `claude` CLI inside the build sandbox is not logged in, so `tools/k7-run.py`
cannot spawn the reviewer process. This is an environment binding, not a build defect - the reviewer
command, the agent file and the preflight are all wired and the dry run passes. Discharged by running
`python3 tools/k7-run.py` from a logged-in Claude Code session in this repo.

## MOD-02 after K7 round 1 (RETURN, drift 6)

All four drift entries closed; see the drift ledger. The rung is resubmitted, not cleared: **only
K7 raises a drift score, and the builder does not score its own conformance.** Status stays BUILT
until round 2 returns a verdict, and `gate.py` will refuse a `k7-pass` tag until one exists.

One item is deliberately left open rather than fixed: **nine further §5 `Test name` rows are broken
the same way REF-02 was.** They are a Phase 3 defect, filed as SP-1, and fixing them in code against
a specification that may be corrected in the other direction would be work done twice and recorded
wrong. They will surface one rung at a time until the backflow runs.

## MOD-01 after K7 round 3 (RETURN, drift 4)

Both blocking items closed, and closed as rules rather than as the two call sites that failed.

**CC-4 — the declared suite must be green where the gate runs.** It was green on Linux and red on
Windows, and nothing in three rounds had distinguished those two hosts. The fixture compile now
spawns the Node binary at an absolute script path instead of reaching a `.cmd` shim through `npx`
(IR-21), and every path a check reports is branded platform-stable (IR-19). `tools/checks/spawn-portability.ts`
holds the first rule for the whole tree (IR-20) so the next module cannot reintroduce it.

**CC-6 — the parse-level guards must be green-on-clean.** They are: BC-01-3 and BC-01-4 run again,
because the process they depend on starts. Their falsifiability is re-established in battery round 4
rather than asserted — N7 restores the old spawn and dies.

24 tests green, `tsc --noEmit` clean, eleven mutations run, nine killed, two disclosed.

**Status stays BUILT.** Drift 4 is below the floor of 7, so no new module opens — MOD-03 stays shut
until a fresh verdict lifts it. The builder does not raise its own drift score, and a remediation is
not a verdict.
