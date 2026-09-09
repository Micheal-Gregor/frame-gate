# The Frame Gate — Phase 2 (S2)

## 1. Concept and S1 provenance

The Frame Gate governs **where a system is permitted to spend, in what order, and on what evidence.**
Draw classes ("currencies") are totally ordered by cost; a draw is refused unless every cheaper
currency already carries a commitment for that unit. Over the resulting append-only record it derives
a diagnostic with two independently-available axes — dispersion, computable at n≥3, and location,
computable only against a threshold that is **observed from the operator's own accept/reject
behaviour and never supplied.** When an axis is unavailable the system reports which one and what
would supply it.

**S1:** `P1_FrameGate/step-8-final-package.md` + `CLAUDE_FrameGate.md`. Meta Framework v3-2, builder
mode, Phase 1 complete. Twenty-one axioms (X1–X21), nine primitives, eighteen modules, twenty-eight
seams. Owner rulings **DG-F1** (difficulty is advisory) and **DG-F4** (the ratio is surfaced at the
authorization modal, hook `H-RATIO`) are closed and incorporated.

**Spine:** `∀ node ∈ OCH : trace_back(node) ⊆ proven(S1)`. Backward coverage 42/42. Forward gaps are
reported in §7, never failed on.

**A1 entry guard:** `AND[all_proven, all_directed]` — **PASS**, no halt. AE-3, AE-4, AE-5, DG-F3 and
DG-F5 are admitted as proven-open gates behind fixed interfaces, each naming its `held_behind`
interface in S1.

**Admission:** `PS_OOP = MIN(1.0, 1.0, 1.0, 1.0, 1.0) = 1.0`; RSI checked separately and passing;
AFG finds no flatten-without-equivalence. **ADMITTED.**

**Siblings:** P2_Runner, P2_Board. Not merged.

## 2. Expressed Object Model

