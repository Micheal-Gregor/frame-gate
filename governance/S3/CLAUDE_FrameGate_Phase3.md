# The Frame Gate — Phase 3 (S3)

## 1. Disambiguation header

**Concept:** The Frame Gate. **S2:** `P2_FrameGate/CLAUDE_FrameGate_Phase2.md` (emission-check clean,
42 admitted nodes). **S1:** `P1_FrameGate/`. **Siblings:** `CLAUDE_Runner_Phase3.md` and
`CLAUDE_Board_Phase3.md` exist in this workspace and are **different concepts**. Never merge this
build instruction with either; never import their partition, seams or carried rules.

**What this system does.** Draw classes ("currencies") are totally ordered by cost. A draw is
**refused** unless every cheaper currency already carries a commitment for that unit — so exploration
happens where it is affordable, and the expensive currency is unreachable until the cheap one has
committed. Over an append-only record the system derives a diagnostic with two independently
available axes: **dispersion**, computable at n ≥ 3, and **location**, computable only against a
threshold that is **observed from the operator's own accept/reject behaviour and never supplied**.
When an axis is unavailable the system reports *which* one and *what would supply it*. This system
owns no renderer, no credential, no media bytes and no scoring algorithm.

**⚠ MODULE NUMBERING CROSSWALK — read before carrying any identifier forward.**
S1 numbered eighteen specification modules `MOD-01…MOD-18` **before the emission contract existed**.
The contract mints `MOD-nn` in Phase 3 §2, so **S1's numbers are legacy labels, not contract
identifiers, and the numbering below is authoritative.** The two are misleadingly compatible: S2 §2's
`Traces to` column cites S1 numbers, so an identifier carried forward lands in a real module that is
the wrong one. Five of five facet agents reported this independently.

| S1 legacy label | Was | Phase 3 module |
|---|---|---|
| S1 MOD-01 CurrencyOrder | currency order | MOD-03 `catalog/` |
| S1 MOD-02 UnitRegistry | units + declarations | MOD-03 `catalog/` |
| S1 MOD-03 CandidateStore | candidates | MOD-05 `facts/` |
| S1 MOD-04 CommitmentLedger | commitments | MOD-05 `facts/` |
| S1 MOD-05 ReachabilityGate | the refusal | MOD-04 `reachability/` |
| S1 MOD-06 ConditionRegistry | conditions | MOD-06 `condition/` |
| S1 MOD-07 SampleProjection | samples | MOD-06 `condition/` |
| S1 MOD-08 ObservationStore | observations | MOD-07 `observation/` |
| S1 MOD-09 DispersionProjection | σ, μ | MOD-08 `statistics/` |
| S1 MOD-10 BarProjection | θ, populations | MOD-09 `calibration/` |
| S1 MOD-11 DiagnosticComposer | Δ | MOD-10 `diagnostic/` |
| S1 MOD-12 ScopeAuthority | scopes | MOD-11 `spend/` |
| S1 MOD-13 InvalidationEngine | invalidation | MOD-12 `lineage/` |
| S1 MOD-14 SignatureBinder | signatures | MOD-12 `lineage/` |
| S1 MOD-15 DrawContextLog | draw context | MOD-05 `facts/` |
| S1 MOD-16 RatioProjection | the ratio | MOD-11 `spend/` |
| S1 MOD-17 ExternalRegistry | externals | MOD-02 `ports/` |
| S1 MOD-18 DifficultyAdvisory | difficulty | MOD-13 `advisory/` |

**Owner rulings incorporated.** DG-F1 — difficulty is advisory, read by nothing. DG-F4 — the ratio is
surfaced at the authorization, hook `HOOK-09`, blocking the form and never the spend.

**Counts.** S1's prose says "eighteen refusal tests" and "Hooks — eight" while its own enumerations
run to nineteen and nine; `REF-19` and `HOOK-09` both arrived with DG-F4 after that prose was
written. **19 and 9 are correct. A tenth hook is a defect, not an improvement.**

## 2. Resolved partition

