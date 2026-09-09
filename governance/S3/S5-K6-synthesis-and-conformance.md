# S5 Synthesis Gate + K6 Conformance Gate — The Frame Gate

Closing gate. All five facets complete and written to `facets/`. Consolidated **once**.

---

# S5 · Synthesis

## 1. What arrived

| Facet | Modules | Objects | REF | VEC | HOOK | Open items raised |
|---|---|---|---|---|---|---|
| F1 Kernel & Ports | MOD-01, 02, 03 | 13 | 2 | N/A-by-absence | 1 | 7 |
| F2 The Gate | MOD-04, 05, 12 | 9 | 5 | 2 | 2 | 9 |
| F3 Evidence | MOD-06, 07, 08 | 9 | 3 | 1 | 2 | 8 |
| F4 Judgment | MOD-09, 10, 13 | 6 | 4 | 4 | 2 | 3 |
| F5 Spend | MOD-11 | 5 | 5 | N/A-by-absence | 2 | 5 |
| **Total** | **13** | **42** | **19** | **7** | **9** | **32** |

Counts reconcile against C0 §6 exactly. **Nine hooks, not ten.**

## 2. The convergent finding — four facets, one defect

**F1, F2, F3, F4 and F5 each independently reported a `MOD-nn` namespace collision.** Five of five.
That convergence is the finding, and it is the kind of defect that is invisible from inside any one
facet.

**The defect.** S1 numbered eighteen specification modules `MOD-01…MOD-18` before the emission
contract existed. C0 minted thirteen Phase 3 modules over the same identifier space. The two
numberings are **not merely different — they are misleadingly compatible**: S2 §2's `Traces to`
column cites S1 numbers, so a Phase 4 reader carrying an identifier forward lands in a real module
that is the wrong one. F4's example is the sharpest: S1's `MOD-02` is the unit registry and Phase 3's
`MOD-02` is `ports/`, so "route the declaration level to MOD-02" reads as *put it in the port layer*.

**Resolution — non-destructive, neither claim dropped.** The emission contract states `MOD-nn` is
**minted in Phase 3 §2**. S1's module numbers therefore predate the contract and are **legacy labels,
not contract identifiers**. Phase 3's `MOD-01…MOD-13` are authoritative. The S3 carries an explicit
**crosswalk** (§1 of the emitted document) so no reader silently carries an S1 number forward, and
every facet slice already states its rows in C0's namespace with the S1 row named alongside.

**Recorded, not repaired away:** S2 §2's trace column still reads in S1 numbering. It is fixed input
and is **not edited**. The crosswalk is how it stays readable.

## 3. The contradiction path — exercised on a genuine multi-output tension

This is the first point in the pipeline where multiple facet outputs exist, so the contradiction path
fires here. It is exercised on a real conflict, not a manufactured one.

**The conflict.** Two facets specified incompatible dependency structures for the same computation.

- **F3 (Evidence)** specified `Location` (OBJ-21) as taking θ **as a caller-supplied argument**,
  explicitly to avoid a `MOD-08 → MOD-09` import that would make the evidence path cyclic
  (`MOD-07 → MOD-09 → MOD-08 → MOD-07`).
- **F4 (Judgment)** specified `MOD-09 calibration/` as having **no dependency on MOD-08**, deliberately,
  calling it a refusal of a referential calibration loop.

Both are correct about their own module and neither can be satisfied by the other's structure: F3
leaves θ arriving from somewhere unnamed, F4 forecloses the obvious somewhere.

**Resolution by traced justification — no claim dropped.**

> **`Location` does not take θ at all.** OBJ-21 computes a **centre statistic over a sample** and
> nothing else. The *comparison* of that centre against a bar is not a statistic; it is the second
> classifier of the diagnostic, and it belongs to **MOD-10**, which is the only module that already
> depends on both MOD-08 and MOD-09.

The trace is exact. S2 records the diagnostic as `Δ = ⟨class_σ(σ), class_μ(μ, θ)⟩` — **the composer
applies both classifiers**; the statistics module supplies μ and never sees θ. F3's cycle is avoided
because MOD-08 imports nothing new. F4's refusal holds because MOD-09 still imports nothing from
MOD-08. Both claims survive intact and the unnamed somewhere is named.

**Correction issued to F3:** OBJ-21's interface drops its θ parameter. Recorded as a synthesis
correction, not a facet error — the tension was only visible once both slices existed, which is what
a closing gate is for.

## 4. Apparent module cycles — resolved, not merged

**F2** reported two module-level dependency cycles: `MOD-04 ↔ MOD-05` and `MOD-05 ↔ MOD-12`, flagging
that the obvious fix is exactly the merge S2 forbids.

**They are apparent, not real, and C0's hook placement is why.**

