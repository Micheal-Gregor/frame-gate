# Interface contract

One page. What the sealed library offers a UI or an agent caller, in the terms a caller needs.
Phase 5 reads this FIRST, every session — it is the cheap answer to "can the library already
do this?", and it exists so no session ever guesses instead. Written at the seal from the
object model and the modules' public signatures; regenerated only at a re-seal. Keep it a
listing, not an explanation. NOT-YET-WRITTEN

*Build-time note (Frame Gate, 2026-10-12).* The library is not sealed. Rows are added module by
module as each is built, because `gate.py` compares signatures against this file at every commit.
The marker above stays until the seal writes the whole page. MOD-01 and MOD-02 export no classes
(see the object model), so they have no rows here (MOD-01's one join, `asProjection`, R-35, is internal plumbing a UI never calls). MOD-03, MOD-04 and MOD-05 rows are below.

## Objects

| Object | What it represents | Read-only to the user |
|---|---|---|
| Currency (OBJ-05) | A draw class; the classes are totally ordered by cost | yes — configuration, loaded once |
| Unit (OBJ-06) | The identity of the thing a draw is made for, and its features | yes |
| Declaration (OBJ-13) | A HUMAN assertion that a unit belongs to a classification level, at a height | yes, once appended — a later declaration supersedes it from its own height on |
| IndependenceAct (R-10) | A HUMAN act licensing (or withdrawing) a unit's independence, at a height | yes, once appended |
| Commitment (OBJ-12) | A HUMAN commitment for a (unit, currency), at a height; what the next currency's reachability reads | yes, once appended — it leaves force only when the invalidation reader (MOD-12) says so |
| CommitGate (OBJ-31) | The gate a commitment passes: closed by a HUMAN act; a diagnostic or an observation may propose, never close | yes — a fixed descriptor |
| DrawContext (OBJ-16) | What held at a draw: the given features, the declaration in force at the draw height (by its height), the governing scope (by its height) and the condition's identity | yes, once appended — a re-declaration never changes it |
| ResolutionLabel (OBJ-16) | `DRAW` or `REVISION`, attached to a draw context after the fact | yes, once appended |
| Candidate (OBJ-11) | A drawn candidate: the draw context it was drawn under (by height — so the declaration at draw time is recoverable per candidate), unit, currency, condition identity, seed, signature, and `from` (the commitment immediately below it derives from, by height, or BOTTOM) | yes, once appended — never updated, never deleted |
| BOTTOM | The `from` of a candidate at the least currency of an independent unit; `NoSubject` in the Unknown family (IR-42) | yes — a fixed value |
| Reachability (OBJ-24) | THE CONCEPT: reachable(u, c) as of a height iff every strictly cheaper currency has a commitment; a Projection | yes — derived per read, stored nowhere |
| ReachabilityEvaluation | One evaluation: the verdict, one witness per strictly cheaper currency (its commitment, or what the fold answered), and — when refused — the cheapest unmet currency (R-34) | yes — derived |
| ReachabilityGate (OBJ-29) | The one admission decision on the reachability axis; ON_FAIL `refuse("unreachable")` | yes — a fixed descriptor |

## Actions

Copied from the signatures, never written from memory of the happy path. Every cell is
required: an operation whose refusals are unwritten cannot be called safely, because a caller
cannot tell a correct refusal from a break. `Invariant to` lists any declared input the
operation legitimately ignores — the only way an OS-12 two-call test may return equal answers.

| Operation | Module | What it does | Inputs | Returns | Refusals | Side effects | Determinism | Invariant to |
|---|---|---|---|---|---|---|---|---|
| CurrencyOrder.currencies | MOD-03 | The currency set, cheapest first; indexes the ratio vector, never counted | none | readonly Currency[] | none | none | deterministic | none |
| CurrencyOrder.least | MOD-03 | The least currency; guaranteed to exist | none | Currency | none | none | deterministic | none |
| CurrencyOrder.predecessors | MOD-03 | Every currency strictly cheaper than the one given | currency | readonly Currency[], or Unknown | Unknown `refuse("currency-not-in-this-order")` for a currency from another order | none | deterministic | none |
| UnitRegistry.unit | MOD-03 | The Unit with this identity | id | Unit, or Unknown | Unknown `NoSubject` when no such unit was loaded | none | deterministic | none |
| UnitRegistry.features | MOD-03 | A unit's features, read-only (consumed by MOD-13 only) | unit | Features, or Unknown | Unknown `NoSubject` when the unit is not in this registry | none | deterministic | none |
| DeclarationLedger.levels | MOD-03 | The configured classification levels | none | readonly string[] | none | none | deterministic | record |
| DeclarationLedger.declare | MOD-03 | Appends a HUMAN declaration that a unit belongs to a level | unit, level, author | Declaration, or Unknown | Unknown `refuse("level-not-configured")`, nothing appended; a non-HUMAN author does not compile (HOOK-07, R-11) | appends exactly one entry to the record | the returned height is assigned by the record; otherwise deterministic | none |
| DeclarationLedger.declarationAt | MOD-03 | The declaration in force for a unit as of a height | unit, at | Declaration, or Unknown | Unknown `NoSubject` when no declaration had been made by that height | none — reads the record | deterministic for a given record prefix | levels |
| IndependenceLedger.declareIndependence | MOD-03 | Appends a HUMAN act asserting or withdrawing a unit's independence (R-10) | unit, independent, author | IndependenceAct | a non-HUMAN author does not compile (HOOK-07, R-11) | appends exactly one entry to the record | the returned height is assigned by the record; otherwise deterministic | none |
| IndependenceLedger.independenceAt | MOD-03 | The independence act in force for a unit as of a height | unit, at | IndependenceAct, or Unknown | Unknown `NoSubject` when no act had been made by that height, which means NOT licensed | none — reads the record | deterministic for a given record prefix | none |
| CommitmentLedger.commit | MOD-05 | Appends a HUMAN commitment for a unit at a currency | unit, currency, author | Commitment | a non-HUMAN author does not compile (OBJ-31); no diagnostic or observation can be passed (REF-06) | appends exactly one entry to the record | the returned height is assigned by the record; otherwise deterministic | invalidations |
| CommitmentLedger.effectiveCommitment | MOD-05 | The commitment in force for a unit at a currency as of a height — a fold, never stored | unit, currency, at | Commitment, or Unknown | Unknown `NoSubject` when none is in force (BOTTOM); Unknown `uncomputable("two-effective-commitments")` when more than one is (R-20) | none — reads the record and asks the invalidation reader | deterministic for a given record prefix and invalidation reader | none |
| DrawContextLog.recordDraw | MOD-05 | Appends the context of a draw, reading the declaration in force at the draw height (R-21) | unit, features, scope, condition, at, author | DrawContext, or Unknown | Unknown `refuse("no-declaration")` when none is in force at `at` (REF-05), nothing appended; any other Unknown from the declaration reader is returned unchanged, nothing appended | appends exactly one entry to the record, unless refused | the returned height is assigned by the record; otherwise deterministic for a given record prefix | none |
| DrawContextLog.label | MOD-05 | Appends a resolution label (`DRAW` / `REVISION`) to a draw context, after the fact | context, resolution, author | ResolutionLabel | none — a second label is appended and the read answers `uncomputable` (R-24) | appends exactly one entry to the record | the returned height is assigned by the record; otherwise deterministic | declarations |
| DrawContextLog.drawsAsOf | MOD-05 | The draw contexts for a unit appended at or below a height, in append order | unit, at | readonly DrawContext[] | none — no draws is an empty list | none — reads the record | deterministic for a given record prefix | declarations |
| DrawContextLog.resolutionAt | MOD-05 | A draw context's resolution as of a height | context, at | Resolution, or Unknown | Unknown `NoSubject` when no label yet (not a refusal); Unknown `uncomputable("two-resolution-labels")` when more than one (R-24) | none — reads the record | deterministic for a given record prefix | declarations |
| CandidateLedger.appendCandidate | MOD-05 | The ONE way a candidate enters the record (S-01): asks admission, checks the bound draw context, checks `from`, asks the signature check, asks the scope ceiling — in that order (R-31) | proposal (with the DrawContext it was drawn under — none, none compiles: REF-05), signature, at, author | Candidate, or Unknown | MOD-04's Unknown (e.g. `refuse("unreachable")`) unchanged, nothing else asked; `refuse("context-mismatch")` when the context is another unit's or condition's, or newer than `at`; `refuse("context-spent")` when a candidate already binds it as of `at` (R-33: one draw, one candidate); `refuse("malformed-from")` when `from` is not the effective commitment immediately below, or is BOTTOM without an independence license at the least currency (R-26); MOD-12's Unknown unchanged; MOD-11's Unknown unchanged (e.g. `refuse("scope-exceeded")`); in every case nothing appended | appends exactly one entry to the record, unless refused | the returned height is assigned by the record; otherwise deterministic for a given record prefix and deciders | none |
| CandidateLedger.candidatesAsOf | MOD-05 | The candidates for a unit and currency under one condition identity, at or below a height (S-09) | unit, currency, condition, at | readonly Candidate[] | none — none is an empty list | none — reads the record | deterministic for a given record prefix | commitments, currencies, independence, admission, signatures, ceiling |
| CandidateLedger.derivedFrom | MOD-05 | The candidates whose `from` is a given commitment, at or below a height (MOD-12's lineage) | commitment, at | readonly Candidate[] | none — none is an empty list | none — reads the record | deterministic for a given record prefix | commitments, currencies, independence, admission, signatures, ceiling |
| CandidateLedger.countsAsOf | MOD-05 | One candidate count per currency for a unit, in currency order, zeros included (SEAM-22) — never summed, never divided | unit, at | readonly CurrencyCount[] | none | none — reads the record | deterministic for a given record prefix and currency order | commitments, independence, admission, signatures, ceiling |
| Reachability.of | MOD-04 | Reachability of a unit in a currency, as a Projection computed at a height (R-35) | unit, currency | Projection<ReachabilityEvaluation> | none — a currency outside the order makes `compute` answer MOD-03's Unknown, never "unreachable" | none — reads the commitment fold | deterministic for a given record prefix | none |
| ReachabilityGate.evaluate | MOD-04 | The ONE evaluation: the verdict, the witnesses, and when refused the cheapest unmet currency (R-34) | unit, currency, at | ReachabilityEvaluation | Unknown for a currency outside the order (MOD-03's, passed through) | none — reads the fold | deterministic for a given record prefix | none |
| ReachabilityGate.admit | MOD-04 | MOD-05's injected admission (R-18, HOOK-01): ADMIT or Refuse(unreachable), from one evaluation | unit, currency, at | "ADMIT", or Unknown | Unknown `refuse("unreachable")` when any strictly cheaper currency lacks a commitment as of `at` (REF-03), no other failure outcome; MOD-03's Unknown for a currency outside the order | none — reads the fold | deterministic for a given record prefix | none |

## Error states

| Error | Raised by | What the user should see |
|---|---|---|
| TypeError "CurrencyOrder requires currencies" | CurrencyOrder constructor | configuration is missing the currency order |
| RangeError "…must have a least element: the list is empty" | CurrencyOrder constructor | the currency order is empty |
| RangeError "currencies must be distinct: a total order has no ties" | CurrencyOrder constructor | a currency appears twice in the order |
| TypeError "UnitRegistry requires units" | UnitRegistry constructor | configuration is missing the units |
| TypeError "… requires record" / "record must offer append and readAsOf" | DeclarationLedger, IndependenceLedger, CommitmentLedger, DrawContextLog constructors | the record binding is missing or is not a RecordPort |
| TypeError "DeclarationLedger requires levels" | DeclarationLedger constructor | configuration is missing the classification levels |
| TypeError "CommitmentLedger requires invalidations" / "invalidations must offer isInvalidated" | CommitmentLedger constructor | the invalidation reader (MOD-12, R-19) is missing or does not answer isInvalidated |
| TypeError "DrawContextLog requires declarations" / "declarations must offer declarationAt" | DrawContextLog constructor | the declaration reader (MOD-03, R-21) is missing or does not answer declarationAt |
| TypeError "CandidateLedger requires <input>" / "<input> must offer <operations>" | CandidateLedger constructor | one of its seven inputs is missing, or does not offer the operation MOD-05 asks of it (R-18, R-25) |
| TypeError "Reachability requires <input>" / "currencies must offer predecessors" / "commitments must offer effectiveCommitment" | Reachability constructor | the currency order (MOD-03) or the commitment fold (MOD-05) is missing or does not offer what MOD-04 asks |
| TypeError "ReachabilityGate requires reachability" / "reachability must offer of" | ReachabilityGate constructor | OBJ-24 is missing or does not answer `of` |