| ID | Module | File | Owns OBJ | Status |
|---|---|---|---|---|
| MOD-01 | kernel | `kernel/` | OBJ-01, OBJ-02, OBJ-03, OBJ-04, OBJ-10 | ACTIVE |
| MOD-02 | ports | `ports/` | OBJ-35, OBJ-36, OBJ-37, OBJ-38, OBJ-39 | ACTIVE |
| MOD-03 | catalog | `catalog/` | OBJ-05, OBJ-06, OBJ-13 | ACTIVE |
| MOD-04 | reachability | `reachability/` | OBJ-24, OBJ-29 | ACTIVE |
| MOD-05 | facts | `facts/` | OBJ-11, OBJ-12, OBJ-16, OBJ-31 | ACTIVE |
| MOD-06 | condition | `condition/` | OBJ-07, OBJ-17, OBJ-19, OBJ-27 | ACTIVE |
| MOD-07 | observation | `observation/` | OBJ-08, OBJ-09, OBJ-15 | ACTIVE |
| MOD-08 | statistics | `statistics/` | OBJ-20, OBJ-21 | ACTIVE |
| MOD-09 | calibration | `calibration/` | OBJ-22, OBJ-23 | DEFERRED |
| MOD-10 | diagnostic | `diagnostic/` | OBJ-25, OBJ-41, OBJ-42 | ACTIVE |
| MOD-11 | spend | `spend/` | OBJ-14, OBJ-26, OBJ-30, OBJ-33, OBJ-40 | ACTIVE |
| MOD-12 | lineage | `lineage/` | OBJ-18, OBJ-28, OBJ-32 | ACTIVE |
| MOD-13 | advisory | `advisory/` | OBJ-34 | ACTIVE |

**MOD-09 is `DEFERRED`, not blocked.** Its objects, codomain, populations and exclusion counts are
all proven; what is open is AE-5's separation *rule*, held `NO_DEFAULT` behind the bar interface. It
is built; it is not *complete* until AE-5 closes and `VEC-02`'s fourth row can be computed.

**ODG-FG-01 satisfied, mechanically.** The ten Projections (OBJ-19…OBJ-28) are spread across seven
modules; **the maximum any one module owns is 2 of 10.** No module can see enough of the family to
switch on it, so the `kind`-switch collapse is unwritable rather than merely discouraged.

## 3. Object-to-module map

