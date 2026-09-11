# Completion Ledger — The Frame Gate build

A module is COMPLETE only when every applicable box is checked (S3 §11 checklist).
Deferred-undischarged vectors block completion BY RULE. K7 confirms or returns — builder
statuses are claims.

**BUILT** = code exists and its suite is green. **COMPLETE** = additionally CT-1..CT-6 discharged,
every deferred vector computed from the real implementation and independently re-derived.

| Module | CT-1 | CT-2 | CT-3 | CT-4 | CT-5 | CT-6 | PC enum | Status |
|---|---|---|---|---|---|---|---|---|
| MOD-02 ports | pass | pass | pass | REF-02 pass (7 tests) | n/a-by-absence | n/a-by-absence | PC-02 enumerated | **BUILT** — `k7-pass-2`; reopened by round 3 CC-4 (POSIX-only path assertions), remediated |
| MOD-01 kernel | pass | pass | pass | n/a-by-absence | n/a-by-absence | n/a-by-absence | PC-04 enumerated | **BUILT** — K7 round 3 RETURN (drift 4) remediated, round 4 pending |
| MOD-03 catalog | | | | REF-01 | n/a | HOOK-07 | PC-02 | NOT_STARTED |
| MOD-05 facts | | | | REF-05, REF-06 | n/a | n/a | PC-01, PC-03 | NOT_STARTED |
| MOD-04 reachability | | | | REF-03 | VEC-01 | HOOK-01 | PC-05 | NOT_STARTED |
| MOD-12 lineage | | | | REF-04, REF-07 | VEC-05 | HOOK-04 | PC-05 | NOT_STARTED |
| MOD-06 condition | | | | REF-10 | n/a | HOOK-06 | PC-01 | NOT_STARTED |
| MOD-07 observation | | | | REF-09 | n/a | HOOK-02 | PC-01 | NOT_STARTED |
| MOD-08 statistics | | | | REF-08 | VEC-03 | n/a | PC-04 | NOT_STARTED |
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
