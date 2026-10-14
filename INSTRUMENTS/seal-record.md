# Seal record

One section per seal. Each lists the sweep result, what the owner accepted, and what is carried forward to Phase 5's latency / scale / security review.

## seal-1 — 2026-10-14 — approved by Micheal-Gregor, 2026-10-13

Sealed paths: files matching src/**/*.ts, tests/** present at this tag.

| Step | Result | Detail |
|---|---|---|
| worktree-clean | pass |  |
| reviewed | pass | covered by closed-by-owner-21 |
| full-review | fail | MOD-01: its final content has no ACCEPT receipt at full-review; MOD-02: its final content has no ACCEPT receipt at full-review; MOD-03: its final content has no |
| full-suite | pass | exit 0 |
| rederive-all | pass | exit 0 |
| isolation-tests | pass | exit 0 (OS-12, env cleared) |
| phase4-checks | pass |  |
| structure-check | pass |  |
| emission-check | pass |  |
| s3-coverage | fail | specified but not on disk: MOD-01 → kernel/, MOD-02 → ports/, MOD-03 → catalog/, MOD-04 → reachability/, MOD-05 → facts/, MOD-06 → condition/, MOD-07 → observat |
| interface-contract | pass | written |
| declarations-match | fail | CandidateLedger.appendCandidate: contract lists 'REF', which is not a parameter of the signature; CandidateLedger.appendCandidate: contract lists 'with', which  |

**Accepted as known issues (owner triage, see RESOLUTION_RECORD.md):** full-review, s3-coverage, declarations-match

**Carried forward:**

- PC-01 (MOD-05) production concern — Storage growth as a function of success — the design's whole point is drawing many cheap candidates and never deleting them, so the better it works the more it accumulates. Also bears on MOD-06 and MOD-07 [retention; owner Developer; target a retention policy consistent with the one-at-a-time purge ruling in the sibling record system]
- PC-02 (MOD-02) production concern — Authorization and identity for the author role — the core cites the enum; who may act as HUMAN is a deployment fact. Also bears on MOD-03 [security; owner Developer; target an identity binding at the port layer]
- PC-03 (MOD-05) production concern — Concurrency on the commit path — two simultaneous commitments on one (unit, currency) [correctness under load; owner Developer; target a claim-or-collide primitive at the record port]
- PC-04 (MOD-01) production concern — Fold performance — every projection recomputes; a height-keyed cache is permitted, memoization across a record extension is not. Also bears on MOD-08, MOD-09, MOD-10 [performance; owner Developer; target a height-keyed cache with a documented invalidation rule]
- PC-05 (MOD-04) production concern — Observability of refusals — every refusal is attributable by construction; aggregation and alerting are deployment. Also bears on MOD-11 and MOD-12 [operations; owner Developer; target a refusal stream at the port layer]
- PC-06 (MOD-11) production concern — Cost estimation accuracy — the scope's estimate is external, and a systematically wrong estimate makes every ceiling wrong [correctness; owner Developer; target an estimate source with a stated error bound]
- PC-07 (MOD-10) production concern — **Display of the withheld axes** — the core returns which axis it lacks, and a UI rendering only the axes present restores exactly the silence the concept forbids, at a layer no invariant reaches [integrity; owner Developer; target a presentation contract that renders WithheldReason or fails]
- VEC-01 (MOD-04) deferred vector — discharge: compute from MOD-04 against a fixture record and re-derive independently before MOD-04 is COMPLETE
- VEC-02 (MOD-09) deferred vector — discharge: rows 1-3 computable now; **row 4 is uncomputable until AE-5's separation rule closes, and MOD-09 is not COMPLETE until it does**
- VEC-03 (MOD-08) deferred vector — discharge: compute from MOD-08 once DG-F5 selects a statistic; re-derive before MOD-08 is COMPLETE
- VEC-04 (MOD-10) deferred vector — discharge: compute from MOD-10; **the (absent, absent) row must reproduce the S1 minimal worked example step 6**
- VEC-05 (MOD-12) deferred vector — discharge: compute from MOD-12 with the external digest pinned; re-derive before MOD-12 is COMPLETE
- VEC-06 (MOD-09) deferred vector — discharge: compute from MOD-09 and MOD-12 jointly; re-derive before MOD-09 is COMPLETE
- VEC-07 (MOD-09) deferred vector — discharge: compute from MOD-09; re-derive before MOD-09 is COMPLETE
- MOD-09 deferred module — calibration
- MOD-02 ports completion status **BUILT** — `k7-pass-2`; reopened by round 3 CC-4 (POSIX-only path assertions), remediated
- MOD-01 kernel completion status **BUILT** — gate closed `closed-by-owner-5` (K7 round 5 RETURN, drift 5; executed). R-06 fixes committed `8d8376c`, battery round 6 clean; drift block lifted by owner (R-08). Re-scored at MOD-03's gate
- MOD-03 catalog completion status **BUILT** — gate closed `closed-by-owner-7` (K7 round 7 RETURN, drift 5, Fable 5.1); R-14 fixes committed; drift block lifted for MOD-04 by owner (R-16) once the battery is recorded
- MOD-05 facts completion status **BUILT** — three slices (commitments `cf5280a`, draw context `e05d9cd`, candidates `7105559`); batteries 10–12 at 24/24, 25/25 and 26/26; suite 143/143. K7 round 8 RETURN (drift 5) → fix round R-31 → **K7 round 9 PASS (drift 7)** on `00a654f`; tag `k7-pass-9` (owner). Open: WI-07 (relay forms), WI-08 (IR-59 context age), WI-09 (cosmetic); IR-53 upstream (R-30)
- MOD-04 reachability completion status **BUILT** — gate closed `closed-by-owner-11` (R-39; K7 rounds 10 and 11 RETURN, drift 6, Fable 5.1); VEC-01 computed and re-derived; work items WI-11..WI-14 done, battery 17; drift block lifted for the next module once battery 17 is recorded (R-39)
- MOD-12 lineage completion status **BUILT** — batteries 18 (14/14) and 19 (36/36); K7 round 12 RETURN, triaged by the owner (R-51): gate `closed-by-owner-12`. Carried: R-47's single-writer residue (IR-84)
- MOD-06 condition completion status **BUILT** — battery 21 (15/15); K7 round 13 RETURN, triaged by the owner (R-61): gate `closed-by-owner-13`
- MOD-07 observation completion status **BUILT** — battery 23 (11/11); K7 round 14 RETURN, triaged by the owner (R-67): gate `closed-by-owner-14`
- MOD-08 statistics completion status **BUILT** — battery 25 13/13 (receipt ACCEPT); K7 round 15 **PASS** (drift 7; k7 and full-review receipts ACCEPT); tag `k7-pass-15` on 4b55994
- MOD-09 calibration completion status **BUILT, not COMPLETE** (AE-5 open, R-69) - battery 26 16/16 (receipt ACCEPT); K7 round 16 **PASS** (drift 8; k7 and full-review receipts ACCEPT); tag `k7-pass-16` on 48f5e15
- MOD-10 diagnostic completion status **BUILT** - battery 27 10/10 (receipt ACCEPT); K7 round 17 **PASS** (drift 7; DIFF over the whole module, IR-103; k7 receipt ACCEPT); tag `k7-pass-17` on 26d8591
- MOD-11 spend completion status **BUILT** - battery 28 15/15 (receipt ACCEPT); K7 round 18 **RETURN** (drift 5); the fix round under R-84, battery 29 4/4 (receipts ACCEPT); K7 round 19 **PASS** (drift 7; k7 receipts ACCEPT); tag `k7-pass-19` on cfaafc5
- MOD-13 advisory completion status **BUILT** - battery 30 5/5 (receipt ACCEPT); K7 round 20 **RETURN** (drift 5): the fix round (IR-137), battery 31 6/6 (receipt ACCEPT); K7 round 21 **RETURN** (drift 6): owner triage R-86 - fixed test-first (IR-138), battery 32 2/2 (receipt ACCEPT), no re-check; closes on `closed-by-owner-21`