| OBJ | MOD | Role |
|---|---|---|
| OBJ-01 | MOD-01 | AppendedFact abstract base — append-only contract, no behaviour |
| OBJ-02 | MOD-01 | Projection abstract base — defined by a fixed ten-name membership list; MOD-01 exports no membership predicate |
| OBJ-03 | MOD-01 | Gate abstract base — mandatory ON_FAIL, closed_by, proposals_in, records |
| OBJ-04 | MOD-01 | Unknown — closed family of five; Absent is not a member |
| OBJ-10 | MOD-01 | RecordHeight — the pin every projection is defined against |
| OBJ-35 | MOD-02 | RecordPort — append and read; the only path to the record |
| OBJ-36 | MOD-02 | RendererPort — cited, never defined |
| OBJ-37 | MOD-02 | DispatchPort — carries the dispatch-semantics citation (DG-F3) |
| OBJ-38 | MOD-02 | AuthorEnum — ENGINE and DIRECTOR may only propose |
| OBJ-39 | MOD-02 | DigestPort — pinned externally, never chosen here |
| OBJ-05 | MOD-03 | Currency — configuration, read-only after load; the number two appears nowhere |
| OBJ-06 | MOD-03 | Unit — the subject of draws and commitments |
| OBJ-13 | MOD-03 | Declaration — appended act, never a field; `declaration_at(unit, height)` only |
| OBJ-24 | MOD-04 | Reachability — the fold `∀c'<c : effective(u,c') ≠ ⊥` |
| OBJ-29 | MOD-04 | ReachabilityGate — the refusal; one gate for all currencies |
| OBJ-11 | MOD-05 | Candidate — unit, currency, condition, seed, lineage |
| OBJ-12 | MOD-05 | Commitment — effective() is a fold, never stored |
| OBJ-16 | MOD-05 | DrawContext — draw-time features, recorded declaration, later resolution label |
| OBJ-31 | MOD-05 | CommitGate — closed_by HUMAN_ACT; diagnostic in proposals_in only |
| OBJ-07 | MOD-06 | ConditionIdentity — over the complete draw-input set, not an enumerated list |
| OBJ-17 | MOD-06 | PromptRevision — the appended act; a changed cited reference is one |
| OBJ-19 | MOD-06 | Sample — membership by condition identity, never a time window |
| OBJ-27 | MOD-06 | Chain — maximal run of inherited units; the critical path |
| OBJ-08 | MOD-07 | Score — component value |
| OBJ-09 | MOD-07 | Absent — in-band non-value with a discharge condition |
| OBJ-15 | MOD-07 | Observation — component vector with per-component author |
| OBJ-20 | MOD-08 | Dispersion — floor of three; below it, Undetermined(AE-3) |
| OBJ-21 | MOD-08 | Location — centre statistic only; **does not take θ** (S5 §3) |
| OBJ-22 | MOD-09 | Bar — θ or ⊥ with cause and discharge condition; no setter exists |
| OBJ-23 | MOD-09 | PopulationPartition — non-monotone; computed as-of, never accumulated |
| OBJ-25 | MOD-10 | Diagnostic — product of two independent classifiers; applies both |
| OBJ-41 | MOD-10 | DiagnosticAxis — one axis, present or absent |
| OBJ-42 | MOD-10 | WithheldReason — which axis is missing and what would supply it |
| OBJ-14 | MOD-11 | Scope — appended before any draw; spent, never edited |
| OBJ-26 | MOD-11 | Ratio — vector in every representation; never a quotient |
| OBJ-30 | MOD-11 | ScopeGate — one code path over the currency order |
| OBJ-33 | MOD-11 | StopCondition — conditionally-existing member, not a nullable field |
| OBJ-40 | MOD-11 | AuthorizationForm — domain object (ODG-FG-02); built with its ratio or not built |
| OBJ-18 | MOD-12 | Invalidation — the appended act |
| OBJ-28 | MOD-12 | InvalidationScope — transitive closure over lineage, derived before the act |
| OBJ-32 | MOD-12 | SignatureGate — signature covers the lineage digest or is malformed |
| OBJ-34 | MOD-13 | DifficultyAdvisory — computed, displayed, read by nothing |

## 4. Seam contracts

