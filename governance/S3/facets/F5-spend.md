# F5 · Spend — MOD-11 `spend/`

**S2 anchor:** `P2_FrameGate/CLAUDE_FrameGate_Phase2.md` (fixed input, never edited).
**Partition anchor:** `P3_FrameGate/C0-coordinator.md` §3 (MOD-11 owns OBJ-14, OBJ-26, OBJ-30,
OBJ-33, OBJ-40) and §4 (F5 owns MOD-11 alone).
**Concept isolation:** no content imported from P3_Runner or P3_Board.

---

## 1. Facet scope and carried judgment

F5 owns **the moment money is committed**. Draw classes are totally ordered by cost; the expensive
currency is unreachable until the cheap one has committed. F5 does not own that ordering (MOD-03) and
does not own the reachability refusal that enforces it (MOD-04). F5 owns what stands between a
permitted spend and an unbounded one: a **bounded permission appended before the draw**, the **gate
that counts against it**, the **stop condition that exists only where the threshold does**, and the
**per-unit draw vector present at the authorization**.

Three judgments are carried into this facet and are not re-opened here.

1. **Bounded permission is a fact, not a setting.** A Scope is appended, drawn against, and spent.
   There is no edit path. Wanting more means seeing the scope again — the same pattern by which a
   decision carries a scope the author was **shown** before the append.
