# F4 · Judgment — MOD-09 `calibration/`, MOD-10 `diagnostic/`, MOD-13 `advisory/`

**Input:** `P2_FrameGate/CLAUDE_FrameGate_Phase2.md` (S2, fixed) and `P3_FrameGate/C0-coordinator.md`
(partition, seam pricing). Verification payload carried from S1 `P1_FrameGate/CLAUDE_FrameGate.md`
and `step-7-implementation-specification.md` §10. Nothing generated; bindings operationalized only.

Notation: `⊥` is BOTTOM — a value carrying a **cause** and a **discharge condition**, never a null.

---

## 1. Facet scope and carried judgment

F4 owns the three modules where the concept is destroyed by a helpful default rather than by a wrong
algorithm. Three judgments are carried, each resolvable more than one way and each resolved here as
the S2 proved it:

1. **The threshold is observed, and its codomain includes ⊥.** OBJ-22 Bar (AE-01) is the one
   Projection that may legitimately return no value while every sibling returns one. This is an
   *admitted exception*, not an inconsistency a later reader may tidy. Making it nullable to match
   its siblings is precisely INV-NOBAR's defect, because a nullable value can be coalesced. A number
   with three decimal places and nothing behind it is worse than no number, because it will be
   believed.
2. **Axis independence.** OBJ-25 Diagnostic (AE-06) is the **product of two independently-available
   classifiers**, not a four-cell table with a fallback. Each axis is present or absent on its own
   evidence. When an axis is absent, the Diagnostic returns **which** axis it lacks and **what would
   supply it** (OBJ-42 WithheldReason). A Diagnostic that silently returns only the axes it has is
   the defect the whole design exists to prevent, wearing a different coat.
3. **Difficulty is advisory and has no consumer.** OBJ-34 DifficultyAdvisory (AE-03, owner ruling
   DG-F1) is computed, displayed, and **read by nothing**.

**The self-reliance point of this run, carried explicitly (S2 §6, C0 §6).** The `Projection` family
(OBJ-02) is proven by RC-3's **fixed membership list** — OBJ-19 Sample, OBJ-20 Dispersion, OBJ-21
Location, OBJ-22 Bar, OBJ-23 PopulationPartition, OBJ-24 Reachability, OBJ-25 Diagnostic, OBJ-26
Ratio, OBJ-27 Chain, OBJ-28 InvalidationScope — **and OBJ-34 is not on that list.** The family is
**not** defined by a property. Any reader who re-derives it from "anything stateless", "anything
pure", or "anything that takes a record height" silently readmits OBJ-34 to the family, at which
point δ becomes consumable wherever a Projection is consumable and owner ruling DG-F1 is defeated
without anyone having decided to defeat it. RFD-01 refused that edge; the refusal is load-bearing.
Membership list, not property. In as many words.

**Structural facts binding all three modules.** Every projection is computed per read, takes a
record height (OBJ-10), and is **never memoized across an extension of the record** (EV-3 / RC-3 /
SC-2). Externals are reached only through MOD-02 `ports/` (A.2 EXTERNAL rule; ER-5). No module in
this facet holds internal state.

**Projection-count check (ODG-FG-01).** MOD-09 owns 2 of 10 Projections; MOD-10 owns 1 of 10;
MOD-13 owns 0 (OBJ-34 is not a Projection). No module in this facet can see enough of the family to
write a `kind` switch over it. The check is **per-module, not per-facet** — F4 holding three
Projections across three modules does not relax it.

---

## 2. Module specifications

### MOD-09 `calibration/` — OBJ-22 Bar, OBJ-23 PopulationPartition

**Purpose.** Derive the threshold θ that the operator's own accept/reject behaviour implies at a
declaration level — or report, with a cause and a discharge condition, that no such threshold
exists. Assemble the two populations that imply it, and count what each population excluded.

