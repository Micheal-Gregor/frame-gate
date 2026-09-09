# F3 · Evidence — The Frame Gate, Phase 3 facet slice

**Owns:** MOD-06 `condition/`, MOD-07 `observation/`, MOD-08 `statistics/`
**Anchors:** S2 `P2_FrameGate/CLAUDE_FrameGate_Phase2.md` (fixed, never edited); C0 `P3_FrameGate/C0-coordinator.md` §3 partition, §2 pricing; S1 `P1_FrameGate/CLAUDE_FrameGate.md` for verification payload wording.

---

## 1. Facet scope and carried judgment

F3 owns the **evidence side**: what a sample is, what an observation is, and what may be computed from them. It owns nine of the forty-two nodes — OBJ-07, OBJ-17, OBJ-19, OBJ-27 (MOD-06); OBJ-08, OBJ-09, OBJ-15 (MOD-07); OBJ-20, OBJ-21 (MOD-08) — across three modules. It owns no gate, no threshold, no population, no diagnostic assembly and no spend.

Four judgments are carried into this slice and are specified, not re-litigated.

**J1 — Membership is identity, never a window.** A Sample (OBJ-19) is the candidates sharing one ConditionIdentity (OBJ-07), for one unit in one currency. A new condition begins a new sample; it does not extend the old one. There is no time-window, no recency term, no sliding accumulation. This is S1 seam MOD-03 → MOD-07 ("membership by condition identity, never a time window") and INV-SAMPLE.

**J2 — Identity is not a fact; the revision is.** RFD-03 refused `ConditionIdentity is-a AppendedFact` and preserved the relation as composition: OBJ-17 PromptRevision *has-a* OBJ-07 ConditionIdentity. S1 §10 writes `revise(...) ⇒ append` and never `append(condition)`. A changed cited external reference **is** a condition change — the two separately-stated invalidation triggers of the S1 collapse into one because the justification ("a new prompt draws from a new distribution") is about the **distribution**, not about the prompt. The specification below therefore defines the identity over the *complete draw-input set*, so any draw input added later inherits the partitioning rule by construction and needs no clause of its own.

**J3 — A revision closes its sample; a sample has two consumers with different lifetimes.** For **dispersion** (MOD-08) a revision **voids** the sample: the draws came from a distribution that no longer obtains, and pooling across the revision estimates a spread of nothing. For **calibration** (MOD-09, not F3) the same revision **closes** the sample and its scores remain valid evidence, because a revision is the operator saying *none of these was good enough* — the strongest rejection signal available. F3 **exposes closure as a fact on the projection**; F3 does not decide what closure means for a consumer. MOD-08 reads it as voiding. MOD-09 reads it as closing. Both readings are served by one exposed value.

**J4 — ABSENT is a non-value guarded syntactically, not at runtime.** AE-04: OBJ-09 Absent is an in-band non-value inside a vector of values. An unobserved component is not a low score and not zero. Any expression combining a component with a possibly-ABSENT sibling is **malformed at parse** (`ASSERT_ABSENT`, checked over definition text). This is why C0 priced seam P-1 (OBJ-15 ↔ OBJ-08 ↔ OBJ-09) as **expensive and interior**: a syntactic guard cannot be enforced across a module boundary, because the far side sees a type and not a definition. The three objects are one module for that reason alone.

**Non-derivation of the Projection family.** OBJ-19, OBJ-20, OBJ-21 and OBJ-27 are members of OBJ-02 Projection by **RC-3's fixed membership list**, not by any property. F3 does not re-derive the family from "anything stateless" or "anything pure"; doing so readmits OBJ-34 DifficultyAdvisory and defeats owner ruling DG-F1. Every F3 projection is computed per read, takes a RecordHeight (OBJ-10), and is never memoized across an extension of the record. Externals are reached only via MOD-02 `ports/`.

---

## 2. Module specifications

### MOD-06 `condition/` — OBJ-07, OBJ-17, OBJ-19, OBJ-27

**Purpose.** Hold the identity of the conditions under which draws are made, record their revisions as appended facts, and derive the two record-derived structures that partition on those identities: the Sample (per unit, per currency, per condition) and the Chain (runs of units whose cheapest candidate is inherited rather than generated).