- `MOD-04 → MOD-05` is a **call**: the gate reads the commitment fold.
- `MOD-05 ← MOD-04` is a **hook registration**, not an import. `HOOK-01` is registered *at MOD-04* and
  fires at the append trigger. A registration is a declaration the kernel dispatches; the facts module
  never names the gate.

Identically for `MOD-05 ↔ MOD-12` via `HOOK-04`. **This is why C0 registered both hooks at their
owning modules rather than at the append site**, and the decision now has a second justification it
did not have when it was made. No merge. Recorded so a later reader does not "simplify" it.

## 5. Seam gaps found — minted, not invented

Three facets reported dependencies the S1 seam list does not record. Each is a **gap in the contract
graph**, surfaced by specification and minted here rather than left implicit.

| Gap | Reported by | Resolution |
|---|---|---|
| `MOD-05 → MOD-11` — candidate counts feeding the ratio. S1 traces the ratio to Candidate + Currency but records no seam | F2 | Minted `SEAM-22` |
| `MOD-06 → MOD-09` — sample closure feeding calibration. Required by AE-6's resolution; absent from S1's 28 | F3 | Minted `SEAM-23` |
| `MOD-09 → MOD-11` — whether the bar exists, hence whether a stop condition is expressible. S1 records it hard; C0 §2 priced neither side | F4 | Minted `SEAM-13` |

**F1's refinement accepted:** C0's `Q-7 (ports → everything)` is expanded into directed per-target
rows, because a validation rule cannot be written against "everything."

## 6. Fidelity correction — a carried hook that over-specifies

**F5 found that `HOOK-05`'s inherited condition says "an *unexpired* scope exists," and no expiry
field or rule is proven anywhere in S1 or S2.**

This is a CT-3 spec-fidelity problem in the *carried payload itself* — the hook text references
structure the model does not contain. The rule is carry-don't-generate, and F5 correctly surfaced it
rather than inventing an expiry.

**Resolution, non-destructive.** The condition is restated to what S2 proves — *a scope exists with
remaining > 0* — and **the original wording is preserved verbatim** in the S3's §7 note. Nothing is
silently edited: the discrepancy and its resolution both travel forward. Expiry becomes an open item
(`ODG-FG-05`), because if it turns out to be wanted it is a new field, not a rediscovered one.

## 7. Consolidated open items

Thirty-two raised across five facets. Deduplicated to **eight** carried forward (the rest were the
numbering collision, resolved above, or resolved within §3–§6).

| Ref | Item | Owner |
|---|---|---|
| ODG-FG-03 | Does an all-ABSENT candidate count toward the dispersion floor of three? F3's reading is no — three unobserved candidates would otherwise satisfy a floor that exists to make variance estimable | F3 / MOD-08 |
| ODG-FG-04 | Who carries the undischargeable-ABSENT bound forward — MOD-09's exclusion counts, or OBJ-42 WithheldReason? | F3 / F4 |
| ODG-FG-05 | Scope expiry: proven nowhere. If wanted, a new field | F5 / MOD-11 |
| ODG-FG-06 | "Independent unit" — the predicate licensing `from = ⊥` — is stated as a constraint and owned by no object | F2 / MOD-03 |
| ODG-FG-07 | Which member of the `Unknown` family θ = ⊥ carries. F1 declined to choose: choosing would place a MOD-09 ruling in the kernel | F1 / F4 |
| DG-F3 | Scope spent by dispatch or by return — cited at `MOD-02 → MOD-11`, never restated | F5 |
| DG-F5 | Which dispersion and location statistics | F3 |
| AE-3 / AE-4 / AE-5 | i.i.d.; stationarity; the separation rule (`NO_DEFAULT`) | F3 / F4 |

**Documentation note, not a defect:** S1's prose says "eighteen refusal tests" and "Hooks — eight"
while its own enumerations run to nineteen and nine. `CT-19` and `H-RATIO` both arrived with owner
ruling DG-F4 after the prose was written. **S2 and C0 carry 19 and 9, and those are correct.**
Recorded by F1, F2 and F5 independently so no reader concludes a test or hook was invented here.

---

# K6 · Conformance Gate

## CT-1 Trace-conformance — **PASS**

Every produced component traces back to an admitted S2 node. 13 modules over 42 objects; **each OBJ
appears in exactly one module** (verified arithmetically: 5+5+3+2+4+4+3+2+2+3+5+3+1 = 42, contiguous
OBJ-01…OBJ-42, no duplicates). No orphan components. The three seams minted at §5 each trace to an
object pair S2 admitted; none introduces a node.

## CT-2 Constraint-conformance — **PASS**

The rules **this S2 carried**, checked one by one:

| Carried rule | Result |
|---|---|
| Append-only; no update, no delete | Honoured — MOD-05, MOD-06, MOD-11 append; no mutating signature is reachable (F5 verifies REF-17 structurally) |
| Fold-not-store; no memoization across a record extension | Honoured — every projection takes a record height; zero internal state in MOD-04…MOD-13 |
| `ON_FAIL` mandatory on every gate | Honoured — all four gates name an EV-5 outcome |
| `Unknown` is closed at five | Honoured — F1 specifies five constructors and states explicitly that `Absent` is **not** a member |
| The Projection family is a membership list, not a property | **Honoured, and hardened** — F1 exports *no membership predicate*, so no module can ask "is this a Projection?" and get a shape-computed answer. This is stronger than the S2 required |
| Declared never inferred; inferred never written | Honoured — MOD-03 offers `declaration_at(unit, height)` and **no** `current_declaration()` |
| Externals only through the port module | Honoured — REF-02 makes it a parse-level check |
| No single module owns all ten Projections (ODG-FG-01) | **Honoured with margin — maximum 2 of 10 per module, across seven modules.** Mechanically checkable |
| The diagnostic proposes and never closes | Honoured — REF-06 asserts no act signature accepts it |
| Nine hooks, a tenth is a defect | Honoured — exactly nine |
| Affordance show-disabled-with-reason | **N/A-by-absence** — this S2 proves no interaction facet |
| Device trust boundary HALT | **N/A-by-absence** — this S2 proves no trust boundary |
| Stored-vs-computed boundary configurable | **N/A-by-absence** — this S2 stores nothing derived; the boundary does not arise |

Three rules marked N/A-by-absence, never silently passed.

## CT-3 Spec-fidelity — **PASS, with one correction issued**

No component adds behaviour S2 never proved. Checked hardest where invention is most tempting:

- **No statistic was chosen** (DG-F5 left open) — pinning one would smuggle in a distributional
  assumption.
- **No separation rule was written** (AE-5, `NO_DEFAULT`) — MOD-09 ships `DEFERRED` rather than
  guessing.
- **No threshold setter exists anywhere** — F4 states this as a non-existence property of the
  interface, not as a runtime guard.
- **F5 declined to invent scope expiry** when the carried hook text implied one. The correction at
  §6 is a *restatement to what is proven*, with the original preserved. **This is CT-3 working**: a
  facet found the carried payload over-specifying and surfaced it instead of building to it.

## CT-4 Refusal-conformance — **PASS**

**19 guards, 19 refusal tests, each with a forbidden input, an expected rejection, a cited invariant
and a snake_case test name binding it to an executable case.** Positive counterparts specified for
every one, so no guard can pass by refusing everything.

Distribution: F1 2 · F2 5 · F3 3 · F4 4 · F5 5.

Six are **parse-level** rather than runtime rejections (REF-01, REF-02, REF-06, REF-09, REF-12,
REF-17). That is correct and is the stronger form: a malformed definition cannot be argued with at
runtime.

## CT-5 Vector-conformance — **PASS**

**7 pinned values, 7 golden vectors, all `DEFERRED` — none hand-written.** Each carries an
`Encoding`, a discharge condition, and — the requirement most often missed — **its rule stated
independently of the vector**. A value whose rule is recoverable only from the vector would fail
here; each was checked.

**VEC-02's fourth row is uncomputable until AE-5 closes, and MOD-09 is not counted complete until it
does.** That is recorded in its discharge condition, not left as an aspiration.

**F1 and F5 pin no value and are marked `N/A-by-absence` with reasons** — F1 computes no domain
result; F5's guarantee is denominated in a cost figure it does not own. Neither is a silent pass, and
F5 additionally records that a later `VEC` against MOD-11 would be a *new* obligation rather than a
discovered one.

## CT-6 Hook-conformance — **PASS**

**8 load-bearing invariants, 9 hook specifications** — the ninth (`HOOK-09`) belongs to owner ruling
DG-F4 rather than to an `INV-*` tag, and is load-bearing by ruling. Each carries a trigger point, a
condition, and a block action, in table form and in the Appendix A grammar.

`HOOK-09`'s block target is **the authorization form, never the spend** — F5 records that a system
refusing an approval on a bad-looking vector has *inverted* the ruling rather than tightened it.

Advisory rules remain prose and earn no hook: the six elegance rules, the choice of statistic,
MOD-13's display formatting.

## Verdict

### **PASS — conformant. Not under-verified.**

Every carried guard has a refusal test; every pinned value has a golden vector, deferred with a
discharge condition; every load-bearing invariant has a hook specification; production concerns are
enumerated as developer-owned gates. No AE is registered after this gate — the eight items at §7
travel as open decision gates.

**Proceed to the emission gate.**