**Status: DEFERRED.** Not because a node is unproven — the node, its codomain including ⊥, its two
populations and both exclusion counts are all proven — but because AE-5's **separation rule** is
`OPEN` and carries `NO_DEFAULT`. This is a proven-open gate behind a fixed interface. The interface
below is specified; the separation operator behind it is not, and may not be invented.

**Responsibility boundary.**

- *Is responsible for:* assembling `Accepted(level)` and `PassedOver(level)` **as of the Declaration
  recorded at draw time** (OBJ-16 DrawContext); applying the X21 partition move (an invalidated
  Commitment's Candidate moves `Accepted → PassedOver`); invoking the separation rule on the
  populations *after* the population branch has been taken and only then; returning θ **or ⊥ with
  its cause and discharge condition**; reporting **exclusion counts on BOTH populations**.
- *Is explicitly NOT responsible for:* ever accepting a threshold from configuration, from a caller,
  from a literal, from a default parameter, or from a fallback; deciding what "separated" means
  (AE-5, `NO_DEFAULT`, held behind this interface); choosing dispersion or location statistics
  (DG-F5, MOD-08); deciding whether a sample is closed (MOD-06 owns closure by Commitment or by
  revision); classifying anything (MOD-10); persisting anything.

**Public interface (plain language).**

- `bar(level, record_height)` → **either** a threshold value together with the sample size it was
  derived from, **or** ⊥ together with a cause and a discharge condition — and, in **both** cases,
  the four population figures: accepted count, passed-over count, excluded-from-accepted count,
  excluded-from-passed-over count.
- `populations(level, record_height)` → the `Accepted` and `PassedOver` membership sets at that
  height, plus both exclusion counts. (OBJ-23; per-read, non-monotone, computed as-of.)

**No threshold setter exists on this interface — stated explicitly and normatively.** There is no
`set_bar`, no `configure_threshold`, no `bar(level, default)`, no optional threshold parameter, no
fallback argument, no threshold key in any configuration surface reachable from this module, and no
constructor taking one. `bar` is a read that returns a value or ⊥. **Any declaration that would
allow a threshold to be set, configured, coalesced or defaulted is malformed at parse** — HOOK-03
(`H-NOBAR`), REF-12, SC-1, ER-1. If a function feels like it needs a threshold to be total, it is
supposed to return ⊥.

**Internal state.** None. No accumulator, no counter, no cache except one keyed strictly on record
height. **An incremental accumulator cannot represent this module** (AE-02 / SC-4): the union of the
two populations is monotone, but the **partition is not** — members move between sides — so a
running count is structurally incapable of being right. Populations are computed as-of a record
height, never accumulated.

**Dependencies.**

| Kind | Module | What is needed |
|---|---|---|
| hard | MOD-02 `ports/` | OBJ-35 RecordPort — the record as of a height. The only route to any external |
| hard | MOD-03 `catalog/` | OBJ-13 Declaration — the level partitioning the populations; one bar per level, levels never merged |
| hard | MOD-05 `facts/` | OBJ-11 Candidate, OBJ-12 Commitment, OBJ-16 DrawContext — who was committed to, and **the declaration recorded at draw time** |
| hard | MOD-06 `condition/` | OBJ-19 Sample — which samples are **closed**; only a closed sample contributes to `PassedOver` |
| hard | MOD-07 `observation/` | OBJ-15 Observation, OBJ-09 Absent — scores, and the absence that makes a candidate excluded rather than scored |
| hard | MOD-12 `lineage/` | OBJ-18 Invalidation — the candidates whose Commitment was invalidated, for the X21 move |
| — | MOD-08 `statistics/` | **None.** The bar is derived from populations, not from dispersion. A dependency here would be the referential calibration loop |

**OBJ-22 Bar (Projection, DEFERRED).** The boundary that `Accepted` and `PassedOver` imply at one
declaration level, or ⊥. Its codomain is `value ∪ {⊥}` and this departure from every sibling
Projection is AE-01, admitted and justified: a bar is observed or it does not exist, and a nullable
bar is a coalescible bar. ⊥ is returned **on the population branch** — when either population is
empty, or has not reached its floor — **before the separation operator is ever consulted**, carrying
the cause that made it empty and the condition that would discharge it. Only when both populations
are populated is the separation rule engaged at all; and that rule is `OPEN(AE-5) NO_DEFAULT`, held
behind this interface, with no default supplied here or anywhere. The value, when it exists, is
returned with the sample size that produced it, so that a reader can see how much history stands
behind the number. This node is the single reason MOD-09 carries status DEFERRED.

**OBJ-23 PopulationPartition (Projection, ACTIVE).** The two populations, computed as-of a record
height and never accumulated. `Accepted` = candidates that received a commitment; `PassedOver` =
candidates in a **closed** sample that did not — a sample closes by a commitment **or by a
revision**, and a revision is the operator saying "none of these was good enough", the strongest
rejection signal available. Membership reads **the declaration recorded at draw time**, never the
current one, so a re-declaration is prospective and cannot silently rewrite history. The partition
is non-monotone (AE-02): an invalidated commitment's candidate moves `Accepted → PassedOver`,
because un-approving is exactly the operator saying it was not good enough. **Exclusion counts on
both sides:** a commitment may legally carry no observation — requiring one would invert authority,
since the operator may commit on their own eyes — and such a candidate enters **no** population and
must be **counted as excluded**. The count is required for `Accepted` **and** for `PassedOver`, and
`PassedOver` is the **larger** population, because an operator commits to one candidate and passes
over many. Dropping unobserved rejections biases the bar **upward**, which makes everything look
insufficient and drives more spending — the exact failure the concept exists to prevent, arriving
through the mechanism meant to prevent it (ST-F2).

---

### MOD-10 `diagnostic/` — OBJ-25 Diagnostic, OBJ-41 DiagnosticAxis, OBJ-42 WithheldReason

**Purpose.** Compose the two-axis diagnostic from two independently-available classifiers, and
declare, for each axis it does not carry, which axis is missing and what would supply it.

**Responsibility boundary.**

- *Is responsible for:* classifying the dispersion axis from MOD-08's output; classifying the
  location axis from MOD-08's centre **against MOD-09's θ**; assembling the tuple; producing a
  WithheldReason for every absent axis.
- *Is explicitly NOT responsible for:* predicting how many draws are needed — it classifies a
  distribution and names a proposal, it does not forecast; estimating a location classification when
  θ = ⊥; closing any gate; proposing a number where it has none; choosing statistics (DG-F5);
  rendering (MOD-02 / external).

**Public interface (plain language).**

- `diagnose(unit, currency, record_height)` → a tuple of ⟨dispersion axis, location axis, withheld
  entries⟩, where each axis is **either** a classification **or** absent, and every absent axis has a
  corresponding withheld entry.

**Internal state.** None. Per-read fold; never memoized across an extension.

**Dependencies.**

| Kind | Module | What is needed |
|---|---|---|
| hard | MOD-08 `statistics/` | OBJ-20 Dispersion, OBJ-21 Location — a value, or `UNDETERMINED(AE-3)` below the floor of three. The unknown propagates as itself |
| hard | MOD-09 `calibration/` | OBJ-22 Bar — θ, or ⊥ with cause and discharge condition. ⊥ ⇒ the location axis is **withheld**, never estimated |
| hard | MOD-03 `catalog/` | OBJ-13 Declaration — the level at which the bar is read |
| soft | MOD-02 `ports/` | OBJ-36 RendererPort — display of the tuple, including the withheld entries. See §7 |
| — | MOD-05 `facts/` | **None outbound-inbound.** MOD-05 holds a soft dependency on this module for `proposals_in`; MOD-10 holds none on MOD-05 |

**OBJ-25 Diagnostic (Projection, ACTIVE).** The **product of two independently-available
classifiers**, not a four-cell table with a fallback and not a single unknown. Each axis is decided
on its own evidence: the dispersion axis is available at n≥3 and is absent below that floor; the
location axis is available only where a threshold exists and is absent wherever θ = ⊥. The two
absences arise from two distinct rules and neither collapses into the other (EV-5). Where an axis is
absent the tuple carries a WithheldReason naming that axis and what would supply it; **a diagnostic
that returns only the axes it has, silently, is the defect the whole design exists to prevent
wearing a different coat.** The Diagnostic **proposes and never closes a gate** (AE-06 context; ER-4;
SEAM-18): it appears in `proposals_in` and never in `closed_by`, and **no act signature may accept
it as an argument** — REF/CT-15 is satisfied by the *non-existence of such a signature*, not by a
runtime check. The reason is load-bearing: the smallest possible run produces a diagnostic with
**both axes absent** and the human commits anyway (MWE steps 6–7). Had the diagnostic been a
precondition, that run would be unexecutable and the system would need an invented threshold — which
its own axiom forbids.

**OBJ-41 DiagnosticAxis (value type).** One axis slot: a classification, or absent. Presence is
per-axis and independent; no axis's availability is inferred from another's, and no axis is filled
from a neighbour. An axis absent is not an axis valued zero, low, or neutral.

**OBJ-42 WithheldReason (value type).** A specific absence: **which** axis is missing, the cause of
the absence, and the **discharge condition** — what would supply it. Not a generic unknown, and not
interchangeable with one: collapsing "withheld" into "unknown" loses the fact that the system knows
exactly what it is missing and how it would get it. One withheld entry exists for each absent axis;
zero entries when both axes are present. The entries are part of the value, not an annotation on it
— splitting them from the axes they qualify is how the display defect (PC-7) gets in.

---

### MOD-13 `advisory/` — OBJ-34 DifficultyAdvisory

**Purpose.** Compute a difficulty feature over a unit, for display. Owner ruling DG-F1: **advisory**.

**Responsibility boundary.**

- *Is responsible for:* computing a display value from a unit's features, read-only.
- *Is explicitly NOT responsible for — and is structurally forbidden from — entering:* any gate
  condition, any refusal, any bar, any population, any diagnostic axis, and any derivation producing
  a Declaration. `ASSERT_ABSENT δ` over every gate condition is **normative, not provisional**
  (DG-F1 closed).

**Public interface (plain language).**

- `advisory(unit, record_height)` → a display value.

That is the entire interface. There is no reader of it inside the system.

**Internal state.** None.

**Dependencies.** Hard, read-only, on MOD-03 `catalog/` (OBJ-06 Unit features). Soft on MOD-02
`ports/` for display. **Nothing depends on MOD-13.** Difficulty flows **out** to display and **into
nothing**.

**OBJ-34 DifficultyAdvisory (contextual class, ACTIVE, no consumer — AE-03).** A node with no
consumer, preserved deliberately: removal fails on meaning and expressive power (S1 T-f), so it
ships computed, displayed, and read by nothing. **The critical point, stated in as many words:
OBJ-34 is NOT a member of the `Projection` family.** The family (OBJ-02) is established by RC-3's
**fixed membership list** — Sample, Dispersion, Location, Bar, PopulationPartition, Reachability,
Diagnostic, Ratio, Chain, InvalidationScope — and OBJ-34 does not appear on it. RFD-01 refused the
`DifficultyAdvisory is-a Projection` edge for exactly this reason and preserved the relation as
composition instead: OBJ-34 *has-a* feature computation over OBJ-06, and is read by nothing.
**If anyone re-derives the Projection family from a property — "anything stateless", "anything
pure", "anything taking a record height" — OBJ-34 satisfies that property, silently rejoins the
family, becomes consumable wherever a Projection is consumable, and the owner ruling is defeated
without any reader having decided to defeat it.** The family is a membership list. It is not a
property. Do not re-derive it.

---

## 3. Seam contracts where F4 modules are the SOURCE

| Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule |
|---|---|---|---|---|
| MOD-09 `calibration/` | MOD-10 `diagnostic/` | θ, **or** ⊥ with its cause and discharge condition (Q-3; S1 SEAM-17) | hard | ⊥ is a value and is **never coalesced**. θ = ⊥ ⇒ the location axis is **withheld**, never estimated, never defaulted, never carried over from another level |
| MOD-09 `calibration/` | MOD-11 `spend/` | **Whether θ exists** at the governing level (S1 SEAM-05) | hard | θ = ⊥ ⇒ a stop condition is **REFUSED**, not defaulted. OBJ-33 StopCondition is a conditionally-existing member of OBJ-14 Scope (AE-05), so its absence is **derived, not chosen**. Whether a stop condition is expressible at all depends entirely on whether the bar exists |
| MOD-09 `calibration/` | MOD-10, MOD-11 (every return path) | Exclusion counts for **both** populations, on every `bar()` return | hard | HOOK-08 (`H-COUNT`): a return value missing either count is rejected before it leaves the module. Both counts accompany a θ **and** a ⊥ |
| MOD-10 `diagnostic/` | MOD-05 `facts/` | The diagnostic tuple, presented to OBJ-31 CommitGate as a **proposal only** (S1 SEAM-18) | soft | It appears in `proposals_in` and **never** in `closed_by`. **No act signature accepts a diagnostic as an argument.** A commit whose diagnostic carries both axes absent must succeed |
| MOD-10 `diagnostic/` | MOD-02 `ports/` (OBJ-36 RendererPort) | The tuple **including its withheld entries** (Q-7; A.2 EXTERNAL rule) | soft | The payload is the whole value — axes and withheld entries together, never the axes alone. Beyond this boundary no invariant reaches; see §7 |
| MOD-13 `advisory/` | MOD-02 `ports/` (OBJ-36 RendererPort) | A display value (S1 SEAM-27, outward leg) | soft | δ flows **out** to display and **into nothing**. `ASSERT_ABSENT δ` over every gate condition. This is the only outbound edge MOD-13 has, and it terminates at a renderer |

---

## 4. Refusal tests

| ID | MOD | Invariant | Forbidden input | Expected rejection | Test name |
|---|---|---|---|---|---|
| REF-11 (CT-3) | MOD-09 | OBJ-22's codomain includes ⊥ (AE-01); the population branch is taken **before** the separation operator | `bar(level)` where either `Accepted` or `PassedOver` is empty | `⊥` **plus a cause and discharge condition**, returned on the population branch **before the separation operator runs** — AE-5 is not engaged and no numeric value of any kind is produced. *Positive case:* both populations populated and separated → a threshold value **plus its sample size** | `bar_returns_bottom_with_cause_when_either_population_empty` |
| REF-12 (CT-4) | MOD-09 | `INV-NOBAR` / SC-1 / ER-1 — no threshold is data | Any attempt to set, configure, default, coalesce or pass in θ: a numeric literal in a threshold position, a config key, a default parameter, a fallback argument, a `theta ?? 0.85` | **Malformed at parse** — not false at runtime, not an exception, not a warning. The declaration does not compile. *Positive case:* θ read from `bar()` → a value or ⊥ | `threshold_assignment_is_malformed_at_parse` |
| REF-13 (CT-13) | MOD-09 | X21 / AE-02 — the partition is non-monotone | Invalidate a Commitment, then query the bar and expect its candidate still in `Accepted` | The candidate appears in **`PassedOver`**, **not** in `Accepted`; the union of the two populations is unchanged. *Positive case:* with no invalidation the candidate stays in `Accepted` | `invalidated_commitment_candidate_moves_to_passed_over` |
| REF-14 (CT-14) | MOD-09 | `INV-COUNT` as restated by ST-F2 — both sides | A `bar()` return over populations containing unobserved members that reports an exclusion count for one population only (or none) | `bar()` returns a **non-zero excluded count for BOTH** populations; a return missing either count is rejected by HOOK-08 before it leaves the module. *Positive case:* all members observed → both counts zero | `bar_returns_exclusion_counts_for_both_populations` |

---

## 5. Golden vectors

**All four are `DEFERRED — compute at first implementation`.** No vector may be transcribed or
hand-written; each must be computed from the real implementation against a fixture record at a
pinned record height, and independently re-derived. The **rule is stated here, independently of the
vector**: a value whose rule is recoverable only from the vector fails conformance.

| ID | MOD | Pinned value | Rule (independent of the vector) | Input | Output | Encoding | State | Discharge condition |
|---|---|---|---|---|---|---|---|---|
| **VEC-02** | MOD-09 | none — deferred | ⊥ is returned on the **population branch** whenever either population is empty or below its floor, carrying a cause, **before the separation operator is consulted**. Only with both populations populated is the separation rule engaged; if it does not separate them, ⊥ with a *separation* cause. Only separated populations yield a value, and that value is accompanied by its sample size. **All four rows carry both exclusion counts.** | `bar(level, h)` at one declaration level, evaluated across four population states: (1) both empty; (2) one empty; (3) both populated and overlapping; (4) both populated and separated | Per row: ⟨θ or ⊥, cause, accepted count, passed count, excluded-accepted, excluded-passed⟩ | Four-row table keyed by population state; each row a six-field record; computed from MOD-09 against a fixture record at a pinned height. Rows 1–2 must additionally record *that the separation operator was not invoked* | `DEFERRED` | Compute from MOD-09 at first implementation. **The fourth row is uncomputable until AE-5's separation rule closes, and MOD-09 is not counted complete until it does.** Rows 1–3 are computable now; row 4's trigger is a declaration level whose two populations both reach their floor |
| **VEC-04** | MOD-10 | none — deferred | Axis availability is decided **per axis, independently**: the dispersion axis is present at n≥3 and absent below the floor (`UNDETERMINED(AE-3)`, propagated as itself); the location axis is present only where θ exists and absent wherever θ = ⊥. Every absent axis produces a withheld entry naming that axis, its cause, and its discharge condition. The tuple **never omits** a withheld entry, and never fills one axis from the other | `diagnose(unit, currency, h)` across four availability combinations of ⟨dispersion present/absent, threshold present/absent⟩ | Per row: ⟨dispersion axis, location axis, withheld entries⟩ | Four-row table keyed by the availability pair; each row records both axis slots and a list of withheld entries, each entry ⟨axis identity, cause, discharge condition⟩ | `DEFERRED` | Compute from MOD-10 at first implementation. **The ⟨absent, absent⟩ row must reproduce the minimal worked example's step 6**: sample of one ⇒ dispersion `UNDETERMINED(AE-3)`; both populations empty ⇒ θ = ⊥ on the population branch without engaging AE-5; tuple carries **no axis** and declares both absences with cause and discharge condition. Rows requiring a present threshold inherit VEC-02 row 4's dependence on AE-5; rows requiring a present dispersion inherit DG-F5's statistic choice |
| **VEC-06** | MOD-09 | none — deferred | Population membership is a pure function of the record as of a height. Appending an Invalidation over a Commitment moves that Commitment's Candidate from `Accepted` to `PassedOver` at the level **recorded at draw time**. The **union is unchanged** across the move; only the partition moves. No accumulator participates | `populations(level, h)` immediately before, and `populations(level, h')` immediately after, an Invalidation append (h' = h + the append) | Two membership snapshots plus the union cardinality at each height | Two-snapshot table: each snapshot lists `Accepted` and `PassedOver` by candidate identity, with both exclusion counts and the union cardinality; the moved candidate is identified in both | `DEFERRED` | Compute from MOD-09 together with MOD-12 `lineage/` at first implementation. Independently re-derive by recomputing both snapshots from the record rather than by diffing |
| **VEC-07** | MOD-09 | none — deferred | A candidate carrying no Observation enters **no** population and is **counted as excluded** from the population it would otherwise have joined. Both counts are reported on **every** return, θ or ⊥. `PassedOver` is the larger population, so its exclusion count is expected to be the larger figure | A fixture with unobserved members on **both** sides, and an all-observed control fixture, each at a pinned height | ⟨accepted count, passed count, excluded-accepted, excluded-passed⟩ for each fixture | Two-row table (mixed fixture, all-observed control); four integer fields per row | `DEFERRED` | Compute from MOD-09 at first implementation. The control row must show both exclusion counts at zero; the mixed row must show both non-zero. A vector showing only one side non-zero is ST-F2's exact defect and fails |

---

## 6. Hook specifications

| ID | Name | Trigger | Condition | BLOCK action | Registered at |
|---|---|---|---|---|---|
| HOOK-03 | `H-NOBAR` | `@before-threshold-read` | The value originates from the bar projection (OBJ-22 / `bar()`) | Reject any literal, configured or defaulted threshold | MOD-09 `calibration/` |
| HOOK-08 | `H-COUNT` | `@before-bar-return` | Exclusion counts are present for **BOTH** populations | Reject the return value | MOD-09 `calibration/` |

```
HOOK HOOK-03 (H-NOBAR) @before-threshold-read {
    condition: the value originates from the bar projection,
    BLOCK: reject any literal, configured or defaulted threshold
}