2. **The stop condition exists only where the threshold does.** A stop condition is a *location
   judgment* (OBJ-21's axis). The threshold is observed from accept/reject behaviour and may
   legitimately be `⊥` (OBJ-22, `DEFERRED` behind AE-5). Where it is `⊥`, a Scope carries **no**
   StopCondition, and that omission is **derived, not chosen**. This resolves a real contradiction in
   the source material, which stated an unconditional stop rule while elsewhere forbidding any
   unobserved threshold. The resolution is: the rule is conditional on the threshold existing.
3. **The ratio is displayed and never blocks.** A unit that drew once may have been lucky. The system
   cannot distinguish "one draw was enough" from "one draw was a formality", because the difference is
   the operator's reason and no model has access to it. Refusing correct work is a worse failure than
   reporting a suspicious pattern. This is the same restraint that forbids inferring a classification
   and forbids inventing a threshold — one restraint, three sites.

**The weakness this facet does not paper over.** An operator can satisfy every rule in this module —
append a scope of ceiling 1, draw exactly one cheap candidate, commit it unexamined, become reachable
in the expensive currency, and spend there — and thereby defeat the entire design **while conforming
perfectly**, at a total cost higher than doing nothing. The refusal fires **zero times** on that path.
Nothing can refuse it without also refusing the genuinely lucky unit. **OBJ-26 surfaced at OBJ-40 is
the only thing standing between the design and that outcome**, and it is a display, not a guard. This
is specified as the module's stated limit, carried to §8 as an open item, and is not softened.

**Self-reliance point, carried.** The `Projection` family is proven by RC-3's **membership list**, not
by a property. OBJ-26 is a member because RC-3 names its producing module. F5 does not re-derive the
family from "anything stateless"; doing so readmits OBJ-34 and defeats owner ruling DG-F1.

---

## 2. Module specification — MOD-11 `spend/`

### 2.1 Purpose

Hold the bounded permission to spend, refuse a draw that would exceed it, derive the per-unit draw
vector, and construct the authorization object that carries that vector at the moment an expensive
spend is authorized.

### 2.2 Responsibility boundary

**MOD-11 is responsible for:**

- Appending OBJ-14 Scope, and only appending it (no update, no delete, no edit path).
- Deciding whether OBJ-33 StopCondition **exists** on a Scope, by observing the threshold — never by
  taking the requester's word for it.
- Refusing a Scope authorized with a stop condition while the threshold is `⊥` → `Refuse(no-bar)`.
- Folding the governing Scope and its remaining ceiling as of a record height.
- OBJ-30 ScopeGate: admitting or refusing a draw against that remaining → `Refuse(scope-exceeded)`.
- OBJ-26 Ratio: the per-unit draw count **vector**, indexed by currency, computed per read.
- OBJ-40 AuthorizationForm: constructing an authorization **with** its ratio, or not constructing it.
- Registering HOOK-05 (`H-SCOPE`) and HOOK-09 (`H-RATIO`).

**MOD-11 is explicitly NOT responsible for:**

- **Computing, supplying, defaulting, configuring or coalescing the threshold.** MOD-09 `calibration/`
  owns OBJ-22. MOD-11 reads *whether it exists* and nothing more. A `θ ?? default` anywhere in this
  module is the defect the whole concept exists to prevent.
- **The reachability refusal.** MOD-04 `reachability/` owns OBJ-24/OBJ-29. `Refuse(unreachable)` and
  `Refuse(scope-exceeded)` are two refusals from two gates; MOD-11 never re-checks reachability, and a
  second reachability check anywhere is a defect.
- **The currency order.** MOD-03 `catalog/` owns OBJ-05. MOD-11 receives the order as the index set of
  the ratio vector and never branches on cardinality — no `if cheap … else expensive`.
- **Estimating cost.** Cost estimation is external, reached only via MOD-02 `ports/`. MOD-11 records
  the estimate carried on the Scope; it does not produce or validate it.
- **The human's decision.** OBJ-40 is a payload requirement, not a decision procedure. HOOK-09 blocks
  the **form**, never the spend, and the human's decision is unconstrained whichever way it goes.
- **Blocking on the ratio.** Under no condition does OBJ-26 close a gate, enter a gate condition, or
  appear as an argument type of a gate.
- **Rendering.** A view may render OBJ-40 or not; the guarantee is in construction, not in display.
- **Deciding dispatch-vs-return spend semantics.** That answer exists in the external dispatch
  contract and is **cited** at the MOD-02 seam, never restated here (see §8, DG-F3).
- **Invalidation scope.** OBJ-28 `InvalidationScope` (MOD-12 `lineage/`) is a different object that
  shares the word. MOD-11 owns permission-to-spend; MOD-12 owns consequence-of-undoing. They are not
  related and must not be merged on the strength of a name.
- **Persisting anything derived.** OBJ-26 and the remaining-ceiling fold are recomputed per read.

### 2.3 Public interface (plain-language signatures; no executable code)

| # | Signature | Returns | Traces |
|---|---|---|---|
| I-1 | `authorize_scope(unit, currency, ceiling, stop_condition_request, estimated_cost, record_height)` | an appended Scope, or `Refuse(no-bar)` | OBJ-14, OBJ-33 |
| I-2 | `governing_scope(unit, currency, record_height)` | the Scope in force, or `NoSubject` | OBJ-14 |
| I-3 | `remaining(unit, currency, record_height)` | a count (ceiling minus draws charged against it) | OBJ-14, OBJ-30 |
| I-4 | `admit_draw(unit, currency, record_height)` | `Admit`, or `Refuse(scope-exceeded)` | OBJ-30 |
| I-5 | `has_stop_condition(scope)` | whether the conditionally-existing member is present | OBJ-33 |
| I-6 | `ratio(unit, record_height)` | a draw-count **vector** indexed by the currency set | OBJ-26 |
| I-7 | `build_authorization(unit, currency, record_height)` | an AuthorizationForm carrying its ratio, or no object at all | OBJ-40 |

Notes binding the signatures:

- I-1 takes a stop-condition **request**, not a stop condition. Presence of the member on the
  constructed Scope is derived from the threshold, never copied from the request.
- I-3 and I-6 take a `record_height` (OBJ-10) because they are folds — RC-3 `AsOfFold`. A height-keyed
  cache is permitted; memoization across a record extension is not.
- I-6 returns a vector in **every** representation. There is no signature in this module that returns
  a single number derived from the vector, and adding one is the defect.
- I-7 has no partial-construction path. An authorization above the least currency without the vector
  is not an object with a missing field; it is not an object.

### 2.4 Internal state

**None that survives a call.** MOD-11 holds no mutable state. Scopes live in the append-only record,
reached only through MOD-02 `ports/` (OBJ-35 RecordPort). The remaining ceiling and the ratio are
folds over that record as of a height, recomputed per read, never persisted, never accumulated
incrementally. The only module-local values are the currency index set received from MOD-03 and the
hook registrations.

### 2.5 Dependencies

| Kind | Module | What is needed | Why this kind |
|---|---|---|---|
| **Hard** | MOD-01 `kernel/` | OBJ-01 AppendedFact (Scope's base), OBJ-02 Projection (Ratio's base), OBJ-03 Gate (ScopeGate's base), OBJ-04 Unknown (`Refuse`, `NoSubject`), OBJ-10 RecordHeight | Every owned object inherits from, or is typed by, a kernel base |
| **Hard** | MOD-02 `ports/` | OBJ-35 RecordPort (append + read), OBJ-37 DispatchPort (spend semantics, cited), external cost estimation, OBJ-36 RendererPort (form display, outbound) | A.2 EXTERNAL rule — no external is named outside `ports/` |
| **Hard** | MOD-03 `catalog/` | OBJ-05 Currency (the total order, as the ratio's index set), OBJ-06 Unit | The ratio is undefined without its index set; the "above the least currency" trigger of HOOK-09 is a position in that order |
| **Hard** | MOD-09 `calibration/` | **whether** OBJ-22 Bar has a value or is `⊥` (with cause) | The StopCondition's existence is *derived* from this; without the read, the omission would be chosen, which AE-05 forbids |
| **Hard** | MOD-05 `facts/` | OBJ-11 Candidate as of a height, keyed by unit and currency | The ratio is a count over appended candidates; the remaining-ceiling fold counts draws charged against a scope |
| **Soft** | — (consumers) | Views and MOD-10 `diagnostic/` may read OBJ-40 and OBJ-26 | Read-only, downstream; MOD-11 does not depend on being read |

**Non-dependency, stated to prevent a merge:** MOD-11 has **no** dependency on MOD-04
`reachability/`. The two gates are independent conditions on the same act. Wiring them would
reintroduce a second reachability check.

### 2.6 Owned objects

**OBJ-14 Scope — class (AppendedFact), load-bearing `INV-SCOPE`.**
A Scope is a bounded permission for a named unit in a named currency, **appended before any draw** it
governs. It carries a maximum count (the ceiling), an estimated cost, and — conditionally — a stop
condition (OBJ-33). The runner draws inside it and cannot exceed it. A Scope is **spent, never
edited**: it inherits OBJ-01's prohibited forms (`✗ delete(k)`, `✗ update(ℂ)`) and MOD-11 exposes no
signature that mutates one, so REF-17's forbidden input has no path to reach. Wanting more permission
means authorizing a **second** Scope, which is an append and is accepted — and which means the author
sees the scope again before it takes effect, reusing the existing pattern in which a decision carries
a scope the author was shown. The estimated cost is recorded, not computed here; a systematically
wrong external estimate makes every ceiling wrong (§7).

**OBJ-26 Ratio — class (Projection), load-bearing `H-RATIO`.**
The per-unit draw count **indexed by currency** — a vector, in every representation, at every layer,
in storage-that-does-not-exist and in display alike. Never a quotient, never summed, never averaged,
never reduced to a scalar for sorting or for a badge. A unit that drew 1 cheap candidate and 4
expensive ones must not be able to hide inside `0.25`; `⟨1,4⟩` and `⟨4,16⟩` are different facts about
different failures. Rendering it as a single number is **malformed**, not merely discouraged
(REF-18). It is a projection under RC-3: computed per read, taking a record height, never memoized
across an extension of the record, never persisted. Its index set is MOD-03's currency order, so the
vector's arity is data, not structure.

**OBJ-30 ScopeGate — class (Gate), load-bearing `INV-SCOPE`, `H-SCOPE`, `H-RATIO`.**
The gate evaluated before a draw. Condition: an unexpired governing Scope exists with remaining > 0.
`ON_FAIL`: reject the draw and emit `Refuse(scope-exceeded)` — no candidate is produced and no cost is
incurred. Like every member of the OBJ-03 family it carries `condition`, `closed_by`, `proposals_in`,
`records` and a mandatory `ON_FAIL`. It is **one code path quantified over the currency order**, not a
per-currency branch. It composes a Projection (the remaining-ceiling fold) rather than being one —
a Gate carries `ON_FAIL` and a Projection does not (RFD-02). No diagnostic and no advisory may appear
in its condition; `ASSERT_ABSENT δ` holds over it as it does over every gate.

**OBJ-33 StopCondition — contextual class, admitted exception AE-05.**
A stop condition is a **location judgment** and is therefore expressible only where the threshold
exists (OBJ-22 ≠ `⊥`). It is a **conditionally-existing member** of OBJ-14, **not a nullable field**:
where the threshold is `⊥`, the member does not exist, and the absence is *derived* from the
observation rather than chosen by an author or defaulted by the code. Authorizing a Scope with a stop
condition while the threshold is `⊥` is refused, not silently dropped and not filled in
(`Refuse(no-bar)`, REF-15). It lives inside MOD-11 with OBJ-14 because seam P-4 is expensive: across a
module boundary a conditionally-existing member degenerates into a nullable field, which is exactly
the shape AE-05 exists to avoid, and a caller could then coalesce it.

**OBJ-40 AuthorizationForm — composite class, load-bearing `H-RATIO`, owned by MOD-11 (ODG-FG-02).**
A **domain object**, not a view. C0 resolved this: placing it in a view would put the only enforcement
of the concept's central economic claim outside the invariant-bearing core, where no invariant reaches
— S1's PC-7 defect exactly. An AuthorizationForm for a currency **above the least** is constructed
with its OBJ-26 ratio **or it is not constructed at all**; there is no partially-built form and no
post-hoc attachment. A view may render it or not without touching the guarantee. This does not
contradict owner ruling DG-F4 — the ratio is still surfaced at the moment an expensive spend is
authorized, not in a report read afterward; what C0 fixed is that the authorization is a thing the
core builds, not a screen the core hopes about. The form **constrains no decision**: it determines
what the human is shown, never what the human may choose.

---

## 3. Seam contracts

### 3.1 MOD-11 as SOURCE

| Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule |
|---|---|---|---|---|
| MOD-11 `spend/` | MOD-05 `facts/` | the governing Scope and its remaining ceiling | a draw appends a Candidate only under an admitting ScopeGate | ceiling not exceeded; Scope never edited; no append path to MOD-05 bypasses this seam |
| MOD-11 `spend/` | MOD-02 `ports/` | the Scope to append (OBJ-35 RecordPort) | append-only primitive | no update, no delete; the append is the only write |
| MOD-11 `spend/` | MOD-02 `ports/` | the constructed AuthorizationForm, for display (OBJ-36 RendererPort) | the form already carries its ratio at construction | display-bound and **never blocking**; a renderer that drops the vector changes nothing about the object's validity — the guarantee is upstream of the port |
| MOD-11 `spend/` | MOD-10 `diagnostic/` (read-only) | the ratio vector, on request | proposal-shaped, consumer-optional | the vector is never a precondition of any act, and never arrives as a quotient |

### 3.2 Incoming seams MOD-11 depends on

| Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule |
|---|---|---|---|---|
| MOD-09 `calibration/` | MOD-11 `spend/` | **whether the threshold exists** — θ, or `⊥` with a cause | the value originates from the Bar projection; nothing else may be its source | θ = `⊥` ⇒ a stop condition is **refused**, not defaulted, not coalesced, not estimated. `⊥` is a value and is never `??`-ed. A stop condition present while θ = `⊥` → `Refuse(no-bar)` |
| MOD-02 `ports/` | MOD-11 `spend/` | **dispatch semantics: a scope is spent by dispatch, not by return** | the external dispatch contract (OBJ-37 DispatchPort) is the sole authority | **cited at this seam, never restated in MOD-11.** MOD-11 carries no local rule about whether a failed draw burns a scope; the citation's absence is the open item, not a licence to invent (§8) |
| MOD-03 `catalog/` | MOD-11 `spend/` | the currency set and its total order | it indexes the ratio vector and locates "above the least currency" | never summed, never divided, never branched on by cardinality; "the least" is read from the order, never hard-coded |
| MOD-05 `facts/` | MOD-11 `spend/` | appended Candidates as of a record height | the ratio and the remaining-ceiling are folds over these | computed per read at a stated height; never memoized across an extension; never persisted |
| MOD-01 `kernel/` | MOD-11 `spend/` | OBJ-01/02/03 bases, OBJ-04 `Unknown` family, OBJ-10 RecordHeight | family membership is by proven contract, not resemblance | `Refuse` and `NoSubject` are distinct members of a **closed** family and are never collapsed into `null` or a boolean |
| MOD-02 `ports/` | MOD-11 `spend/` | the external cost estimate carried onto a Scope | estimation is external | MOD-11 records it and does not compute or second-guess it; its accuracy is a production concern (§7), not an invariant |

---

## 4. Refusal tests

Carried from S2 §6 (CT-6, CT-7, CT-8, CT-17, CT-19), operationalized. **Nothing generated.**

| ID | MOD | Invariant / carried rule | Forbidden input | Expected rejection | Test name |
|---|---|---|---|---|---|
| REF-15 | MOD-11 | CT-6 — a stop condition is a location judgment and exists only where the threshold does (AE-05) | a Scope authorized **with** a stop condition while the threshold is `⊥` | `Refuse(no-bar)` — refused, not defaulted, not dropped | `test_stop_condition_refused_when_threshold_is_bottom` |
| REF-16 | MOD-11 | CT-7 / `INV-SCOPE` — the ceiling bounds the draw | drawing the **(N+1)th** candidate under a Scope of ceiling N | `Refuse(scope-exceeded)` — no candidate, no cost | `test_draw_beyond_scope_ceiling_refused` |
| REF-17 | MOD-11 | CT-8 / OBJ-01 prohibited forms — a Scope is spent, never edited | any edit to an appended Scope | **no such path exists** — the absence is verified structurally (no mutating signature, no `update`/`delete` reachable), not by catching a runtime error | `test_no_edit_path_exists_on_appended_scope` |
| REF-18 | MOD-11 | CT-17 / ER-6 — the ratio is a vector in every representation | the ratio rendered, returned, stored or logged as a quotient (or summed, or averaged) | **malformed** — rejected at definition, not at runtime | `test_ratio_rendered_as_quotient_is_malformed` |
| REF-19 | MOD-11 | CT-19 / `H-RATIO` (owner ruling DG-F4) | an AuthorizationForm for a currency **above the least** that omits the per-unit draw vector | **refused** — the form is rejected; the spend is untouched | `test_authorization_form_without_draw_vector_refused` |

**Positive cases — each refusal test states what is admitted, so the guard cannot pass by refusing everything.**

| ID | Positive case | Expected |
|---|---|---|
| REF-15 | the threshold exists and a stop condition is supplied | the stop condition is **accepted** and the member exists on the Scope |
| REF-16 | drawing the Nth or any earlier candidate under a ceiling of N | **admitted** |
| REF-17 | appending a **second** Scope | **accepted** — this is the only path to more permission |
| REF-18 | the count vector surfaced at the authorization, arity = the currency set | **accepted** |
| REF-19 | a form carrying the vector | **accepted**, and the human's decision is **unconstrained either way** — approving and declining are both admitted after the form is built |

---

## 5. Golden vectors

**NONE. `N/A-by-absence` — declared explicitly, not a silent pass.**

**Reason.** All seven golden vectors (GV-1…GV-7) carried from S2 §6 are `DEFERRED` with named discharge
conditions, and C0 §6 assigns them F2 (2), F3 (1), F4 (4). **F5 is assigned zero, and this is correct
rather than an oversight:** every carried vector pins a *computed value* — a reachability truth table,
`bar(d)` across population states, a dispersion statistic, the Δ tuple, a digest, population
membership, exclusion counts. MOD-11 computes no such value. Its two derived quantities are a
**remaining count** (a subtraction over appended facts, whose correctness is asserted by REF-16, not by
a pinned number) and the **ratio vector** (a count of appended candidates per currency, whose
correctness is asserted by REF-18's shape rule, not by a pinned number). Pinning either would pin a
fixture's arithmetic, not a module's behaviour.

**Consequence, stated so no reader infers a gap:** MOD-11's completion criterion is its five refusal
tests plus its two hooks — **not** a vector computation. F5 introduces no `VEC-nn` id. If a later
phase mints one against MOD-11, that is a new obligation and must be justified there, not read back
into this facet.

---

## 6. Hook specifications

**Two hooks, both registered at MOD-11. Nine hooks exist in total across the system; a tenth
appearing anywhere in Phase 3 is a defect, not an improvement.**

| ID | Name | Trigger | Condition (must hold) | BLOCK action | Registered at | Blocks |
|---|---|---|---|---|---|---|
| HOOK-05 | `H-SCOPE` | `@before-draw` | an unexpired scope exists with remaining > 0 | reject the draw; emit `Refuse(scope-exceeded)` | MOD-11 | the **draw** |
| HOOK-09 | `H-RATIO` | `@before-scope-authorization-above-least-currency` | the per-unit draw vector is present in the authorization payload | reject the **AUTHORIZATION FORM** — never the spend | MOD-11 | the **form** |

```
HOOK-05 @before-draw {
    condition: an unexpired scope exists with remaining > 0,
    BLOCK:     reject the draw; emit Refuse(scope-exceeded)
}

HOOK-09 @before-scope-authorization-above-least-currency {
    condition: the per-unit draw vector is present in the authorization payload,
    BLOCK:     reject the AUTHORIZATION FORM — never the spend
}
```

**Reading note on HOOK-09, load-bearing.** The BLOCK target is the *form*, and this distinction is the
whole ruling. HOOK-09 must never be implemented as a precondition on committing, dispatching, or
approving. It fires when the payload is assembled and its only effect is that an authorization missing
its vector cannot come into existence. Once the form exists, **the human's decision is unconstrained**:
the hook has no opinion about approve versus decline, and a system that refuses an approval because
the vector looked bad has inverted DG-F4 and implemented the refusal the concept explicitly declines
to make. See §1, judgment 3, and §8.

**Reading note on HOOK-05.** "Unexpired" is taken verbatim from the carried hook text. The predicate
that determines expiry is **not proven in the S2** (a Scope is proven to carry a ceiling, an optional
stop condition, and an estimated cost — no expiry field is proven). Carried to §8 rather than invented
here.

---

## 7. Production concerns surfaced by MOD-11

Developer-owned, carried verbatim from the S2's set of seven. **No new PC ids are minted here.**

- **Cost estimation accuracy** (carried `PC-6`) — the ceiling on a Scope is a count, but the *estimated
  cost* recorded alongside it comes from outside, through `ports/`. A systematically wrong estimate
  makes **every** ceiling wrong: an author authorizing "at most 8 draws" is authorizing a budget they
  believe they understand. MOD-11 cannot detect the error — it records what it is given, and no
  invariant in this module can help. This is the sharpest production concern the facet surfaces,
  because the module's whole guarantee is denominated in a number it does not own.
- **Storage growth as a function of success** (carried `PC-1`) — the concept's point is drawing many
  cheap candidates and never deleting them, and MOD-11 is the module that authorizes exactly that.
  Every Scope is itself an appended fact that is never removed, so scope *authorizations* accumulate
  alongside the candidates they permitted. The better the system works, the faster both grow.
  Retention interacts with the one-at-a-time purge ruling and is a deployment decision, not a
  behaviour this module may take on.

Two further carried concerns touch this module's surface without being owned by it, noted so a later
reader does not mistake the omission for an oversight: **`PC-2`** (authorization and identity for the
author role) is adjacent to OBJ-40 — MOD-11 constructs the form, and *who* is authorized to act on it
is outside the module; **`PC-5`** (observability of refusals) applies to the `Refuse(scope-exceeded)`
and `Refuse(no-bar)` this module emits — each is attributable by construction, and aggregation is a
deployment concern.

---

## 8. Open items

**Carried open, resolved by citation.**

- **DG-F3 — is a Scope spent by dispatch or by return?** The answer **exists** in the external
  dispatch contract — *a scope is spent by dispatch, not by return* — and is therefore **cited at the
  MOD-02 `ports/` → MOD-11 seam (§3.2), never restated by MOD-11**. F5 specifies the seam so the
  citation has a home, and specifies nothing about the semantics itself. Non-blocking. Without the
  citation recorded, an implementer will invent whether a failed draw burns a scope, and both answers
  are defensible — which is precisely why the answer must be cited rather than chosen.
- **Expiry predicate for HOOK-05.** The carried hook condition says "an *unexpired* scope". S2 proves a
  Scope's ceiling, its optional stop condition, and its estimated cost; it does not prove an expiry
  field or an expiry rule. Surfaced, not invented. Resolution trigger: the same dispatch contract cited
  for DG-F3, or an explicit owner ruling.

**Structurally unresolvable — the concept's stated limit.**

- **The conforming defeat.** An operator authorizes a Scope of ceiling 1, draws one cheap candidate,
  commits it unexamined, becomes reachable in the expensive currency, and spends there. Every rule in
  MOD-11 is satisfied. HOOK-05 admits. HOOK-09 admits, because the vector `⟨1, …⟩` **is** present. The
  refusal fires **zero times**, and the outcome costs more than doing nothing. **No refusal can close
  this without also refusing the genuinely lucky unit**, because the distinguishing fact is the
  operator's reason and no model has access to it. OBJ-26 at OBJ-40 is the entire mitigation: the
  vector is in front of a human at the moment money is committed. This is carried forward as a stated
  limit of the design, not as a defect to be fixed by a later phase, and **any later proposal to make
  the ratio blocking must be read as reversing owner ruling DG-F4, not as tightening it.**

**Contradictions against recorded artifacts — surfaced, not resolved.**

- **Module-id collision between S1 and Phase 3.** S1's `MOD-11` is `DiagnosticComposer` and its
  `MOD-12` is `ScopeAuthority` / `MOD-16` is `RatioProjection`; Phase 3's `MOD-11` is `spend/`, which
  is S1's MOD-12 + MOD-16, while Phase 3's `MOD-10` is `diagnostic/`. S2 §2 accordingly traces OBJ-14
  to "MOD-12" and OBJ-26 to "MOD-16" in **S1 numbering**, while C0 §3 places both in **Phase 3
  MOD-11**. The two numbering schemes are not in conflict about content, but a reader following an S2
  trace string as if it were a Phase 3 module id will land in `lineage/`. Surfaced for C0/synthesis to
  record a numbering note; F5 does not renumber anything.
- **Carried counts stated inconsistently in S1 prose.** S1 §"Verification obligations" reads "Refusal
  tests — **eighteen** guards, eighteen refusals" and "Hooks — **eight**, for the eight load-bearing
  invariants", while S2 §6 and C0 §6 carry **nineteen** refusal tests (CT-19 arrived with owner ruling
  DG-F4) and **nine** hooks (`H-RATIO` likewise). The S1 hook block itself enumerates nine. F5 binds to
  the S2/C0 counts, which are the anchored ones, and records the discrepancy rather than editing
  either document. Both of the additional items are F5's (`REF-19`, `HOOK-09`), so the discrepancy
  lands entirely inside this facet and is surfaced here.

**Closed, noted so it is not re-opened.**

- **ODG-FG-02 / latent assumption A4b-3** — whether OBJ-40 is a domain object or a view. **Resolved by
  C0 §3: domain object in MOD-11, `HOOK-09` registers at MOD-11.** This facet's entire §2.6 OBJ-40
  paragraph and REF-19 depend on that ruling. If it is ever revisited, this facet's guarantee moves
  with it — and moving it to a view reinstates S1's PC-7 defect by construction.