| ID | Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule |
|---|---|---|---|---|---|
| SEAM-01 | MOD-03 | MOD-04 | ordered predecessor set of a currency | hard | order total and finite; a least element exists |
| SEAM-02 | MOD-05 | MOD-04 | effective commitment per (unit, currency), or ⊥ | hard | ⊥ is a value; never coalesced |
| SEAM-03 | MOD-04 | MOD-05 | admission, or Refuse(unreachable) | hard | no append path to MOD-05 bypasses this seam; no third outcome |
| SEAM-04 | MOD-11 | MOD-05 | the governing scope and its remaining ceiling | hard | ceiling not exceeded; the scope is never edited |
| SEAM-05 | MOD-03 | MOD-05 | the declaration in force at draw time | hard | a draw with no declaration at that height is refused |
| SEAM-06 | MOD-01 | MOD-05 | the append primitive and the record height | hard | append-only; no update, no delete |
| SEAM-07 | MOD-06 | MOD-08 | the sample and its cardinality | hard | cardinality < 3 yields Undetermined(AE-3) and no numeric result |
| SEAM-08 | MOD-07 | MOD-08 | component values, some ABSENT | hard | ABSENT never enters an arithmetic expression |
| SEAM-09 | MOD-07 | MOD-09 | scores of accepted and passed-over candidates | hard | no observation means no population, and the candidate is counted as excluded |
| SEAM-10 | MOD-05 | MOD-09 | the declaration recorded at draw time | hard | population membership never reads a current declaration |
| SEAM-11 | MOD-12 | MOD-09 | the set of candidates whose commitment was invalidated | hard | each moves Accepted to PassedOver; the union is monotone, the partition is not |
| SEAM-12 | MOD-08 | MOD-10 | dispersion, or Undetermined(AE-3) | hard | the unknown propagates as itself, never coalesced |
| SEAM-13 | MOD-09 | MOD-10 | θ, or ⊥ with cause and discharge condition | hard | ⊥ means the location axis is withheld, never estimated |
| SEAM-14 | MOD-10 | MOD-05 | a proposal only, never a precondition | soft | no act signature accepts a diagnostic as an argument |
| SEAM-15 | MOD-09 | MOD-11 | whether θ exists, hence whether a stop condition is expressible | hard | θ = ⊥ means a stop condition is refused, not defaulted |
| SEAM-16 | MOD-11 | MOD-11 | the per-unit draw vector into the authorization form | hard | vector never a quotient; the form is built with it or is not built |
| SEAM-17 | MOD-05 | MOD-12 | the superseded commitment identity | hard | the scope is derived before the append, never after |
| SEAM-18 | MOD-12 | MOD-05 | the derived scope, for display before the act | hard | the human sees the count before the commitment is appended |
| SEAM-19 | MOD-05 | MOD-12 | the commitment digest a derived candidate binds | hard | omitting it is malformed at parse, not false at runtime |
| SEAM-20 | MOD-02 | MOD-05 | the record append and read primitives | hard | reached only through MOD-02; no other module imports an external |
| SEAM-21 | MOD-02 | MOD-12 | the digest function | hard | pinned externally; never chosen here |
| SEAM-22 | MOD-05 | MOD-11 | per-unit candidate counts indexed by currency | hard | counts only; never summed, never divided |
| SEAM-23 | MOD-06 | MOD-09 | sample closure — by commitment or by revision | hard | a revision closes the sample for calibration while voiding it for dispersion |
| SEAM-24 | MOD-02 | MOD-11 | dispatch semantics: a scope is spent by dispatch, not by return | hard | cited from the external contract, never restated here (DG-F3) |
| SEAM-25 | MOD-02 | MOD-07 | the author enum | hard | ENGINE and DIRECTOR may only propose |
| SEAM-26 | MOD-03 | MOD-11 | the currency set indexing the ratio vector | hard | indexed by currency; never summed or divided |
| SEAM-27 | MOD-03 | MOD-13 | unit features, read-only | soft | difficulty flows out to display and into nothing |
| SEAM-28 | MOD-01 | MOD-09 | the record height every population is computed as-of | hard | populations are computed as-of, never accumulated |

## 5. Refusal tests (CT-4)

| ID | MOD | Invariant | Forbidden input | Expected rejection | Test name |
|---|---|---|---|---|---|
| REF-01 | MOD-03 | INV-PROV | a derivation producing a declaration | malformed at parse | test_declaration_from_derivation_is_malformed |
| REF-02 | MOD-02 | external isolation | a module other than MOD-02 importing an external | malformed at parse | test_external_import_outside_ports_is_malformed |
| REF-03 | MOD-04 | INV-REACH | a draw in a currency with no commitment below it | Refuse(unreachable); no candidate created, no cost incurred | test_draw_without_cheaper_commitment_is_refused |
| REF-04 | MOD-12 | INV-SIG | a signature omitting the lineage digest | Refuse(malformed-signature) | test_signature_without_lineage_digest_is_refused |
| REF-05 | MOD-05 | declaration-before-draw | a draw at a height where no declaration was in force | Refuse(no-declaration) | test_draw_without_declaration_is_refused |
| REF-06 | MOD-05 | proposals-not-preconditions | an act signature that accepts a diagnostic | no such signature exists | test_no_act_signature_accepts_diagnostic |
| REF-07 | MOD-12 | scope-before-act | appending a re-commitment before deriving its scope | refused | test_append_before_scope_derivation_is_refused |
| REF-08 | MOD-08 | dispersion floor | a sample of exactly two | Undetermined(AE-3); no numeric result | test_dispersion_below_floor_returns_undetermined |
| REF-09 | MOD-07 | INV-ABSENT | an expression combining a value with an ABSENT sibling | malformed at parse | test_arithmetic_on_absent_component_is_malformed |
| REF-10 | MOD-06 | INV-SAMPLE | draws under different conditions queried as one sample | empty intersection, never a union | test_cross_condition_sample_query_is_empty |
| REF-11 | MOD-09 | bar existence | a bar query with either population empty | ⊥ plus cause, returned before the separation operator runs | test_bar_with_empty_population_returns_bottom |
| REF-12 | MOD-09 | INV-NOBAR | any attempt to set, configure or default the threshold | malformed at parse | test_threshold_assignment_is_malformed |
| REF-13 | MOD-09 | X21 population move | querying the bar after an invalidation | the candidate appears in PassedOver, not Accepted | test_invalidated_commitment_moves_to_passed_over |
| REF-14 | MOD-09 | INV-COUNT | populations containing unobserved members | non-zero excluded counts for both populations | test_exclusion_counts_present_on_both_populations |
| REF-15 | MOD-11 | stop-condition existence | a scope authorized with a stop condition while θ is ⊥ | Refuse(no-bar) | test_stop_condition_without_bar_is_refused |
| REF-16 | MOD-11 | INV-SCOPE | drawing the N+1th candidate under a ceiling of N | Refuse(scope-exceeded) | test_draw_beyond_scope_ceiling_is_refused |
| REF-17 | MOD-11 | scope immutability | any edit to an appended scope | no such path exists | test_no_mutating_signature_on_scope |
| REF-18 | MOD-11 | ratio vectorial | the ratio rendered as a quotient | malformed | test_ratio_as_quotient_is_malformed |
| REF-19 | MOD-11 | HOOK-09 | an authorization form above the least currency omitting the draw vector | refused | test_authorization_without_ratio_is_refused |