| ID | Node | Kind | Tag | Traces to | Status |
|---|---|---|---|---|---|
| OBJ-01 | AppendedFact | abstract base | load-bearing: append-only | append-only law + prohibited forms (S1 §10 BCR) | ACTIVE |
| OBJ-02 | Projection | abstract base | load-bearing: EV-3 fold-not-store | RC-3 AsOfFold (S1 spec §4) | ACTIVE |
| OBJ-03 | Gate | abstract base | load-bearing: ON_FAIL mandatory | BCR §3 gate declarations (A.5) | ACTIVE |
| OBJ-04 | Unknown | closed value family | load-bearing: EV-5 collapse prohibition | A.1 EV-5; RC-1 | ACTIVE |
| OBJ-05 | Currency | value type | — | X1 / MOD-01 | ACTIVE |
| OBJ-06 | Unit | value type | — | X2 / MOD-02 | ACTIVE |
| OBJ-07 | ConditionIdentity | value type | load-bearing: INV-SAMPLE | X7 / MOD-06 | ACTIVE |
| OBJ-08 | Score | value type | — | X9 / MOD-08 | ACTIVE |
| OBJ-09 | Absent | value type | load-bearing: INV-ABSENT | X9, X10; L4 discharge condition | ACTIVE |
| OBJ-10 | RecordHeight | value type | load-bearing: EV-3 | RC-3 / EV-3 | ACTIVE |
| OBJ-11 | Candidate | class (AppendedFact) | load-bearing: INV-SIG, INV-SCOPE | X1, X4 / MOD-03 | ACTIVE |
| OBJ-12 | Commitment | class (AppendedFact) | load-bearing: INV-REACH | X2, X5 / MOD-04 | ACTIVE |
| OBJ-13 | Declaration | class (AppendedFact) | load-bearing: INV-PROV | X15 / MOD-02 | ACTIVE |
| OBJ-14 | Scope | class (AppendedFact) | load-bearing: INV-SCOPE | X16, X17 / MOD-12 | ACTIVE |
| OBJ-15 | Observation | class (AppendedFact) | load-bearing: INV-ABSENT | X9, X10 / MOD-08 | ACTIVE |
| OBJ-16 | DrawContext | class (AppendedFact) | — | X19 / MOD-15 | ACTIVE |
| OBJ-17 | PromptRevision | class (AppendedFact) | load-bearing: INV-SAMPLE | X7, X8 / MOD-06; AE-6 resolution | ACTIVE |
| OBJ-18 | Invalidation | class (AppendedFact) | load-bearing: X21 | X5, X21 / MOD-13; ST-F1 | ACTIVE |
| OBJ-19 | Sample | class (Projection) | held_behind: AE-3 | X7 / MOD-07 | ACTIVE |
| OBJ-20 | Dispersion | class (Projection) | — | X8 / MOD-09 | ACTIVE |
| OBJ-21 | Location | class (Projection) | — | X14 / MOD-09 | ACTIVE |
| OBJ-22 | Bar | class (Projection) | load-bearing: INV-NOBAR; held_behind: AE-4, AE-5 | X11, X12, X13 / MOD-10 | DEFERRED |
| OBJ-23 | PopulationPartition | class (Projection) | load-bearing: INV-COUNT, X21 | X13, X21 / RC-5; ST-F1, ST-F2 | ACTIVE |
| OBJ-24 | Reachability | class (Projection) | load-bearing: INV-REACH | X2 / MOD-05 | ACTIVE |
| OBJ-25 | Diagnostic | class (Projection) | load-bearing: proposals-only | X14 / MOD-11; MWE step 7 | ACTIVE |
| OBJ-26 | Ratio | class (Projection) | load-bearing: H-RATIO | X20 / MOD-16; DG-F4 | ACTIVE |
| OBJ-27 | Chain | class (Projection) | — | X18 / MOD-06, MOD-13 | ACTIVE |
| OBJ-28 | InvalidationScope | class (Projection) | load-bearing: RC-4 scope-before-act | X5 / MOD-13; CS-3 closure | ACTIVE |
| OBJ-29 | ReachabilityGate | class (Gate) | load-bearing: INV-REACH, H-REACH | X2, X3 / MOD-05; CS-1 | ACTIVE |
| OBJ-30 | ScopeGate | class (Gate) | load-bearing: INV-SCOPE, H-SCOPE, H-RATIO | X16, X17 / MOD-12 | ACTIVE |
| OBJ-31 | CommitGate | class (Gate) | load-bearing: proposals_in not closed_by | X2 / MOD-04; MWE step 7 | ACTIVE |
| OBJ-32 | SignatureGate | class (Gate) | load-bearing: INV-SIG, H-SIG | X6 / MOD-14 | ACTIVE |
| OBJ-33 | StopCondition | contextual class | — | X17 / MOD-12; C3 | ACTIVE |
| OBJ-34 | DifficultyAdvisory | contextual class | advisory-only; ASSERT_ABSENT in gates | X15 / MOD-18; DG-F1 ruling | ACTIVE |
| OBJ-35 | RecordPort | port (external) | — | A.2 EXTERNAL rule / MOD-17 | ACTIVE |
| OBJ-36 | RendererPort | port (external) | — | A.2 / MOD-17; Axiom 06 | ACTIVE |
| OBJ-37 | DispatchPort | port (external) | held_behind: DG-F3 | A.2 / MOD-17; P1_Runner | ACTIVE |
| OBJ-38 | AuthorEnum | port (external) | load-bearing: INV-PROV | A.2 / MOD-17; Axiom 05 S-07 | ACTIVE |
| OBJ-39 | DigestPort | port (external) | — | A.2 / MOD-17; Axiom 06 DG-5 | ACTIVE |
| OBJ-40 | AuthorizationForm | composite class | load-bearing: H-RATIO | DG-F4 owner ruling / MOD-12, MOD-16 | ACTIVE |
| OBJ-41 | DiagnosticAxis | value type | — | X14 / MOD-11 | ACTIVE |
| OBJ-42 | WithheldReason | value type | load-bearing: F19 withholding | X14, X19 / MOD-11; F19 §4.2 | ACTIVE |

## 3. Admitted family

Eighteen is-a edges admitted, each proven by a named S1 contract rather than by resemblance.

**Under OBJ-01 AppendedFact** — proven by the external append-only law together with S1's
prohibited-forms list (`✗ delete(k)`, `✗ update(ℂ)`), which governs all eight members identically:
OBJ-11 Candidate · OBJ-12 Commitment · OBJ-13 Declaration · OBJ-14 Scope · OBJ-15 Observation ·
OBJ-16 DrawContext · OBJ-17 PromptRevision · OBJ-18 Invalidation.

**Under OBJ-02 Projection** — proven by RC-3 `AsOfFold`, a single S1 contract whose stated membership
is MOD-04/07/09/10/11/16, extended across the derived objects those modules produce: OBJ-19 Sample ·
OBJ-20 Dispersion · OBJ-21 Location · OBJ-22 Bar · OBJ-23 PopulationPartition · OBJ-24 Reachability ·
OBJ-25 Diagnostic · OBJ-26 Ratio · OBJ-27 Chain · OBJ-28 InvalidationScope. **The family is defined
by this membership list, not by a property.** Re-deriving it from "anything stateless" admits OBJ-34
and defeats the DG-F1 ruling.

**Under OBJ-03 Gate** — proven by Base Case Reduction §3, which declares four gates in one notation
with an identical field set (`condition`, `closed_by`, `proposals_in`, `records`, `ON_FAIL`):
OBJ-29 ReachabilityGate · OBJ-30 ScopeGate · OBJ-31 CommitGate · OBJ-32 SignatureGate.