HOOK HOOK-08 (H-COUNT) @before-bar-return {
    condition: exclusion counts are present for BOTH populations,
    BLOCK: reject the return value
}
```

**Hook count discipline (S2 §6).** Nine hooks exist across the whole system. F4 registers exactly
**two**, both at MOD-09. MOD-10 and MOD-13 register **none** — and that absence is deliberate, not
an omission: MOD-10's guarantee is enforced by the *non-existence* of an act signature accepting a
diagnostic (a structural property, not a runtime gate), and MOD-13's by `ASSERT_ABSENT δ` over gate
conditions, which is a parse-level assertion owned by the gates. **A tenth hook appearing anywhere
in Phase 3 is a defect, not an improvement.**

---

## 7. Production concerns surfaced by F4 modules

*Developer-owned gates, carried from S1. No PC ids minted here.*

- **Display of the withheld axes (S1 PC-7 — watch this one).** This is the concern F4 surfaces most
  sharply, and it lands on the MOD-10 → MOD-02 seam. The core can return `withheld[]` perfectly
  faithfully — which axis is missing, why, and what would supply it — and a UI that renders only the
  axes present restores **exactly the silence the concept forbids**, at a layer no invariant reaches.
  Nothing in MOD-10's interface can prevent this, because the renderer is external and reached only
  through MOD-02. The same shape recurs twice more in this facet: a UI free to render a θ without
  the sample size behind it, and a UI free to render `bar()`'s populations without their two
  exclusion counts, produce the identical failure by the identical route. All three are instances of
  the one concern, not new concerns. Developer-owned, and the developer should be told that the
  guarantee ends at the seam.
- **Fold performance (S1 PC-4).** MOD-09's two projections are as-of folds over the full record, and
  MOD-09 is the heaviest fold in the system: populations are assembled per read, at every declaration
  level, from candidates, commitments, draw contexts, observations and invalidations. **A height-keyed
  cache is permitted; memoization across a record extension is not** — and because the partition is
  non-monotone, the usual mitigation (an incremental counter) is not merely discouraged but
  structurally incapable of being correct. This constrains what optimisation is available, and is
  therefore a real deployment concern rather than a theoretical one.
- **Not surfaced by these modules:** storage growth (PC-1), author identity (PC-2), commit-path
  concurrency (PC-3), refusal observability (PC-5), cost estimation (PC-6). Recorded so a reader does
  not infer silence means coverage.

---

## 8. Open items

*Surfaced, never resolved.*

1. **AE-5 — what rule constitutes separation of the two populations. `NO_DEFAULT`.** The single
   reason OBJ-22 and therefore MOD-09 carry status `DEFERRED`. What "separated" means is unresolved
   and **cannot be resolved without data that does not yet exist**. No default may be supplied — not
   here, not in configuration, not as an implementer's judgment call. Until a declaration level's two
   populations both reach a floor and separate, `bar()` returns ⊥ on the **population branch**, before
   the separation operator is ever consulted, so the open rule is never on the critical path of a
   first run. *Resolution trigger:* the first declaration level reaching both population floors.
   *Consequence while open:* **VEC-02 row 4 is uncomputable and MOD-09 is not counted complete.**
2. **The population floor is itself part of AE-5 and is not supplied here.** "Both populations reach
   a floor" names a quantity nobody has yet fixed. It must not be defaulted to a convenient integer
   on the way to making the ⊥ branch look decisive. Open with AE-5.
3. **AE-4 — is accept/reject behaviour stationary enough for pooled history?** MOD-09 pools an
   operator's whole accept/reject history at a level. If the operator's taste drifts, the pooled
   history is wrong **in a direction nobody would notice**, and θ is stale. Carried, non-blocking:
   the ⊥ path is unaffected either way. *Resolution trigger:* observed threshold drift exceeding its
   own spread across epochs.
4. **AE-3 — are same-condition draws i.i.d.?** Consumed, not owned: MOD-10 takes MOD-08's dispersion
   output as given. If false, the dispersion axis is wrong **and nothing else is** — the isolation
   was verified at the minimal worked example. Surfaced because MOD-10 is where a wrong dispersion
   axis would be displayed as a confident one.
5. **DG-F5 — which dispersion and location statistics.** Owned by F3 / MOD-08, but it gates
   **VEC-04's** rows requiring a present dispersion axis. Bounded implementation decision; surfaced
   as a dependency, not claimed.
6. **AE-6 residue — what closes a sample.** MOD-09's `PassedOver` population is defined over
   **closed** samples, and closure (by a Commitment **or** by a revision) is decided by MOD-06
   `condition/`, not here. MOD-09 consumes `closed_samples` without re-deciding it. Flagged so that
   nobody re-litigates sample closure inside `calibration/` and produces a second, disagreeing
   reading of which candidates were passed over.
7. **Unpriced module boundary at MOD-09 → MOD-11.** C0 §2 prices seam P-4 (OBJ-14 Scope ↔ OBJ-33
   StopCondition) as **expensive and therefore interior to MOD-11**, and lists no cheap-seam row for
   OBJ-22 → OBJ-33/OBJ-14. But S1 records `SEAM-05` (MOD-10 BarProjection → MOD-12 ScopeAuthority)
   as a **hard** seam, and the resolved partition places its two ends in different modules. The
   boundary therefore exists and carries a hard contract, while appearing on neither of C0's pricing
   tables. Specified in §3 above as a source seam so it is not lost. **Surfaced, not resolved** —
   whether C0's pricing omitted it or intended it as interior is a coordinator question.
8. **MOD-13's outbound display path has no priced seam row.** C0's cheap-seam list contains no
   advisory row, consistent with "read by nothing" — but δ *is* displayed, so an outbound edge to
   MOD-02 exists (S1 SEAM-27's outward leg). Specified in §3. Surfaced so that "no seam" is not later
   read as "no display", nor "display" as "a consumer".
9. **Naming collision between S1 and P3 module numbering — a live misrouting risk for this facet.**
   In S1, `MOD-02` is `UnitRegistry` and `MOD-10` is `BarProjection`; in the P3 partition, `MOD-02`
   is `ports/` and `MOD-10` is `diagnostic/`, while the bar lives at `MOD-09 calibration/`. S1's
   recorded seams SEAM-12, SEAM-17 and SEAM-20 all name `MOD-10` meaning the bar. A reader carrying
   S1's identifiers forward unchanged will route the declaration level and θ to the wrong modules —
   in particular sending the level to `ports/`. Surfaced, not resolved; a coordinator-level mapping
   note would settle it.