**Positive counterparts are specified for all nineteen in the facet slices.** A guard that refuses
everything passes no test here. Six rejections are parse-level (REF-01, REF-02, REF-06, REF-09,
REF-12, REF-17) — the stronger form: a malformed definition cannot be argued with at runtime.

## 6. Golden vectors (CT-5)

| ID | MOD | Pinned value | Rule | Input | Output | Encoding | State | Discharge condition |
|---|---|---|---|---|---|---|---|---|
| VEC-01 | MOD-04 | reachability truth table over a three-currency set | admission holds iff every currency strictly below the requested one carries a non-⊥ effective commitment; vacuously true at the least currency | commitment sets {}, {c1}, {c1,c2} × requested currency c1, c2, c3 | ADMIT or Refuse(unreachable) per cell | utf8-json | DEFERRED | compute from MOD-04 against a fixture record and re-derive independently before MOD-04 is COMPLETE |
| VEC-02 | MOD-09 | bar across four population states | the bar is the boundary the accepted and passed-over populations imply, and is ⊥ whenever either is empty or the two fail to separate | populations: both empty; one empty; both populated and overlapping; both populated and separated | ⊥+cause, ⊥+cause, ⊥+cause, θ+sample size | utf8-json | DEFERRED | rows 1-3 computable now; **row 4 is uncomputable until AE-5's separation rule closes, and MOD-09 is not COMPLETE until it does** |
| VEC-03 | MOD-08 | dispersion at n = 2, 3, 4 | dispersion is undefined below three members and is a spread measure over the sample's scores at or above it | a fixed score set truncated to 2, 3 and 4 members | Undetermined(AE-3), value, value | utf8-json | DEFERRED | compute from MOD-08 once DG-F5 selects a statistic; re-derive before MOD-08 is COMPLETE |
| VEC-04 | MOD-10 | the diagnostic tuple across four availability combinations | the diagnostic is the product of two independent classifiers; an unavailable axis is withheld with a reason and never estimated | (dispersion present/absent) × (threshold present/absent) | four tuples, each naming its withheld axes | utf8-json | DEFERRED | compute from MOD-10; **the (absent, absent) row must reproduce the S1 minimal worked example step 6** |
| VEC-05 | MOD-12 | signature with and without the lineage digest | a candidate's signature digests its complete emission including the digest of the commitment it derives from | one candidate, signed both ways | two digests that differ | hex-sha256 | DEFERRED | compute from MOD-12 with the external digest pinned; re-derive before MOD-12 is COMPLETE |
| VEC-06 | MOD-09 | population membership before and after an invalidation | an invalidated commitment's candidate leaves Accepted and enters PassedOver; the union is unchanged | one commitment, then its invalidation | two partitions with the same union and different members | utf8-json | DEFERRED | compute from MOD-09 and MOD-12 jointly; re-derive before MOD-09 is COMPLETE |
| VEC-07 | MOD-09 | exclusion counts with unobserved members on both sides | a candidate with no observation joins no population and is counted as excluded from the side it would have joined | a fixture with unobserved members in both populations | non-zero counts on both sides | utf8-json | DEFERRED | compute from MOD-09; re-derive before MOD-09 is COMPLETE |