**OBJ-04 Unknown is a closed value family**, not an extensible base: `Refuse` · `NoSubject` ·
`Uncomputable` · `Undetermined` · `Latent`. Its closure is load-bearing — EV-5's collapse prohibition
depends on it, and the RSI probe that tried to extend it correctly failed.

**God-class block applied.** OBJ-29 is a single condition and the obvious move is to collapse it into
a method on OBJ-12's ledger. Refused: S1 states MOD-05 is its own module and that a second
reachability check anywhere is a defect. A proven-structured element does not become a lone method.

## 4. Refused edges and abstractions

| ID | Refused item | Kind | Reason | Preserved as |
|---|---|---|---|---|
| RFD-01 | `DifficultyAdvisory is-a Projection` | is-a edge | The Projection family is established by RC-3, whose membership list does not contain MOD-18. Unproven by the contract that proves the family. Admitting it would let δ be consumed wherever a Projection is consumed, which owner ruling DG-F1 forbids | Composition — OBJ-34 *has-a* feature computation over OBJ-06, and is read by nothing |
| RFD-02 | `Gate is-a Projection` | is-a edge | Two of four gates close by derivation and resemble projections, but a Gate carries `ON_FAIL` and a Projection does not. A.5 and A.4 are different grammars; the S1 never groups them | Composition — each Gate *has-a* Projection it evaluates (OBJ-29 → OBJ-24; OBJ-32 → OBJ-12's fold) |
| RFD-03 | `ConditionIdentity is-a AppendedFact` | is-a edge | A Condition is identity, not a fact. S1 §10 writes `revise(...) ⇒ append` and never `append(condition)` — the *revision* is appended, the identity is carried | Composition — OBJ-17 PromptRevision *has-a* OBJ-07 ConditionIdentity |
| RFD-04 | `Currency is-a AppendedFact` | is-a edge | S1 MOD-01 holds the order read-only after load. Configuration is not a record fact | Value type OBJ-05 |
| RFD-05 | `HumanAct` over Commitment, Declaration, Scope | abstraction | All three are `⇦`-produced, but **no S1 contract serves those three and only those three**. A3 refuses property-based groupings; this is a label wearing the shape of structure | Tag `authored: HUMAN` on OBJ-12, OBJ-13, OBJ-14 |
| RFD-06 | `ScoredThing` over Candidate | abstraction | A grouping of one. S1 scores only candidates | Nothing; OBJ-15 already relates OBJ-11 to OBJ-08 |
| RFD-07 | `RecordQuery` collapsing the ten Projections | abstraction | ST-3's adversarial interpretation. Element-traceable and therefore passes a naive check, but blocked by the no-god-class rule and independently by RSI — adding a projection would mean editing a parameter enum, a rewrite not an extension | The ten remain distinct classes. Residue carried as ODG-FG-01 |

## 5. Admitted exceptions

| ID | Exception | Scope | Justification | Status |
|---|---|---|---|---|
| AE-01 | OBJ-22 Bar's codomain includes ⊥ — an object whose evaluation legitimately has no value, while every sibling Projection returns one | OBJ-22 | X11/X12: a bar is observed or does not exist. Making it nullable to match its siblings would let a caller coalesce it, which is exactly INV-NOBAR's defect. ⊥ carries a cause and a discharge condition and is not a missing value | ACTIVE |
| AE-02 | OBJ-23 PopulationPartition is non-monotone — members move between partitions — while every other record-derived projection only grows | OBJ-23 | X21, from ST-F1. An invalidated Commitment's Candidate moves `Accepted → PassedOver` because that is what un-approving means. The union stays monotone; only the partition moves. An incremental accumulator cannot represent this | ACTIVE |
| AE-03 | OBJ-34 DifficultyAdvisory is a node with no consumer | OBJ-34 | Owner ruling DG-F1: advisory. It is computed and displayed and read by nothing. Removal fails on meaning and expressive power (S1 T-f), so it is preserved with `ASSERT_ABSENT δ` over every gate condition | ACTIVE |
| AE-04 | OBJ-09 Absent is an in-band non-value inside a vector of values | OBJ-15, OBJ-09 | X10/X12: an unobserved component is not a low score. A sentinel number or a null would both be arithmetically reachable. ABSENT additionally carries a discharge condition distinguishing "not yet observed" from "not observable here" (L4) | ACTIVE |
| AE-05 | OBJ-33 StopCondition exists only in some states | OBJ-30, OBJ-33 | X17: a stop condition is a location judgment and is expressible only where OBJ-22 ≠ ⊥. Not a nullable field — a conditionally-existing member, so that its absence is derived rather than chosen | ACTIVE |
| AE-06 | OBJ-25 Diagnostic returns a partial result — some axes present, others withheld with a reason | OBJ-25, OBJ-41, OBJ-42 | X14 axis independence. Neither a value nor a single EV-5 unknown, but a composite of ordinary EV-5 values per axis. This was the run's Appendix-A adequacy test at S1 conflict C8; the grammar sufficed and no extension was raised | ACTIVE |

## 6. Carried judgment for Phase 3

**Verification payload — carried unchanged from S1. Nothing generated, nothing edited.**

- **19 refusal tests** (CT-1…CT-19), verbatim. CT-19 arrived with owner ruling DG-F4. → Phase 3 §5
  mints `REF-nn`.
- **7 golden vectors** (GV-1…GV-7), **all `DEFERRED`, each with a discharge condition.** GV-2's fourth
  row is uncomputable until AE-5 closes, and OBJ-22 is not counted complete until it does. → Phase 3
  §6 mints `VEC-nn`.
- **9 hooks** — `H-REACH`, `H-ABSENT`, `H-NOBAR`, `H-SIG`, `H-SCOPE`, `H-SAMPLE`, `H-PROV`,
  `H-COUNT`, `H-RATIO` — with trigger, condition and block action verbatim. → Phase 3 §7 mints
  `HOOK-nn`. **Nine, not more. A tenth hook appearing in Phase 3 is a defect, not an improvement.**
- **8 load-bearing invariants** (INV-*), expressed as node tags in §2; the tags travel with the OBJ ids.
- **7 production concerns** (PC-1…PC-7), developer-owned, verbatim. → Phase 3 §8 mints `PC-nn`.

**Partition obligations for C0.**

1. **ODG-FG-01** — no single module may own all ten Projections. ST-3's residue: the no-god-class rule
   and RSI both block the *class* collapse, and neither prevents an implementation hiding a private
   `kind` switch behind ten public methods. That is the One True Table one layer down, and the
   partition is where it can be forbidden.
2. **OBJ-29 and OBJ-24 stay in separate modules from OBJ-12.** The concept's central claim is carried
   by exactly those two nodes, split on the presence of an `ON_FAIL`. One is tiny and the other is a
   one-line fold; the temptation to merge them into the ledger is the concept being lost.
3. **OBJ-40 placement** (ODG-FG-02) determines where `H-RATIO` is registered. If Phase 3 partitions
   `AuthorizationForm` into a view layer, the hook follows it there — otherwise S1's PC-7 defect
   recurs, where a faithful core is defeated at the presentation layer.

**Build order.** OBJ-35 → OBJ-01 → OBJ-11/OBJ-12 → OBJ-24 → **OBJ-29**. The fifth is the concept, it
is small, and CT-1 tests it completely.

**The self-reliance point.** The Projection family (§3) is proven by RC-3's **membership list**. A
Phase 3 that re-derives it from a property — "anything stateless," "anything pure" — silently readmits
OBJ-34 and defeats owner ruling DG-F1. This S2 relies on being read as written at exactly that point.

## 7. Open questions

| Item | Question | Blocking | Resolution trigger |
|---|---|---|---|
| ODG-FG-01 | Partition the Projection family so no module owns all ten | No | Phase 3 §2 |
| ODG-FG-02 | Is OBJ-40 AuthorizationForm a domain object or a view? The hook must live where it lands | No | Phase 3 §2 places OBJ-40 |
| DG-F3 | Cite the external dispatch semantics at OBJ-37 → OBJ-14: a Scope is spent by dispatch, not by return | No | Phase 3 §4 seam row |
| DG-F5 | Which dispersion and location statistics at OBJ-20 / OBJ-21 | No | Bounded implementation decision |
| AE-3 | Are same-condition draws i.i.d.? `held_behind:` OBJ-19. Only OBJ-20 reads it | No (carried) | Observed serial correlation across seeds |
| AE-4 | Is accept/reject behaviour stationary? `held_behind:` OBJ-22 | No (carried) | Threshold drift exceeding its own spread |
| AE-5 | What rule constitutes separation of the two populations? **No default may be supplied.** OBJ-22 is the only node not ACTIVE | No (carried) | A declaration level reaching both population floors |
| A4b-3 | Latent assumption, logged: DG-F4 says the ratio is *surfaced at* authorization; whether the guarded thing is a domain object or a view is not settled by the ruling | No | Same as ODG-FG-02 |

**Forward-coverage gaps — reported, not failed on.** The spine requires every *node* to trace back,
not every S1 element to produce a node. Three S1 elements are unexpressed: **VC-9** (the pairwise
invariant check) is a review procedure, carried as a Phase 3 §11 obligation; **SC-3** ("the number two
appears nowhere") is a codebase property, expressed only as OBJ-05's kind; **ER-1…ER-6** are
code-level rules, two carried as tags and four remaining prose.