**Responsibility boundary.**
- **IS** responsible for: deciding what constitutes one condition; deciding when a condition has changed; recording revisions; assembling samples by identity; exposing sample **closure**; deriving chains.
- **Is explicitly NOT responsible for:** computing any statistic over a sample (MOD-08); deciding what closure *means* to a consumer (MOD-08 and MOD-09 each decide, differently — J3); appending candidates or commitments (MOD-05 `facts/`); observing or scoring anything (MOD-07); any threshold, population or exclusion count (MOD-09); scheduling or parallelizing work over chains (a chain is *reported*, never acted on here); reaching the record directly (MOD-02).

**Public interface (plain-language signatures).**

| Signature | Returns |
|---|---|
| `condition_identity_of(candidate)` | the ConditionIdentity carried by that candidate |
| `revisions(unit, currency, as_of: RecordHeight)` | the revisions in record order for that unit and currency |
| `condition_in_force(unit, currency, as_of: RecordHeight)` | a ConditionIdentity, or `NoSubject` when none has been declared |
| `same_condition(a: ConditionIdentity, b: ConditionIdentity)` | exact identity equality — total, no tolerance, no near-match |
| `sample(unit, currency, condition: ConditionIdentity, as_of: RecordHeight)` | a Sample: the member candidates, its cardinality, its condition, and its closure |
| `closure(sample)` | `Open`, or `ClosedBy(revision)` naming the PromptRevision that closed it |
| `samples_for(unit, currency, as_of: RecordHeight)` | every sample for that unit and currency, one per distinct condition, disjoint |
| `append_revision(unit, currency, new_condition, author)` | the appended PromptRevision fact (write path, via MOD-02) |
| `chains(as_of: RecordHeight)` | the set of Chains — each a maximal run of units, each with its inheritance edges |

**Internal state.** None persisted beyond the record. `revisions` and `condition_in_force` are reads of appended facts through MOD-02; `sample`, `samples_for`, `closure` and `chains` are folds computed per read at a supplied height. A cache keyed **on record height** is permitted; memoization surviving an extension of the record is not (RC-3, SC-2, ER-3).

**Dependencies.**
- **Hard — MOD-01 `kernel/`**: OBJ-01 AppendedFact (base of OBJ-17), OBJ-02 Projection (base of OBJ-19, OBJ-27), OBJ-10 RecordHeight, OBJ-04 Unknown (`NoSubject` for a unit with no condition).
- **Hard — MOD-02 `ports/`**: OBJ-35 RecordPort for every read and the revision append; OBJ-38 AuthorEnum for the revision's author.
- **Hard — MOD-05 `facts/`**: OBJ-11 Candidate (sample members; a candidate carries its condition), OBJ-12 Commitment (chain inheritance edges are commitment-to-candidate).
- **Soft — none.** MOD-06 does **not** depend on MOD-07 or MOD-08. Evidence flows outward from MOD-06; nothing statistical flows back.

**OBJ-07 ConditionIdentity — value type, load-bearing INV-SAMPLE.**
The identity of the complete set of inputs that determine the distribution a draw is taken from, for one unit in one currency. It is **identity, not a fact**: it is never appended, is immutable once constituted, and is compared only by exact equality. It is defined over the *whole* draw-input set rather than over an enumerated list of input kinds, which is what makes the partitioning rule self-extending — the prompt text and every cited external reference are components of the identity by construction, so a changed cited reference **is** a condition change without a clause saying so, and any draw input introduced later inherits the same rule without one either. This is the AE-6 collapse: two separately-stated invalidation triggers became one because the justification is about the distribution, not the prompt. Two candidates carry the same ConditionIdentity when and only when every component of their draw-input set is identical; near-equality, normalization to a canonical form that discards a component, and tolerance of any kind are all prohibited, because each would silently pool draws from two distributions and produce a dispersion figure with no referent.

