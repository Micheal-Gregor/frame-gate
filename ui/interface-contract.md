# Interface contract

One page. What the sealed library offers a UI or an agent caller, in the terms a caller needs.
Phase 5 reads this FIRST, every session — it is the cheap answer to "can the library already
do this?", and it exists so no session ever guesses instead. Written at the seal from the
object model and the modules' public signatures; regenerated only at a re-seal. Keep it a
listing, not an explanation. NOT-YET-WRITTEN

*Build-time note (Frame Gate, 2026-10-12).* The library is not sealed. Rows are added module by
module as each is built, because `gate.py` compares signatures against this file at every commit.
The marker above stays until the seal writes the whole page. MOD-01 and MOD-02 export no classes
(see the object model), so they have no rows here. MOD-03 and MOD-05 rows are below.

## Objects

| Object | What it represents | Read-only to the user |
|---|---|---|
| Currency (OBJ-05) | A draw class; the classes are totally ordered by cost | yes — configuration, loaded once |
| Unit (OBJ-06) | The identity of the thing a draw is made for, and its features | yes |
| Declaration (OBJ-13) | A HUMAN assertion that a unit belongs to a classification level, at a height | yes, once appended — a later declaration supersedes it from its own height on |
| IndependenceAct (R-10) | A HUMAN act licensing (or withdrawing) a unit's independence, at a height | yes, once appended |
| Commitment (OBJ-12) | A HUMAN commitment for a (unit, currency), at a height; what the next currency's reachability reads | yes, once appended — it leaves force only when the invalidation reader (MOD-12) says so |
| CommitGate (OBJ-31) | The gate a commitment passes: closed by a HUMAN act; a diagnostic or an observation may propose, never close | yes — a fixed descriptor |

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

## Error states

| Error | Raised by | What the user should see |
|---|---|---|
| TypeError "CurrencyOrder requires currencies" | CurrencyOrder constructor | configuration is missing the currency order |
| RangeError "…must have a least element: the list is empty" | CurrencyOrder constructor | the currency order is empty |
| RangeError "currencies must be distinct: a total order has no ties" | CurrencyOrder constructor | a currency appears twice in the order |
| TypeError "UnitRegistry requires units" | UnitRegistry constructor | configuration is missing the units |
| TypeError "… requires record" / "record must offer append and readAsOf" | DeclarationLedger, IndependenceLedger, CommitmentLedger constructors | the record binding is missing or is not a RecordPort |
| TypeError "DeclarationLedger requires levels" | DeclarationLedger constructor | configuration is missing the classification levels |
| TypeError "CommitmentLedger requires invalidations" / "invalidations must offer isInvalidated" | CommitmentLedger constructor | the invalidation reader (MOD-12, R-19) is missing or does not answer isInvalidated |
