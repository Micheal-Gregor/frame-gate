# Object Model & Parameters — The Frame Gate build

Rule: every module appears here BEFORE it is written; if it isn't here, propose the addition
first. Every entry traces to an admitted S3/S2 node (CC-1). The `File` column is what CC-1
checks against the tree, in both directions.

## Modules

| Module | File | Traces to | Responsibility | Declared inputs (OS-1) | Decides | Status |
|---|---|---|---|---|---|---|
| MOD-02 ports | src/ports/index.ts | OBJ-35..OBJ-39 | The only module that may name an external: record, renderer, dispatch, author enum, digest | n/a — port interfaces only; no class | NO — cites externals; decides nothing | BUILT |
| MOD-01 kernel | src/kernel/index.ts | OBJ-01, OBJ-02, OBJ-03, OBJ-04, OBJ-10 | The three abstract bases, the closed five-member Unknown family, RecordHeight. Exports NO Projection membership predicate | n/a — exports types, branded values and pure functions; no class | NO — bases, a closed family and an order; no business question | BUILT |
| MOD-03 catalog | src/catalog/index.ts | OBJ-05, OBJ-06, OBJ-13 | Currency order (configuration, read-only), Unit, Declaration as an appended act with declaration_at only | n/a — the module's public surface (re-exports); its classes have rows below | NO | BUILT |
| MOD-05 facts | src/facts/index.ts | OBJ-11, OBJ-12, OBJ-16, OBJ-31 | Candidate, Commitment (effective() is a fold), DrawContext, CommitGate | n/a — the module's public surface (re-exports); its classes have rows below | NO | BUILDING |
| MOD-04 reachability | src/reachability/index.ts | OBJ-24, OBJ-29 | THE CONCEPT. One gate quantified over the currency order; REF-03 tests it completely | — written by `tools/new-object.py` at build | — set at build (S3 predates the Decides tag; IR) | NOT_STARTED |
| MOD-12 lineage | src/lineage/index.ts | OBJ-18, OBJ-28, OBJ-32 | Invalidation, its transitive-closure scope derived before the act, SignatureGate | — written by `tools/new-object.py` at build | — set at build (S3 predates the Decides tag; IR) | NOT_STARTED |
| MOD-06 condition | src/condition/index.ts | OBJ-07, OBJ-17, OBJ-19, OBJ-27 | ConditionIdentity over the complete draw-input set, PromptRevision, Sample, Chain | — written by `tools/new-object.py` at build | — set at build (S3 predates the Decides tag; IR) | NOT_STARTED |
| MOD-07 observation | src/observation/index.ts | OBJ-08, OBJ-09, OBJ-15 | Score, Absent (in-band, with discharge condition), Observation vector. One module by seam pricing P-1: a syntactic guard dies at a boundary | — written by `tools/new-object.py` at build | — set at build (S3 predates the Decides tag; IR) | NOT_STARTED |
| MOD-08 statistics | src/statistics/index.ts | OBJ-20, OBJ-21 | Dispersion with the floor of three; Location is a centre statistic and does NOT take a threshold (S5 contradiction path) | — written by `tools/new-object.py` at build | — set at build (S3 predates the Decides tag; IR) | NOT_STARTED |
| MOD-09 calibration | src/calibration/index.ts | OBJ-22, OBJ-23 | Bar (no setter exists) and the non-monotone PopulationPartition. DEFERRED: BUILT reachable, COMPLETE blocked by AE-5 | — written by `tools/new-object.py` at build | — set at build (S3 predates the Decides tag; IR) | NOT_STARTED |
| MOD-10 diagnostic | src/diagnostic/index.ts | OBJ-25, OBJ-41, OBJ-42 | The product of two independent classifiers; carries which axis is withheld and what would supply it | — written by `tools/new-object.py` at build | — set at build (S3 predates the Decides tag; IR) | NOT_STARTED |
| MOD-11 spend | src/spend/index.ts | OBJ-14, OBJ-26, OBJ-30, OBJ-33, OBJ-40 | Scope, Ratio (vector always), ScopeGate, StopCondition, AuthorizationForm as a domain object | — written by `tools/new-object.py` at build | — set at build (S3 predates the Decides tag; IR) | NOT_STARTED |
| MOD-13 advisory | src/advisory/index.ts | OBJ-34 | DifficultyAdvisory: computed, displayed, read by nothing | — written by `tools/new-object.py` at build | — set at build (S3 predates the Decides tag; IR) | NOT_STARTED |
| MOD-03 · CurrencyOrder | src/catalog/currency-order.ts | OBJ-05 | The total order of draw classes, loaded once and read-only | currencies | NO | BUILT |
| MOD-03 · UnitRegistry | src/catalog/unit-registry.ts | OBJ-06 | Unit identities and their read-only features | units | NO | BUILT |
| MOD-03 · DeclarationLedger | src/catalog/declaration-ledger.ts | OBJ-13 | Appends HUMAN classification declarations; reads the one in force at a height | record, levels | NO | BUILT |
| MOD-03 · IndependenceLedger | src/catalog/independence-ledger.ts | OBJ-06/ODG-FG-06 (R-10) | Appends HUMAN independence acts; reads the one in force at a height | record | NO | BUILT |
| MOD-05 · CommitmentLedger | src/facts/commitment-ledger.ts | OBJ-12, OBJ-31 | Appends HUMAN commitments; folds the effective commitment per (unit, currency) as of a height | record, invalidations | NO | BUILT |
| MOD-05 · DrawContextLog | src/facts/draw-context-log.ts | OBJ-16 (R-21..R-24) | Appends draw contexts (declaration read at the draw height, REF-05) and their later resolution labels; reads draws and resolutions as of a height | record, declarations | NO | BUILT |
| MOD-05 · CandidateLedger | src/facts/candidate-ledger.ts | OBJ-11 (R-18, R-25..R-28) | The one guarded candidate append (admission, from, signature, ceiling - in that order) and the as-of reads by condition, by lineage and as per-currency counts | record, commitments, currencies, independence, admission, signatures, ceiling | NO | BUILT |

Rows are in build order (S3 section 10), not module-number order.

## Parameters / extension points

- **Currency set** — data, not structure (SC-3). The number two appears nowhere; no cheap/expensive branch.
- **Dispersion and location statistics** — DG-F5, deliberately unpinned. Any statistic honest at n=3.
- **Separation rule** — AE-5, `NO_DEFAULT`. No value may be supplied. MOD-09 stays DEFERRED until it closes.
- **Scaffold/scope expiry** — ODG-FG-05: implied by inherited hook text, proven nowhere. Not a knob until it is.