**OBJ-17 PromptRevision — appended fact, load-bearing INV-SAMPLE, AE-6 resolution.**
The appended record that the condition in force for a (unit, currency) has changed from one ConditionIdentity to another. It is the *only* way a condition changes: there is no update path on OBJ-07, and the record carries the revision, never an edited identity (RFD-03; the S1's `✗ update(ℂ)`). A PromptRevision has the effects of J3 and no others: it **ends** the sample under the prior identity, it **begins** a new empty sample under the new identity, and it stands as the operator's rejection of every member of the sample it ended. It does not delete, alter, rescore or unobserve any candidate, and it does not reach into MOD-08 or MOD-09 — those modules read the revision through the closure exposed on the sample, and each reads it for its own purpose.

**OBJ-19 Sample — projection, `held_behind:` AE-3.**
The candidates sharing one ConditionIdentity, for one unit in one currency, as of a record height. Membership is by identity, never by a time window, never by recency, never by a count cap (INV-SAMPLE; S1 seam MOD-03 → MOD-07). Samples for one (unit, currency) are **disjoint and exhaustive** over its candidates: each candidate belongs to exactly one, and a query spanning two conditions therefore intersects to the empty set rather than uniting — which is REF-10. A Sample exposes its members, its cardinality, its condition, and its **closure**: `Open`, or `ClosedBy(revision)`. Closure is a fact the projection states; it is not a judgment about validity, because the two consumers of a sample have different lifetimes (J3) and a projection that pre-resolved the question for one would be wrong for the other. The Sample is `held_behind:` AE-3 — whether same-condition draws are independent across seeds is carried open, and **only OBJ-20 reads that assumption**; if AE-3 is false the dispersion figure is wrong and nothing else in the system is.

**OBJ-27 Chain — projection.**
A maximal run of units whose lowest-currency candidate is inherited from another unit's commitment rather than generated independently. Membership is by the **inheritance relation** on the record — unit *v* is the successor of unit *u* when *v*'s least-currency candidate derives from *u*'s commitment — and maximality means the run extends in both directions until an independently-generated candidate terminates it. Chains are the schedule's **critical path**: units inside a chain are serially ordered by construction, because a successor's cheapest draw cannot exist until its predecessor has committed, while units in no chain (or at chain heads) parallelize around them. A Chain is computed per read at a height and reported; MOD-06 neither schedules, dispatches, prioritizes nor blocks on it, and no gate condition anywhere reads it.

---

### MOD-07 `observation/` — OBJ-08, OBJ-09, OBJ-15

**Purpose.** Hold what was observed about a candidate: component vectors with a per-component author, where each component is either a Score or ABSENT-with-a-discharge-condition, and where no expression may combine the two. This module exists as one module because of C0 seam **P-1** — the ABSENT guard is syntactic and cannot survive a boundary.

**Responsibility boundary.**
- **IS** responsible for: the score value type and its codomain; the ABSENT non-value and its discharge condition; the observation vector, its per-component author, and its append; enforcing `H-ABSENT` over definition text within its own scope; serving component values to consumers **with their ABSENT-ness intact**.
- **Is explicitly NOT responsible for:** any statistic (MOD-08); any threshold, bar, population membership or exclusion count (MOD-09) — MOD-07 reports what was and was not observed and MOD-09 counts the exclusions; deciding whether an observation is *required* (it is not — a human may commit on their own eyes); the scoring algorithm itself (the system owns no scoring algorithm); the author enum's definition (MOD-02, OBJ-38).

**Public interface (plain-language signatures).**

| Signature | Returns |
|---|---|
| `append_observation(candidate, components, author_per_component)` | the appended Observation fact (via MOD-02) |
| `observation_of(candidate, as_of: RecordHeight)` | the Observation for that candidate, or `NoSubject` when none was made |
| `component(observation, component_name)` | a Score **or** an Absent — never a number standing in for an Absent |
| `is_absent(component)` | whether that component is ABSENT — the only legal inspection of an ABSENT sibling |
| `discharge_condition(absent)` | `Dischargeable(task)` or `Undischargeable(reason)` |
| `author_of(observation, component_name)` | the author of that one component |
| `is_all_absent(observation)` | whether every component is ABSENT — legal, and useless |
| `scored_components(observation)` | only the components that carry a Score; ABSENT components are **omitted, not zeroed** |

**Internal state.** None persisted beyond the record. Observations are appended facts read through MOD-02 at a height. The `H-ABSENT` guard is a **parse-time** property of definitions inside this module and its consumers' expressions over its values, not a runtime flag with state.

**Dependencies.**
- **Hard — MOD-01 `kernel/`**: OBJ-01 AppendedFact (base of OBJ-15), OBJ-04 Unknown (`NoSubject` for an unobserved candidate), OBJ-10 RecordHeight.
- **Hard — MOD-02 `ports/`**: OBJ-35 RecordPort for the append and reads; OBJ-38 AuthorEnum for per-component authorship (ENGINE and DIRECTOR may only propose).
- **Hard — MOD-05 `facts/`**: OBJ-11 Candidate — an Observation is about a candidate.
- **Soft — none.** MOD-07 does **not** depend on MOD-06 or MOD-08. It knows nothing of samples and nothing of statistics.

**OBJ-08 Score — value type.**
The observed value of one component of one observation, in a fixed codomain. It is a value and nothing else: it carries no threshold, no pass/fail, no rank and no comparison to any bar, because a bar is observed elsewhere (MOD-09) and never lives beside a score. A Score is never defaulted, never coalesced (`score || 0` is ER-1's named defect), and never produced to stand in for an unobserved component — the value that stands there is OBJ-09 and it is not a number. Scores are the only components admissible into arithmetic anywhere in the system.

**OBJ-09 Absent — value type, load-bearing INV-ABSENT, AE-04.**
An **in-band non-value inside a vector of values**: the statement that one component of an observation was not observed. It is not a low score, not a zero, not a null, and not a sentinel — a sentinel number and a null would both be arithmetically reachable, and reachability is the entire defect. ABSENT carries a **discharge condition** with two cases, and both remain non-numeric. *Dischargeable* means the component is observable in this currency but its author has not acted yet: it is a **task**, and it names what would supply the value. *Undischargeable* means the component is not observable in this currency at all: it is a **permanent bound on what any estimate over this observation may claim**, and no later act discharges it. The distinction exists so that "not yet" and "not here" are never confused, and neither is ever confused with "poorly". Every operation over an ABSENT is a *test* (`is_absent`, `discharge_condition`); an expression that combines an ABSENT with a value is malformed at parse (HOOK-02), which is REF-09.

**OBJ-15 Observation — appended fact, load-bearing INV-ABSENT.**
A **vector** of components about one candidate, each component carrying its own value (Score or Absent) and **its own author**. Per-component authorship is what makes an observation partially attributable — a vector is not one act by one party, and the provenance of the motion component is not the provenance of the composition component. An **all-ABSENT vector is legal and stored**: it is a legitimate statement that nothing was observed, and rejecting it would force an author to fabricate a value to record the fact of having looked. It is also useless, which is a property of the evidence and not an error. The motivating case is the one the S1 names: three sampled frames of a video can all score beautifully while the motion is wrong — a still cannot see motion, so the motion component is **ABSENT**, undischargeable in that currency, rather than passing. An unobserved candidate has no Observation at all (`NoSubject`), which is distinct from an all-ABSENT Observation, and MOD-09 counts the exclusion in either case on **both** populations.

---

### MOD-08 `statistics/` — OBJ-20, OBJ-21

**Purpose.** Compute the two axes of the diagnostic over evidence: **dispersion**, available from a sample of three or more, and **location**, available only against an observed threshold. This module computes; it decides nothing, gates nothing, and stores nothing.

**Responsibility boundary.**
- **IS** responsible for: enforcing the floor of three and returning `Undetermined(AE-3)` below it; computing a spread statistic over a sample's scores; computing a location statistic **against a threshold supplied by its caller**; propagating an unknown as itself.
- **Is explicitly NOT responsible for:** observing, deriving, defaulting, configuring, caching or in any way originating a threshold — MOD-08 contains no θ (H-NOBAR; SC-1; "do not supply a threshold"); assembling the diagnostic or deciding which axis is withheld (MOD-10); population membership or exclusion counts (MOD-09); deciding whether a sample is voided (it reads the closure MOD-06 exposes and applies **its own** reading of it — J3); any act, gate or spend, since a statistic is a proposal input and never a precondition (ER-4).

**Public interface (plain-language signatures).**

| Signature | Returns |
|---|---|
| `dispersion(sample, as_of: RecordHeight)` | a spread value, **or** `Undetermined(AE-3)` — never a number below the floor, never a wide interval |
| `dispersion_available(sample)` | whether the floor is met — a test, not a value, so a caller need not provoke the unknown to ask |
| `location(sample, threshold, as_of: RecordHeight)` | a location value relative to the **supplied observed** threshold, or the unknown it was handed |
| `floor()` | the dispersion floor, as data — the integer three lives in exactly one place |

**Internal state.** None. Both objects are Projections: computed per read, taking a RecordHeight, never persisted (SC-2), never memoized across an extension of the record (RC-3). A height-keyed cache is permitted (carried production concern: fold performance); a cache keyed on anything but height is a second home for a fact.

**Dependencies.**
- **Hard — MOD-06 `condition/`**: OBJ-19 Sample and its cardinality and closure (C0 seam **Q-2**).
- **Hard — MOD-07 `observation/`**: OBJ-08 Score and OBJ-09 Absent, with ABSENT-ness intact across the boundary.
- **Hard — MOD-01 `kernel/`**: OBJ-02 Projection, OBJ-04 Unknown (`Undetermined`), OBJ-10 RecordHeight.
- **Soft — MOD-10 `diagnostic/`** as the **caller** that supplies the observed threshold as an argument. This is a call direction, **not an import**: MOD-08 does not depend on MOD-09 `calibration/`, and must not, or the evidence path acquires a cycle (MOD-07 → MOD-09 → MOD-08 → MOD-07). See §8 — the delivery path for θ is not covered by a recorded S1 seam and is surfaced, not resolved.

**OBJ-20 Dispersion — projection.**
The spread of the scores in one sample, as of a height. **The floor is three.** Below it, dispersion returns `Undetermined(AE-3)` — **never a number, and never a wide interval**, because a wide interval is a number that a consumer will narrow. The rationale is the discriminating one, not a convention about small samples: a single score sitting near a bar is ambiguous between *close* (the draws cluster there and one more cheap draw is worth buying) and *capped* (the draws are spread and this one was the top of the spread, so more cheap draws buy nothing) — and those two readings call for **opposite spends**. The discriminator between them is variance, and variance is unestimable below three. Returning any number below the floor therefore does not merely lose precision; it answers a spending question that the evidence has not answered. A sample **closed by a revision is void for dispersion** (J3): the draws come from a distribution that no longer obtains, so dispersion is computed over an open sample's members and never pools across a revision. **Which spread statistic** is a bounded implementation decision left deliberately open (DG-F5) — pinning one here would smuggle in a distributional assumption — so this specification fixes the **contract** (domain: a sample; floor: three; codomain: a spread value or `Undetermined(AE-3)`; order-independence over the member multiset; no coalescing) and not the formula.

**OBJ-21 Location — projection.**
Where a sample's scores sit **relative to a threshold**, as of a height. Location is the second, **independently available** axis (X14): its availability is not the dispersion floor and the dispersion floor is not its availability — either may be present while the other is absent, which is the property AE-06's partial diagnostic exists to express. Location is computable **only** against a threshold **observed from the operator's own accept/reject behaviour and never supplied**; MOD-08 originates no threshold, and the observed θ reaches the computation as an **argument from its caller**. Passing an observed θ into the computation is not "supplying" one — supplying means a literal, a constant, a config key, a default parameter, a fallback or a coalesced value, all of which are prohibited here and rejected by H-NOBAR. When the threshold handed in is ⊥, location is **not computed and not estimated**; the unknown propagates as itself and the μ axis is withheld by MOD-10 with a reason (S1 seam MOD-10 → MOD-11). **Which centre statistic** is likewise open (DG-F5); the contract is fixed, the formula is not.

---

## 3. Seam contracts where F3 modules are the SOURCE

| # | Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule |
|---|---|---|---|---|---|
| S-F3-1 | MOD-06 `condition/` | MOD-08 `statistics/` | the Sample and its cardinality (C0 **Q-2**; S1 MOD-07 → MOD-09) | MOD-08 hard-depends on MOD-06; never the reverse | Membership by condition identity only. `\|sample\| < 3` ⇒ `Undetermined(AE-3)`, **no numeric result** and no interval. Cardinality is transferred with the set, never recomputed on the far side |
| S-F3-2 | MOD-06 `condition/` | MOD-09 `calibration/` | sample **closure**: `Open` or `ClosedBy(revision)` | MOD-09 hard-depends on MOD-06 | Closure is a fact, not a deletion. A closed sample's scores **remain valid evidence** for calibration — the revision is the operator's rejection of every member, the strongest rejection signal available. MOD-09 must not read closure as voidness; that reading belongs to MOD-08 only. **Not covered by a recorded S1 seam — see §8** |
| S-F3-3 | MOD-07 `observation/` | MOD-08 `statistics/` | component values, some ABSENT (S1 MOD-08 → MOD-09) | MOD-08 hard-depends on MOD-07 | ABSENT crosses **as ABSENT** — never coerced, defaulted, dropped-to-zero or nulled in transit. ABSENT never enters arithmetic; an expression combining a value with an ABSENT sibling is malformed at parse (HOOK-02) |
| S-F3-4 | MOD-07 `observation/` | MOD-09 `calibration/` | scores of accepted and passed-over candidates (S1 MOD-08 → MOD-10) | MOD-09 hard-depends on MOD-07 | No observation ⇒ **no population member, and counted as excluded** — on **both** populations, not only the one under consideration. An all-ABSENT vector and a missing observation are distinct facts and both exclude |
| S-F3-5 | MOD-08 `statistics/` | MOD-10 `diagnostic/` | σ, **or** `Undetermined(AE-3)` (S1 MOD-09 → MOD-11) | MOD-10 hard-depends on MOD-08 | The unknown **propagates as itself** (RC-1). Never coalesced to a number, never widened into an interval, never collapsed into another member of the Unknown family |
| S-F3-6 | MOD-08 `statistics/` | MOD-10 `diagnostic/` | the location value, or the unknown it was handed | MOD-10 hard-depends on MOD-08; MOD-08 does **not** import MOD-09 | θ arrives at MOD-08 **as a caller-supplied argument** observed at MOD-09. MOD-08 originates no threshold (H-NOBAR, SC-1, ER-1). θ = ⊥ ⇒ location not computed and not estimated; the axis is withheld with a reason at MOD-10. **Delivery path not covered by a recorded S1 seam — see §8** |
| S-F3-7 | MOD-06 `condition/` | MOD-12 `lineage/` | the Chain set (maximal inherited runs) | MOD-12 soft-depends on MOD-06 | Chain membership is by the inheritance relation on the record — a successor's least-currency candidate derives from a predecessor's commitment — **never by time adjacency or ordering in the record**. Reported only; no gate condition reads it. **Consumer not fixed by a recorded S1 seam — see §8** |

---

## 4. Refusal tests

| ID | MOD | Invariant | Forbidden input | Expected rejection | Test name |
|---|---|---|---|---|---|
| REF-08 | MOD-08 | dispersion floor (CT-2) | a sample of **exactly 2** scored members, dispersion requested | `Undetermined(AE-3)` returned, carrying its cause; **no numeric result anywhere in the return**, and no interval, bound, estimate or "provisional" value | `dispersion_of_two_returns_undetermined_with_no_number` |
| REF-08+ | MOD-08 | positive case | a sample of **3** scored members | a value of the chosen spread statistic's codomain is returned | `dispersion_of_three_yields_a_value` |
| REF-09 | MOD-07 | INV-ABSENT (CT-5) | a definition whose expression combines a component value with a possibly-**ABSENT** sibling | **malformed at parse** — the definition is rejected, not the run. Not a runtime exception, not a guarded branch, not a filtered operand | `arithmetic_with_absent_sibling_is_malformed_at_parse` |
| REF-09+ | MOD-07 | positive case | an observation vector in which **every** component is ABSENT | accepted and stored; `is_all_absent` is true; no component is coerced to a number | `all_absent_vector_is_accepted_and_stored` |
| REF-10 | MOD-06 | INV-SAMPLE (CT-10) | draws made under **different** ConditionIdentities, queried as one sample | **empty intersection, never a union** — the query yields the empty set; the two condition-partitions are not merged, not concatenated and not pooled | `cross_condition_sample_query_intersects_to_empty` |
| REF-10+ | MOD-06 | positive case | draws made under the **same** ConditionIdentity | one sample containing exactly those members, with its cardinality and its closure | `same_condition_draws_form_one_sample` |

The three positive cases are stated as named companions so that a refusal cannot be satisfied by a function that refuses everything.

---

## 5. Golden vectors

| Field | Content |
|---|---|
| **ID** | VEC-03 |
| **MOD** | MOD-08 `statistics/` (carried from S1 GV-3) |
| **Pinned value** | **none — `DEFERRED`.** No value is transcribed, hand-written or estimated here |
| **Rule (independent of the vector)** | For a sample *S* of scored members, as of a height *h*: (i) `\|S\| < 3` ⇒ `Undetermined(AE-3)` and **no numeric field** in the result; (ii) `\|S\| ≥ 3` ⇒ a value in the chosen spread statistic's codomain; (iii) the result is a function of the **member multiset alone** — order-independent, and identical for any two heights yielding the same multiset; (iv) an ABSENT component contributes **nothing** and is not counted as a member for the floor; (v) no result at any *n* is coalesced, defaulted or widened into an interval. **The rule holds whatever statistic DG-F5 selects, which is why it is stated without one.** |
| **Input** | one fixed score set, read at the three cardinalities n = 2, 3, 4 (the n = 3 and n = 4 rows share the n = 2 members plus one and two additions, so the three rows are nested and the floor transition is visible) |
| **Output** | row n = 2 → the `UNDETERMINED(AE-3)` token with its cause and no number; rows n = 3 and n = 4 → numeric values produced by the implementation |
| **Encoding** | one row per cardinality: `n \| scores[] \| expect` — `scores[]` as exact literals in the Score codomain, no rounding and no formatting; `expect` as **either** the bare token `UNDETERMINED(AE-3)` **or** a numeric literal at the implementation's full emitted precision. The statistic's identity is recorded as a fourth field on the vector at discharge time, so a later reader can tell which statistic the pinned numbers belong to |
| **State** | **`DEFERRED`** |
| **Discharge condition** | Compute from **MOD-08** once DG-F5 selects the statistic; then **re-derive independently** by a second party or a second method. **MOD-08 is not counted complete until VEC-03 is computed from the real implementation and independently re-derived.** No row may be transcribed or hand-written. The n = 2 row is discharged by the *absence* of a number, which is checked structurally, not numerically |

MOD-06 and MOD-07 pin no golden vector. That is **N/A-by-absence, not a silent pass**: the guarantees those modules carry (an empty intersection, a parse-time malformation) are structural and are discharged by REF-09 and REF-10, which no numeric vector could witness.

---

## 6. Hook specifications

| ID | Name | Registered at | Trigger | Condition | BLOCK action | Invariant | Refusal test |
|---|---|---|---|---|---|---|---|
| HOOK-02 | `H-ABSENT` | **MOD-07** `observation/` | `@before-arithmetic-on-observation` | no operand is ABSENT | fail **at parse** — the definition is malformed | INV-ABSENT (AE-04) | REF-09 |
| HOOK-06 | `H-SAMPLE` | **MOD-06** `condition/` | `@before-sample-assembly` | all members share one condition identity | reject the assembly | INV-SAMPLE | REF-10 |

```
HOOK HOOK-02 (H-ABSENT) @before-arithmetic-on-observation {
    condition: no operand is ABSENT,
    BLOCK: fail at parse — the definition is malformed
}

HOOK HOOK-06 (H-SAMPLE) @before-sample-assembly {
    condition: all members share one condition identity,
    BLOCK: reject the assembly
}
```

Two hooks, registered where their objects live. `H-ABSENT` is a **parse-time** check over definition text and is registrable at MOD-07 only because OBJ-15, OBJ-08 and OBJ-09 are one module (C0 seam P-1) — across a boundary the far side sees a type and not a definition, and the hook becomes unenforceable. F3 registers **no third hook**: the payload is nine hooks in total and a tenth appearing in Phase 3 is a defect, not an improvement.

---

## 7. Production concerns surfaced by F3 modules

*(Carried, developer-owned. No PC ids are minted here; the two below are the carried S1 concerns as they bear on this facet.)*

**Fold performance.** Every F3 projection — Sample, Chain, Dispersion, Location — is computed **per read** at a record height, and nothing derived is persisted (SC-2). Cost therefore scales with record length at every read, and the chain fold in particular walks lineage across units rather than within one. A **height-keyed cache is permitted**; **memoization across an extension of the record is not**, and a cache keyed on anything but record height is a second home for a fact. The sharp edge for a developer is that the tempting optimization — incrementally extending a sample as candidates arrive — is exactly the prohibited one, because a revision **partitions** rather than appends and an incremental accumulator cannot represent a partition (the same shape as AE-02).

**Storage growth as a function of success.** The design's whole point is drawing **many cheap candidates and never deleting them**, so a well-functioning deployment grows the record faster than a poorly-functioning one. Every F3 read cost grows with it. Retention interacts with the one-at-a-time purge ruling and cannot be addressed by deleting candidates, since the record is append-only and a sample is defined over its full membership at a height. This is a deployment decision, not an omission, and it is named here because MOD-06 and MOD-08 are where the cost is first felt.

**Observation sparsity, secondary.** An observation is not required to commit, so a mature record may hold many candidates with `NoSubject` observations and many all-ABSENT vectors. This costs MOD-08 nothing (they are not members for the floor) but it is what makes the exclusion counts at MOD-09 load-bearing rather than incidental.

---

## 8. Open items

| # | Item | Status | Note |
|---|---|---|---|
| O-1 | **DG-F5 — which statistic.** The spread measure (OBJ-20) and the centre measure (OBJ-21) | **OPEN, deliberately.** Non-blocking; bounded implementation decision | Any statistic honest at n = 3. Pinning one in this specification would smuggle in a distributional assumption, so §2 fixes the contract and §5 states VEC-03's rule without a formula. Discharging DG-F5 is a precondition of discharging VEC-03, and therefore of MOD-08 being counted complete |
| O-2 | **AE-3 — are same-condition draws i.i.d. across seeds?** | **CARRIED, `held_behind:` OBJ-19** | Only OBJ-20 reads it. If false, **dispersion is wrong and nothing else is** — the sample, the closure, the observation vector and the location axis are all unaffected. Resolution trigger: observed serial correlation across seeds |
| O-3 | **The θ delivery path to OBJ-21.** Location requires an observed threshold, but the only recorded θ seam is MOD-09 `calibration/` → MOD-10 `diagnostic/` ("θ or ⊥ with cause"). **No recorded seam delivers θ to MOD-08** | **SURFACED, not resolved** | Two readings are consistent with the record: (a) MOD-10 supplies the observed θ to `location(...)` as an argument, MOD-08 importing nothing from MOD-09; (b) the location axis is composed at MOD-10 from a threshold-free MOD-08 output. §2 specifies (a) as the interface **because (b) is not writable without moving OBJ-21 out of MOD-08, which C0 §3 fixed**, and because a MOD-08 → MOD-09 import would make the evidence path cyclic (MOD-07 → MOD-09 → MOD-08 → MOD-07). F3 does not resolve which is intended; the S1 interface table is silent and the choice belongs to synthesis |
| O-4 | **The closure seam MOD-06 → MOD-09.** J3 requires MOD-09 to consume sample closure, but S1's twenty-eight seams record no MOD-07 → MOD-10 edge (S1 numbering) | **SURFACED, not resolved** | The judgment that a revision closes-for-calibration while voiding-for-dispersion was resolved upstream and is carried; the **seam carrying it is not in the recorded set**. Specified at §3 S-F3-2 so it is writable, and flagged here so synthesis can either confirm the seam or reassign the consumer |
| O-5 | **Chain's consumer.** OBJ-27 traces to two modules in S2 §2 (S1 numbering: ConditionRegistry and InvalidationEngine); C0 assigns ownership to MOD-06, but **no recorded seam names who reads a Chain** | **SURFACED, not resolved** | §3 S-F3-7 states MOD-12 `lineage/` as a soft consumer on the strength of the S2 trace. If the intended consumer is a scheduler, that consumer is outside the thirteen modules and the seam is unwritable as stated |
| O-6 | **What counts toward the floor of three.** S1's seam says "the sample and its cardinality" and `\|sample\| < 3 ⇒ UNDETERMINED(AE-3)`. Whether a candidate whose observation is all-ABSENT (or absent entirely) counts toward the three is **not settled by a recorded seam** | **SURFACED, not resolved** | §5's rule (iv) states the reading F3 specifies — an ABSENT component contributes nothing and is not a member for the floor — because the alternative lets three unobserved candidates satisfy a floor whose whole purpose is to make variance estimable. Flagged because it is a reading, not a recorded contract, and it changes which samples return a number |
| O-7 | **Module numbering.** S2 §2's `Traces to` column uses S1's eighteen-module names (OBJ-19 → "MOD-07", OBJ-20/21 → "MOD-09", OBJ-15 → "MOD-08"); C0 §3 renumbers into thirteen modules (OBJ-19 → MOD-06, OBJ-20/21 → MOD-08, OBJ-15 → MOD-07) | **SURFACED, benign** | Same objects, two identifier schemes. This slice uses **C0's numbering throughout**. Noted so a later reader does not read the difference as a reassignment or as a contradiction between S2 and C0 |
| O-8 | **The undischargeable ABSENT's consumer.** An undischargeable ABSENT is a **permanent bound on what any estimate may claim** (§2, OBJ-09). Which module carries that bound forward is not fixed by a recorded seam | **SURFACED, not resolved** | Candidates: MOD-09's exclusion counts, or MOD-10's `WithheldReason` (OBJ-42). F3 transfers the discharge condition intact across S-F3-3 and S-F3-4 and asserts nothing about which consumer honours it. Left open because guessing would let a bound be silently dropped at exactly the layer PC-7 warns about |

**Nothing in this slice contradicts an S2 ruling.** O-3, O-4, O-5, O-6 and O-8 are gaps in the **recorded seam set**, surfaced for synthesis; O-1 and O-2 are carried open gates behind fixed interfaces; O-7 is a naming reconciliation.