**No vector may be transcribed, estimated or hand-written.** Each rule above is stated independently
of its vector, as CT-5 requires. **MOD-01, MOD-02, MOD-03, MOD-05, MOD-06, MOD-07, MOD-11 and MOD-13
pin no value — N/A-by-absence, not a silent pass.** A later vector against any of them is a new
obligation, not a discovered one.

## 7. Hook manifest (CT-6)

| ID | MOD | Trigger | Condition | Block action | Registered at |
|---|---|---|---|---|---|
| HOOK-01 | MOD-04 | before-candidate-append | the reachability check returns ADMIT | reject the append; emit Refuse(unreachable) | MOD-04 |
| HOOK-02 | MOD-07 | before-arithmetic-on-observation | no operand is ABSENT | fail at parse; the definition is malformed | MOD-07 |
| HOOK-03 | MOD-09 | before-threshold-read | the value originates from the bar projection | reject any literal, configured or defaulted threshold | MOD-09 |
| HOOK-04 | MOD-12 | before-candidate-append | the signature covers the lineage digest | reject; emit Refuse(malformed-signature) | MOD-12 |
| HOOK-05 | MOD-11 | before-draw | a scope exists with remaining greater than zero | reject; emit Refuse(scope-exceeded) | MOD-11 |
| HOOK-06 | MOD-06 | before-sample-assembly | all members share one condition identity | reject the assembly | MOD-06 |
| HOOK-07 | MOD-03 | before-declaration-write | the author is HUMAN and no derivation is in the call chain | fail at parse | MOD-03 |
| HOOK-08 | MOD-09 | before-bar-return | exclusion counts are present for both populations | reject the return value | MOD-09 |
| HOOK-09 | MOD-11 | before-scope-authorization-above-least-currency | the per-unit draw vector is present in the authorization payload | reject the authorization form, never the spend | MOD-11 |

```
HOOK HOOK-01 @before-candidate-append { condition: reachability check returns ADMIT, BLOCK: reject the append and emit Refuse(unreachable) }
HOOK HOOK-02 @before-arithmetic-on-observation { condition: no operand is ABSENT, BLOCK: fail at parse, the definition is malformed }
HOOK HOOK-03 @before-threshold-read { condition: the value originates from the bar projection, BLOCK: reject any literal, configured or defaulted threshold }
HOOK HOOK-04 @before-candidate-append { condition: signature covers the lineage digest, BLOCK: reject and emit Refuse(malformed-signature) }
HOOK HOOK-05 @before-draw { condition: a scope exists with remaining > 0, BLOCK: reject and emit Refuse(scope-exceeded) }
HOOK HOOK-06 @before-sample-assembly { condition: all members share one condition identity, BLOCK: reject the assembly }
HOOK HOOK-07 @before-declaration-write { condition: author is HUMAN and no derivation is in the call chain, BLOCK: fail at parse }
HOOK HOOK-08 @before-bar-return { condition: exclusion counts present for BOTH populations, BLOCK: reject the return value }
HOOK HOOK-09 @before-scope-authorization-above-least-currency { condition: the per-unit draw vector is present in the authorization payload, BLOCK: reject the AUTHORIZATION FORM, never the spend }
```

**Nine hooks. A tenth is a defect, not an improvement.** The payload is inherited from S1 and S2;
Phase 3 operationalized the bindings and generated nothing.

**Fidelity note on HOOK-05, carried openly rather than edited silently.** The inherited text read
*"an **unexpired** scope exists with remaining > 0."* **No expiry field or rule is proven anywhere in
S1 or S2.** The condition above is restated to what is proven; the original wording is preserved here
so the discrepancy travels forward. If expiry is wanted it is a new field (`ODG-FG-05`), not a
rediscovered one.

**Registration placement is load-bearing.** HOOK-01 and HOOK-04 are registered at MOD-04 and MOD-12
rather than at the append site in MOD-05. This is what keeps the apparent `MOD-04 ↔ MOD-05` and
`MOD-05 ↔ MOD-12` cycles from being real: the call runs one way and the *registration* runs the
other, and a registration is not an import. Do not "simplify" this.

## 8. Production concerns

| ID | MOD | Concern | Class | Owner | Discharge target |
|---|---|---|---|---|---|
| PC-01 | MOD-05 | Storage growth as a function of success — the design's whole point is drawing many cheap candidates and never deleting them, so the better it works the more it accumulates. Also bears on MOD-06 and MOD-07 | retention | Developer | a retention policy consistent with the one-at-a-time purge ruling in the sibling record system |
| PC-02 | MOD-02 | Authorization and identity for the author role — the core cites the enum; who may act as HUMAN is a deployment fact. Also bears on MOD-03 | security | Developer | an identity binding at the port layer |
| PC-03 | MOD-05 | Concurrency on the commit path — two simultaneous commitments on one (unit, currency) | correctness under load | Developer | a claim-or-collide primitive at the record port |
| PC-04 | MOD-01 | Fold performance — every projection recomputes; a height-keyed cache is permitted, memoization across a record extension is not. Also bears on MOD-08, MOD-09, MOD-10 | performance | Developer | a height-keyed cache with a documented invalidation rule |
| PC-05 | MOD-04 | Observability of refusals — every refusal is attributable by construction; aggregation and alerting are deployment. Also bears on MOD-11 and MOD-12 | operations | Developer | a refusal stream at the port layer |
| PC-06 | MOD-11 | Cost estimation accuracy — the scope's estimate is external, and a systematically wrong estimate makes every ceiling wrong | correctness | Developer | an estimate source with a stated error bound |
| PC-07 | MOD-10 | **Display of the withheld axes** — the core returns which axis it lacks, and a UI rendering only the axes present restores exactly the silence the concept forbids, at a layer no invariant reaches | integrity | Developer | a presentation contract that renders WithheldReason or fails |

**PC-07 is the one to watch.** It is the only production concern that can defeat a concept-level
guarantee while every module remains conformant.

## 9. Open decision gates

| Gate | Decision | Blocking | What resolves it |
|---|---|---|---|
| AE-5 | What rule constitutes separation of the two populations. **No default may be supplied.** | No — MOD-09 is BUILT, not COMPLETE | a declaration level whose two populations both reach a floor and separate |
| AE-3 | Are same-condition draws independent across seeds? Only OBJ-20 reads it; if false, dispersion is wrong and nothing else is | No | observed serial correlation across seeds |
| AE-4 | Is accept/reject behaviour stationary enough for pooled history? | No | threshold drift exceeding its own spread across epochs |
| DG-F3 | A scope is spent by dispatch, not by return — **cite at SEAM-24, never restate** | No | recording the citation |
| DG-F5 | Which dispersion and location statistics | No | a bounded implementation decision; any statistic honest at n = 3 |
| ODG-FG-03 | Does an all-ABSENT candidate count toward the dispersion floor of three? F3's reading is no — otherwise three unobserved candidates satisfy a floor that exists to make variance estimable | No | an owner or implementer ruling at MOD-08 |
| ODG-FG-04 | Who carries the undischargeable-ABSENT bound forward — MOD-09's exclusion counts or OBJ-42 WithheldReason? | No | a placement decision at the MOD-07 boundary |
| ODG-FG-05 | Scope expiry — implied by the inherited hook text, proven nowhere | No | if wanted, a new field on OBJ-14 |
| ODG-FG-06 | "Independent unit" — the predicate licensing a null lineage — is stated as a constraint and owned by no object | No | assign it to MOD-03 |
| ODG-FG-07 | Which member of the Unknown family θ = ⊥ carries. MOD-01 declined to choose; choosing would place a MOD-09 ruling in the kernel | No | a MOD-09 decision surfaced to MOD-01 |

**ODG-FG-01 and ODG-FG-02 are RESOLVED at C0** — the partition spreads the ten Projections across
seven modules at a maximum of two each, and OBJ-40 is a domain object in MOD-11 so HOOK-09 registers
inside the invariant-bearing core rather than in a view.

## 10. Build order

1. **MOD-02 `ports/`** — nothing else may name an external, so this comes first.
2. **MOD-01 `kernel/`** — the three bases, the closed Unknown family, RecordHeight. Export **no**
   Projection membership predicate.
3. **MOD-03 `catalog/`** — currency order, units, declarations. `declaration_at(unit, height)` only.
4. **MOD-05 `facts/`** — candidates, commitments, draw context, the commit gate.
5. **MOD-04 `reachability/`** — **the concept.** Small, and `REF-03` tests it completely. Everything
   else can wait behind it.
6. MOD-12 `lineage/` · MOD-06 `condition/` · MOD-07 `observation/`
7. MOD-08 `statistics/` · MOD-09 `calibration/` (BUILT, not COMPLETE until AE-5)
8. MOD-10 `diagnostic/` · MOD-11 `spend/`
9. MOD-13 `advisory/`

## 11. Module completion checklist

| MOD | CT-1 | CT-2 | CT-3 | CT-4 | CT-5 | CT-6 | PC enum | Readiness |
|---|---|---|---|---|---|---|---|---|
| MOD-01 | pass | pass | pass | N/A-by-absence | N/A-by-absence | N/A-by-absence | PC-04 | NOT_STARTED |
| MOD-02 | pass | pass | pass | REF-02 | N/A-by-absence | N/A-by-absence | PC-02 | NOT_STARTED |
| MOD-03 | pass | pass | pass | REF-01 | N/A-by-absence | HOOK-07 | PC-02 | NOT_STARTED |
| MOD-04 | pass | pass | pass | REF-03 | VEC-01 | HOOK-01 | PC-05 | NOT_STARTED |
| MOD-05 | pass | pass | pass | REF-05, REF-06 | N/A-by-absence | N/A-by-absence | PC-01, PC-03 | NOT_STARTED |
| MOD-06 | pass | pass | pass | REF-10 | N/A-by-absence | HOOK-06 | PC-01 | NOT_STARTED |
| MOD-07 | pass | pass | pass | REF-09 | N/A-by-absence | HOOK-02 | PC-01 | NOT_STARTED |
| MOD-08 | pass | pass | pass | REF-08 | VEC-03 | N/A-by-absence | PC-04 | NOT_STARTED |
| MOD-09 | pass | pass | pass | REF-11, REF-12, REF-13, REF-14 | VEC-02, VEC-06, VEC-07 | HOOK-03, HOOK-08 | PC-04 | NOT_STARTED |
| MOD-10 | pass | pass | pass | N/A-by-absence | VEC-04 | N/A-by-absence | PC-04, PC-07 | NOT_STARTED |
| MOD-11 | pass | pass | pass | REF-15, REF-16, REF-17, REF-18, REF-19 | N/A-by-absence | HOOK-05, HOOK-09 | PC-05, PC-06 | NOT_STARTED |
| MOD-12 | pass | pass | pass | REF-04, REF-07 | VEC-05 | HOOK-04 | PC-05 | NOT_STARTED |
| MOD-13 | pass | pass | pass | N/A-by-absence | N/A-by-absence | N/A-by-absence | N/A-by-absence | NOT_STARTED |

**BUILT** means code exists and its suite is green. **COMPLETE** additionally means CT-1…CT-6 are all
discharged — every deferred vector computed from the real implementation and independently
re-derived. **MOD-09 cannot reach COMPLETE until AE-5 closes**, because VEC-02's fourth row is
uncomputable before then. That is a designed incompleteness, not a defect.

**The self-reliance point, restated once more because it is where this build is most fragile.** The
Projection family (OBJ-02) is defined by a **fixed ten-name membership list**, not by a property. Any
module that re-derives it from "anything stateless," "anything pure," or "anything taking a record
height" silently readmits OBJ-34 DifficultyAdvisory and defeats owner ruling DG-F1. MOD-01 exports no
membership predicate precisely so the question cannot be asked and answered by shape.
