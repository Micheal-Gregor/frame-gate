# F2 · The Gate — Phase 3 facet slice

**Facet:** F2 · The Gate
**Owns:** MOD-04 `reachability/` · MOD-05 `facts/` · MOD-12 `lineage/`
**S2 anchor:** `P2_FrameGate/CLAUDE_FrameGate_Phase2.md` (fixed input, never edited)
**Partition anchor:** `P3_FrameGate/C0-coordinator.md` §3 (thirteen modules)

**MOD-nn namespace warning.** All `MOD-nn` identifiers in this document are **C0 §3 Phase-3 module
ids**. S1 and S2 §2 use a different, colliding `MOD-nn` numbering over S1's eighteen modules — e.g.
S1 `MOD-05 ReachabilityGate` is Phase-3 `MOD-04 reachability/`, and S1 `MOD-04 CommitmentLedger` is
part of Phase-3 `MOD-05 facts/`. Every S1 seam cited below is stated in Phase-3 ids with the S1 row
named. See §8.

---

## 1. Facet scope and carried judgment

F2 owns **the refusal**. The concept of The Frame Gate is not the ledger, not the record, and not the
diagnostic: it is the single condition

```
reachable(u, c)  <=>  for all c' < c in the currency order : effective_commitment(u, c') != BOTTOM
```

and the fact that failing it produces `Refuse(unreachable)` — not a warning, not a lower-priority
admission path, not a default. Exploration is affordable where it is cheap; the expensive currency is
**unreachable** until the cheap one has committed. F2 specifies that refusal and the two supporting
guarantees that keep it honest: the lineage binding that makes a commitment's identity un-forgeable
(MOD-12), and the fact substrate the gate reads and guards (MOD-05).

**Carried judgment, in force over every specification below.**

1. **One gate, all currencies.** An earlier reduction collapsed two per-currency gates into one
   condition quantified over the currency order. The quantifier ranges over the empty set at the least
   currency and is therefore **vacuously true** there — that is why the least currency needs no special
   case. A **second reachability check anywhere in the codebase is a defect**, being the removed
   duplicate growing back (S1 SC-5, "the gate is one code path"; S1 *Do not write a second reachability
   check*). A per-currency admission branch is forbidden. The number of currencies is data, never
   structure (S1 SC-3).
2. **MOD-04 does not merge into MOD-05.** S2 §6 partition obligation 2, verbatim: OBJ-29 and OBJ-24
   stay in separate modules from OBJ-12. OBJ-24 is a one-line fold and OBJ-29 is a single condition;
   the temptation to fold both into the commitment ledger as a method is **the concept being lost**.
   S2 §3 records that the god-class block was applied here and refused the collapse. This is an
   explicit upstream obligation, not a style preference. C0 seam P-6 prices OBJ-24 ↔ OBJ-29 as
   expensive-to-separate-from-each-other and cheap to everything else; C0 seam Q-1 prices
   OBJ-12 → OBJ-24 as a boundary, which is exactly where the contract gets written down.
3. **No bypass.** No append path to the candidate store may reach the record without passing MOD-04
   (S1 seam `MOD-05 → MOD-03`: *no append path to MOD-03 bypasses this seam*). Enforced structurally
   by HOOK-01.
4. **The proposal is not a precondition.** OBJ-31 CommitGate is `closed_by: HUMAN_ACT` with
   `proposals_in: [Diagnostic, Observation]`. A diagnostic **proposes and never closes**. No act
   signature may accept a diagnostic as an argument (S1 ER-4). This is load-bearing: the smallest
   executable run produces a diagnostic with **both axes absent** and the human commits anyway. Were
   the diagnostic a precondition, that run would be unexecutable and the system would need an invented
   threshold — which S1 forbids absolutely. Symmetrically, a commitment must **not** require an
   observation; requiring one inverts authority from the human to the evidence.
5. **Scope before act.** Re-committing derives the consequence set **before** the append and displays
   its count; the human approves a scope they were shown (S1 RC-4). Append-then-derive is refused.
6. **Externals only through ports.** Record append and the digest function are reached only through
   MOD-02 `ports/` (OBJ-35 RecordPort, OBJ-39 DigestPort). No module in F2 names an external
   (S1 ER-5).
7. **Nothing derived is persisted.** `effective(u,c)`, `reachable(u,c)` and the invalidation scope are
   folds recomputed per call over the record as of a height (S1 RC-3, SC-2). A height-keyed cache is
   permitted; memoization across a record extension is not.

**What F2 does not own and must not implement:** the currency order itself (MOD-03 `catalog/`), the
population partition and the `Accepted → PassedOver` move (MOD-09 `calibration/`), the diagnostic and
its withheld axes (MOD-10 `diagnostic/`), scope ceilings and the authorization form (MOD-11 `spend/`),
sample assembly (MOD-06 `condition/`), observations and ABSENT (MOD-07 `observation/`).

---

## 2. Module specifications

### MOD-04 `reachability/` — OBJ-24 Reachability, OBJ-29 ReachabilityGate

**Purpose.** Hold the concept's central refusal as one condition over one currency order, and block
the candidate append when it fails. Two objects, no more: a projection that answers the question and a
gate that acts on the answer.

**Responsibility boundary.**
*It is responsible for:* evaluating `reachable(u, c)` as a fold over the record as of a height;
returning `ADMIT` or `Refuse(unreachable)`; registering HOOK-01 at `@before-candidate-append`; being
the **sole** site in the codebase at which reachability is decided.
*It is explicitly NOT responsible for:* defining or ordering currencies (MOD-03 owns OBJ-05 and the
total order, including the least element); storing or folding commitments (MOD-05 owns OBJ-12);
appending candidates (MOD-05 owns OBJ-11); signature verification (MOD-12 owns OBJ-32); scope ceilings
(MOD-11); cost estimation or charging; **any per-currency branch**; any second or "fast path"
reachability evaluation; caching its own result across a record extension.

**Public interface (plain language).**
- *Reachability of a unit in a currency, as of a record height* — given a unit, a currency and a record
  height, returns a reachability verdict. Total: it always answers, and the answer at the least
  currency is `reachable` by vacuous quantification.
- *Predecessor witness set* — given the same inputs, returns, for each strictly cheaper currency, the
  effective commitment or `BOTTOM`. This is the evidence behind the verdict and the attributable
  content of a refusal (S1 PC-5). It is derived from the same single evaluation, not a second one.
- *Gate evaluation on a proposed candidate append* — given a proposed candidate, returns `ADMIT`, or
  `Refuse(unreachable)` naming the unit, the currency, and the cheapest currency whose effective
  commitment was `BOTTOM`. `ON_FAIL` is mandatory and is `Refuse(unreachable)`; there is no other
  failure outcome and no success-with-warning outcome.

**Internal state.** None. Both members are stateless. OBJ-24 is a Projection (OBJ-02) and therefore
takes a record height and reads the record through MOD-05's fold; OBJ-29 is a Gate (OBJ-03) carrying
only `condition`, `closed_by`, `proposals_in`, `records`, `ON_FAIL`. A height-keyed cache is the only
permitted memoization (S1 PC-4).

**Dependencies.**
- **Hard — MOD-03 `catalog/`**: the total currency order and its least element (S1 seam
  `MOD-01 → MOD-05`, *order total and finite; least element exists*). Read-only after load; the order
  is configuration, not a fact (S2 RFD-04).
- **Hard — MOD-05 `facts/`**: `effective_commitment(u, c')` or `BOTTOM` (C0 seam Q-1; S1 seam
  `MOD-04 → MOD-05`, *⊥ is a value; never coalesced*).
- **Hard — MOD-01 `kernel/`**: OBJ-02 Projection and OBJ-03 Gate bases; OBJ-04 `Unknown`'s `Refuse`
  member; OBJ-10 RecordHeight.
- **Soft — none.**

**OBJ-24 Reachability (class, Projection).** A fold, not a store. Given `(unit, currency, height)` it
enumerates the strictly cheaper currencies from MOD-03's total order and asks MOD-05 for the effective
commitment of the unit in each; it is `reachable` exactly when none of those answers is `BOTTOM`. Its
value is never persisted (S1 SC-2) and never memoized across a record extension (S1 RC-3). It carries
no threshold, no count, and no notion of "how much cheaper" — only the order relation. Membership in
the Projection family is by RC-3's **membership list**, not by any property such as statelessness;
re-deriving the family from a property readmits OBJ-34 and defeats owner ruling DG-F1, so OBJ-24 must
not be described as "a Projection because it is pure". At the least currency the predecessor set is
empty and the fold returns `reachable`; this is the identity of the fold, not a special case, and
writing it as one is the forbidden per-currency branch. Traces: S2 OBJ-24, X2, `INV-REACH`.

**OBJ-29 ReachabilityGate (class, Gate).** One condition — `reachable(u, c) = true` — quantified over
the currency order, with `ON_FAIL: Refuse(unreachable)`. It is the only admission decision for a
candidate append on the reachability axis, and it composes OBJ-24 rather than inheriting from it
(S2 RFD-02: a Gate carries `ON_FAIL` and a Projection does not). Its refusal is terminal for that
draw: **no candidate is created and no cost is incurred** — the refusal precedes the append and
precedes the spend, so there is nothing to roll back. It is deliberately tiny; S2 §3 records that
collapsing it into a method on the commitment ledger was proposed and refused, because a
proven-structured element does not become a lone method. It registers HOOK-01. Traces: S2 OBJ-29, X2,
X3, `INV-REACH`, `H-REACH`, CS-1.

---

### MOD-05 `facts/` — OBJ-11 Candidate, OBJ-12 Commitment, OBJ-16 DrawContext, OBJ-31 CommitGate

**Purpose.** Own the append-only fact substrate the gate guards: the candidates drawn, the commitments
that make further draws reachable, the context under which each draw happened, and the human act that
closes a commitment.

**Responsibility boundary.**
*It is responsible for:* appending candidates (only through MOD-02's record primitive, only after
MOD-04 admits and MOD-12 verifies); appending commitments as human acts; folding the effective
commitment per call; appending a draw context per draw and asserting a declaration was in force;
carrying the `from` lineage edge on each candidate.
*It is explicitly NOT responsible for:* deciding reachability (MOD-04 — and evaluating the condition
here would be the forbidden second check); computing or storing an effective commitment as a stored
column; verifying signatures (MOD-12 owns OBJ-32); deriving invalidation scope (MOD-12); moving
candidates between populations (MOD-09); producing or consuming a diagnostic as a precondition
(MOD-10 proposes, MOD-05 never requires); the resolution label `DRAW`/`REVISION` at draw time (it is
attached later); scope ceilings (MOD-11); naming any external (MOD-02).

**Public interface (plain language).**
- *Append a candidate* — given a proposed candidate (unit, currency, condition identity, seed, `from`)
  and a verified signature, appends it and returns its identity. Refuses unless MOD-04 admitted and
  MOD-12's signature check passed. There is exactly one such entry point; no alternate, bulk,
  administrative, backfill or test path exists (S1 seam `MOD-05 → MOD-03`).
- *Append a commitment* — given a unit, a currency and a human act, appends a commitment. Its argument
  list contains **no diagnostic and no observation**.
- *Effective commitment for a unit in a currency, as of a height* — returns the effective commitment or
  `BOTTOM`. Recomputed per call as a fold over the append-only record.
- *Append a draw context* — given draw-time features, the declaration in force at that record height,
  the governing scope and the condition, appends a draw context. Refuses with `Refuse(no-declaration)`
  when no declaration was in force at that height.
- *Attach a resolution label to a draw context* — sets `DRAW` or `REVISION` after the fact, as a
  further append. It is not supplied at draw time and is not a precondition of the draw.
- *Candidates by unit, currency and condition identity* — the read MOD-06 uses to assemble a sample.
  Membership is by condition identity, never by a time window (S1 seam `MOD-03 → MOD-07`).
- *Candidates whose `from` names a given commitment* — the read MOD-12 uses to derive invalidation
  scope.

**Internal state.** No derived state. The candidate, commitment and draw-context records are
append-only sequences reached through OBJ-35 RecordPort; the prohibited forms are `delete(k)` and
`update(record)` (S2 §3). `effective(u,c)` is **never stored**. A height-keyed cache of the fold is
permitted (S1 PC-4); any cache keyed on anything but record height is a second home for a fact and is
forbidden.

**Dependencies.**
- **Hard — MOD-04 `reachability/`**: admission or `Refuse(unreachable)` before every candidate append.
- **Hard — MOD-12 `lineage/`**: a verified signature with every candidate append (S1 seam
  `MOD-14 → MOD-03`, *no candidate appended unsigned*); the derived invalidation scope and its count,
  for display before a re-commitment append.
- **Hard — MOD-02 `ports/`**: OBJ-35 RecordPort (append), OBJ-38 AuthorEnum (the human act's author),
  OBJ-39 DigestPort (the commitment digest a derived candidate binds).
- **Hard — MOD-03 `catalog/`**: the declaration in force at a record height (S1 seam
  `MOD-02 → MOD-15`, *`draw` asserts `declaration_at(u,h) ≠ ⊥`*); the currency identifiers.
- **Hard — MOD-11 `spend/`**: the governing scope and remaining ceiling recorded on the draw context
  (S1 seam `MOD-12 → MOD-03`, *ceiling not exceeded; scope never edited*).
- **Soft — MOD-10 `diagnostic/`**: a **proposal only**. No code path makes the diagnostic a
  precondition (S1 seam `MOD-11 → MOD-04`). The dependency is soft in the strict sense that MOD-05
  must remain fully executable with the diagnostic absent.
- **Hard — MOD-01 `kernel/`**: OBJ-01 AppendedFact, OBJ-03 Gate, OBJ-04 `Unknown`, OBJ-10 RecordHeight.

**OBJ-11 Candidate (class, AppendedFact).** A drawn candidate carries: the **unit** it was drawn for,
the **currency** it was drawn in, the **condition identity** in force, the **seed**, and **`from`** —
the Commitment in the currency immediately below that it derives from. `from = BOTTOM` is legal
**only** for the least currency of an independent unit; at any higher currency a `BOTTOM` `from` is
malformed, because reachability at that currency means a cheaper commitment exists. `from` is the edge
MOD-12 walks to derive an invalidation scope and the material OBJ-32 requires a signature to cover.
A candidate is appended only through the single guarded path; it is never updated and never deleted
(S2 §3 prohibited forms). Traces: S2 OBJ-11, X1, X4, `INV-SIG`, `INV-SCOPE`.

**OBJ-12 Commitment (class, AppendedFact).** A commitment is a human act appended to the record, tagged
`authored: HUMAN` (S2 RFD-05 — the tag, not a `HumanAct` abstraction, because no S1 contract serves
exactly Commitment/Declaration/Scope). `effective(u, c)` is a **fold over the append-only record,
recomputed per call, never stored** (S1 RC-3, SC-2). Zero commitments for a `(unit, currency)` is
legitimate and folds to `BOTTOM`; `BOTTOM` is a value in the closed `Unknown` family, never `null`,
never coalesced, and never defaulted (S1 ER-1, ER-2). **Two effective commitments for one
`(unit, currency)` is malformed** — the fold must yield at most one, and a record state producing two
is a defect in the fold or in the record, not a case to be resolved by preference. Superseding a
commitment is a further append, mediated by MOD-12's scope-before-act ordering, never an edit. Traces:
S2 OBJ-12, X2, X5, `INV-REACH`.

**OBJ-16 DrawContext (class, AppendedFact).** Records, at the moment of a draw: the draw-time
**features**, the **declaration in force at that record height**, the **governing scope**, and the
**condition**. A **draw with no declaration in force is refused** with `Refuse(no-declaration)`
(S1 seam `MOD-02 → MOD-15`). The recorded declaration — never a current one — is what MOD-09 reads
when partitioning populations (C0 seam Q-6; S1 *Do not read a current declaration when computing
populations*), so a re-declaration cannot silently rewrite history. A **resolution label** of `DRAW` or
`REVISION` is attached **later**, as a subsequent append; it is not known at draw time and is not a
precondition. Traces: S2 OBJ-16, X19.

**OBJ-31 CommitGate (class, Gate).** `condition:` a human act is present for `(unit, currency)`;
`closed_by: HUMAN_ACT`; `proposals_in: [Diagnostic, Observation]`; `ON_FAIL:` refuse the commitment.
The two proposal inputs **propose and never close**: no act signature may accept a diagnostic as an
argument (S1 ER-4), and a commitment must not require an observation, because requiring one moves
authority from the human to the evidence (S1 *Do not require an observation to commit* — while the
exclusion is still counted, on both populations, by MOD-09). The load-bearing consequence: the smallest
possible run produces a diagnostic whose **both axes are absent**, and the human commits anyway. If the
diagnostic were a precondition, that run would be unexecutable and the system would need an invented
threshold, which S1 forbids without exception. `ASSERT_ABSENT δ` holds over this gate's condition as
over every gate condition (owner ruling DG-F1, normative). Traces: S2 OBJ-31, X2, MWE step 7.

---

### MOD-12 `lineage/` — OBJ-18 Invalidation, OBJ-28 InvalidationScope, OBJ-32 SignatureGate

**Purpose.** Bind a candidate to the commitment it derives from, so that the binding is (a) covered by
the signature and therefore un-forgeable, and (b) walkable, so the consequences of un-approving a
commitment are derivable and shown before they are enacted.

**Responsibility boundary.**
*It is responsible for:* requiring that a candidate's signature covers the digest of the Commitment it
derives from, and rejecting at parse when it does not; appending invalidations; deriving the set of
candidates whose `from` names a superseded commitment **and its transitive closure over `from`**;
displaying the count of that set before the append; supplying the invalidated set to MOD-09.
*It is explicitly NOT responsible for:* choosing or implementing the digest function (MOD-02 owns
OBJ-39 DigestPort — pinned externally, never chosen here, S1 ER-5); appending candidates or
commitments (MOD-05); performing the `Accepted → PassedOver` population move (MOD-09 owns OBJ-23 and
that move — MOD-12 supplies the set only); reachability (MOD-04); any second reachability check while
walking `from` edges; deciding whether a scope is spent by dispatch or by return (open, owned
elsewhere — see §8).

**Public interface (plain language).**
- *Verify a candidate signature against its lineage* — given a proposed candidate and its signature,
  confirms the signature covers the digest of the Commitment named by `from`. Coverage is a
  **parse-time structural property of the signature's material**, not a runtime truth value; a
  signature whose material omits the lineage digest is `Refuse(malformed-signature)`.
- *Derive the invalidation scope of a commitment* — given a commitment identity and a record height,
  returns the set of candidates whose `from` names that commitment, closed transitively over `from`,
  together with its **count**. A pure projection; nothing is appended.
- *Display the derived scope* — surfaces the set and its count to the human, before any append.
- *Append an invalidation* — given a commitment identity and a human approval **of the scope that was
  displayed**, appends an invalidation. Refuses if the derivation and display did not precede it.
- *The invalidated commitment set, as of a height* — the read MOD-09 consumes.

**Internal state.** None derived and stored. OBJ-28 is a Projection recomputed per call over the
record; OBJ-18 is an AppendedFact reached through OBJ-35 RecordPort. No signature, digest or closure is
cached other than by record height.

**Dependencies.**
- **Hard — MOD-05 `facts/`**: candidates and their `from` edges; commitment identities; the digest of
  the commitment a derived candidate binds (S1 seam `MOD-04 → MOD-14`, *omitting it is malformed at
  parse*).
- **Hard — MOD-02 `ports/`**: OBJ-39 DigestPort (the digest function, pinned externally); OBJ-35
  RecordPort (the invalidation append).
- **Hard — MOD-01 `kernel/`**: OBJ-02 Projection, OBJ-03 Gate, OBJ-04 `Unknown`, OBJ-10 RecordHeight.
- **Soft — MOD-09 `calibration/`**: consumes the invalidated set. MOD-12 does not read back from it.

**OBJ-18 Invalidation (class, AppendedFact).** Un-approving a commitment is an append, never an edit or
a delete. It names the superseded commitment and is authored by a human, and it is appended **only
after** OBJ-28's scope has been derived and its count displayed (S1 RC-4). Its downstream effect —
each affected candidate moving from `Accepted` to `PassedOver` — is *not performed here*: MOD-12
supplies the invalidated set and MOD-09 performs the move over OBJ-23, which is why the partition is
non-monotone while the union stays monotone (S2 AE-02, X21). Traces: S2 OBJ-18, X5, X21, ST-F1.

**OBJ-28 InvalidationScope (class, Projection).** The consequence set of superseding a commitment: the
candidates whose `from` names it, **and the transitive closure of that relation over `from`**. Chain
propagation *is* the closure — it is not a separate rule, a second pass, or a configurable depth, and
writing it as one splits a single guarantee into two that can disagree. It is derived **before** the
append and its **count is displayed**, so the human approves a scope they were shown; append-then-derive
ordering is refused (REF-07). C0 seam P-3 prices OBJ-18 ↔ OBJ-28 as expensive and therefore interior to
MOD-12, because RC-4 is an **ordering** guarantee and ordering across a module boundary degrades into a
protocol rather than a guarantee. Traces: S2 OBJ-28, X5, RC-4, CS-3.

**OBJ-32 SignatureGate (class, Gate).** `condition:` the candidate's signature covers the **digest of
the Commitment it derives from**; `ON_FAIL: Refuse(malformed-signature)`. The failure is **malformed at
parse, not false at runtime** — the signature's material is structurally required to include the
lineage digest, so a signature omitting it is not a signature that fails to verify but a signature that
cannot be formed. Rationale, from S1 verbatim in substance: a signature that does not cover its lineage
authorises material nobody signed for — re-approving a *different* commitment would leave an old
signature still validating against material the signer never saw. The digest function itself is pinned
externally through OBJ-39 and is never chosen in this module (S1 ER-5). It registers HOOK-04, at the
same trigger as HOOK-01; the two are independent conditions on one append and neither subsumes the
other. Traces: S2 OBJ-32, X6, `INV-SIG`, `H-SIG`.

---

## 3. Seam contracts — F2 modules as SOURCE

| # | Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule |
|---|---|---|---|---|---|
| S-01 | MOD-04 `reachability/` | MOD-05 `facts/` | Admission verdict, or `Refuse(unreachable)` with the cheapest `BOTTOM` predecessor named | MOD-05 must reach the candidate append only through this seam | **No append path to the candidate store bypasses MOD-04.** Exactly one evaluation site; a second reachability check anywhere is a defect. On refusal: no candidate created, no cost incurred (S1 seam `MOD-05 → MOD-03`) |
| S-02 | MOD-05 `facts/` | MOD-04 `reachability/` | `effective_commitment(u, c')`, or `BOTTOM` | MOD-04 reads OBJ-12's fold; MOD-04 never folds the record itself | `BOTTOM` is a value in the closed `Unknown` family — never coalesced, never defaulted, never `null`. Recomputed per call, never a stored column (C0 Q-1; S1 seam `MOD-04 → MOD-05`) |
| S-03 | MOD-05 `facts/` | MOD-12 `lineage/` | The superseded commitment identity on a re-commitment | MOD-12 must derive the scope before MOD-05 appends | Derive → display → append. Append-then-derive is refused (S1 RC-4, seam `MOD-04 → MOD-13`) |
| S-04 | MOD-05 `facts/` | MOD-12 `lineage/` | The digest of the Commitment a derived candidate binds, obtained via OBJ-39 through MOD-02 | The digest function is pinned externally and named only in MOD-02 | Omitting the lineage digest from the signature's material is **malformed at parse**, not false at runtime (S1 seam `MOD-04 → MOD-14`) |
| S-05 | MOD-12 `lineage/` | MOD-05 `facts/` | A verified signature accompanying every candidate append | MOD-05 has no unsigned append path | **No candidate is appended unsigned**, and no signature is accepted that fails to cover the lineage digest (S1 seam `MOD-14 → MOD-03`; HOOK-04) |
| S-06 | MOD-12 `lineage/` | MOD-05 `facts/` | The derived invalidation scope and its **count**, for display | Display precedes the invalidation append | The human approves the scope they were shown; the displayed count and the appended scope are the same derivation at the same height (S1 seam `MOD-13 → MOD-04`) |
| S-07 | MOD-12 `lineage/` | MOD-09 `calibration/` | The set of invalidated commitments, as of a height | MOD-09 owns OBJ-23 and performs the partition move | MOD-12 **supplies the set and never performs the move**. Each invalidated commitment's candidate moves `Accepted → PassedOver`; the union stays monotone, the partition does not; no incremental accumulator (S1 seam `MOD-13 → MOD-10`; S2 AE-02) |
| S-08 | MOD-05 `facts/` | MOD-09 `calibration/` | The declaration recorded on OBJ-16 at draw time | MOD-09 must not read a current declaration | Membership is computed against the declaration **recorded at draw time**, read as-of a record height; a re-declaration must not rewrite history (C0 Q-6; S1 seam `MOD-15 → MOD-10`) |
| S-09 | MOD-05 `facts/` | MOD-06 `condition/` | Candidates by unit, currency and condition identity | MOD-06 assembles the sample from this read | Membership by **condition identity**, never a time window (S1 seam `MOD-03 → MOD-07`) |

**Inbound seams F2 must not re-implement** (listed so the boundary is unambiguous): MOD-03 → MOD-04
(the total currency order and its least element); MOD-03 → MOD-05 (the declaration in force at a
height); MOD-11 → MOD-05 (the governing scope and remaining ceiling); MOD-10 → MOD-05 (the diagnostic,
**a proposal only**); MOD-02 → MOD-05 and MOD-02 → MOD-12 (record append, author enum, digest).

---

## 4. Refusal tests

Carried from S2 §6 (CT-1…CT-19, verbatim), minted here as `REF-nn` per C0 §6. **Operationalized, not
generated.** F2 owns five, matching C0's allocation of five refusal tests to this facet.

| ID | MOD | Invariant | Forbidden input | Expected rejection | Test name |
|---|---|---|---|---|---|
| **REF-03** (CT-1) | MOD-04 | `INV-REACH` | A draw in an expensive currency for a unit with **no commitment** in any cheaper currency | `Refuse(unreachable)` — **no candidate created and no cost incurred**. Not a warning, not a deferred path, not a default | `draw_in_expensive_currency_without_cheaper_commitment_is_refused_unreachable` |
| **REF-04** (CT-9) | MOD-12 | `INV-SIG` | A candidate signature whose material **omits the digest of the Commitment named by `from`** | `Refuse(malformed-signature)` — **malformed at parse**, not a runtime verification failure | `signature_omitting_lineage_digest_is_malformed_at_parse` |
| **REF-05** (CT-12) | MOD-05 | declaration-before-draw | A draw for a unit with **no declaration in force at that record height** | `Refuse(no-declaration)`; no draw context appended, no candidate appended | `draw_without_declaration_in_force_at_record_height_is_refused` |
| **REF-06** (CT-15) | MOD-05 | proposals-only (`OBJ-31`) | An **act signature that accepts a Diagnostic as an argument** | **No such signature may exist.** The defect is structural — a commit signature that can accept a diagnostic fails the test regardless of runtime behaviour (S1 ER-4) | `no_act_signature_accepts_a_diagnostic` |
| **REF-07** (CT-16) | MOD-12 | `RC-4` scope-before-act | A re-commitment that **appends the invalidation before deriving** the consequence scope | Refused. The ordering derive → display → append is the guarantee; an append reached without a prior derivation at the same height is rejected | `append_before_deriving_invalidation_scope_is_refused` |

**Positive counterparts** (each refusal test carries the admitting case, so the guard is shown to be a
guard and not a blanket denial):

| ID | Positive case | Expected |
|---|---|---|
| REF-03 | Commit in the cheaper currency first, then issue the **same** draw | Admitted; a candidate is appended |
| REF-04 | A signature whose material **covers** the lineage digest | Verifies; the candidate is appended |
| REF-05 | Declare first, then draw | Admitted; the draw context records that declaration |
| REF-06 | Commit succeeds when the diagnostic carries **both axes absent** — the smallest possible run | The commitment is appended on the human act alone |
| REF-07 | Derive the scope, display the count, then append | The invalidation is appended against the scope the human was shown |

---

## 5. Golden vectors

Carried from S2 §6 (GV-1…GV-7, **all `DEFERRED`, each with a discharge condition**), minted here as
`VEC-nn` per C0 §6. F2 pins two — matching C0's allocation of two vectors to this facet. **None may be
transcribed or hand-written; each is computed from the real implementation and independently
re-derived** (S1 verification obligations).

**CT-5 requirement:** the rule is stated **independently of the vector**, so the vector is a check on
the rule rather than the rule's only statement.

| ID | MOD | Pinned value | Rule (stated independently of the vector) | Input | Output | Encoding | State | Discharge condition |
|---|---|---|---|---|---|---|---|---|
| **VEC-01** (GV-1) | MOD-04 | The reachability truth table over a **three-currency** set, for commitment states `{}`, `{c1}`, `{c1,c2}` | `reachable(u, c)` holds **exactly when, for every currency `c'` strictly below `c` in the loaded total order, `effective_commitment(u, c')` is not `BOTTOM`**. At the least currency the quantifier ranges over the empty predecessor set and is **vacuously true**. The rule is one condition quantified over the order and contains no reference to the number of currencies | A fixture record over the loaded currency order `c1 < c2 < c3` and one unit, in each of the three commitment states; each state queried at each of the three currencies (9 rows) | Per row, one of `ADMIT` or `Refuse(unreachable)`; each refusal additionally names the cheapest predecessor whose effective commitment was `BOTTOM` | Rows as `⟨unit, currency, committed_set, height⟩ -> verdict_token`. Currencies are named by **identifier drawn from the loaded order**, never by ordinal position and never by a hard-coded arity — the encoding must remain valid verbatim if the fixture order is extended to four currencies (S1 SC-3, "the number two appears nowhere"). Verdict tokens are compared literally; `Refuse(unreachable)` is never compared as a falsy value | **DEFERRED** | Compute from MOD-04 against the fixture record and **independently re-derive** before MOD-04 is counted complete. MOD-04 is not complete until then |
| **VEC-05** (GV-5) | MOD-12 | A candidate signature computed **with** the lineage digest and **without** it, and the demonstration that the two differ | The signature is a function of the candidate's material **including the digest of the Commitment named by `from`**, and it is sensitive to that argument: changing or omitting the lineage digest changes the signature. Consequently an old signature cannot validate against a re-approved, different commitment. Independently: **omission is malformed at parse**, so the "without" case exists only as a constructed artefact for this vector and is not a form the system can emit (REF-04) | One candidate's material, held fixed; the digest of its `from` Commitment obtained through OBJ-39 DigestPort; two signature computations, one over material including that digest, one over material excluding it | Two signature values, and the assertion that they are **unequal** | Both values recorded verbatim as produced, together with the **identifier of the pinned external digest function** (OBJ-39) that produced them, since the digest is pinned externally and never chosen in MOD-12 — a vector without that identifier is unreproducible. The inequality is asserted directly, never via a distance or similarity measure | **DEFERRED** | Compute from MOD-12 (both values, from the real implementation) and **independently re-derive** before MOD-12 is counted complete. If the pinned digest function changes, the vector is recomputed, not adjusted |

**F2 pins exactly two vectors.** VEC-02, VEC-03, VEC-04, VEC-06, VEC-07 belong to F3 and F4 (C0 §6);
MOD-05 pins none, which is **N/A-by-absence and not a silent pass** — no obligation was dropped.

---

## 6. Hook specifications

Carried from S2 §6 verbatim. **Nine hooks exist across the system; a tenth appearing anywhere in
Phase 3 is a defect, not an improvement.** F2 registers two, matching C0's allocation.

| ID | S1 name | Trigger | Registered at | Condition | BLOCK action | Invariant |
|---|---|---|---|---|---|---|
| **HOOK-01** | `H-REACH` | `@before-candidate-append` | **MOD-04** `reachability/` | The reachability check returns `ADMIT` | Reject the append and emit `Refuse(unreachable)` | `INV-REACH` |
| **HOOK-04** | `H-SIG` | `@before-candidate-append` | **MOD-12** `lineage/` | The signature covers the lineage digest | Reject the append and emit `Refuse(malformed-signature)` | `INV-SIG` |

In the carried grammar:

```
HOOK HOOK-01 (H-REACH) @before-candidate-append {
    condition: reachability check returns ADMIT,
    BLOCK: reject the append and emit Refuse(unreachable)
}

HOOK HOOK-04 (H-SIG) @before-candidate-append {
    condition: signature covers the lineage digest,
    BLOCK: reject the append and emit Refuse(malformed-signature)
}
```

**Notes on registration.**
- Both hooks fire at the **same trigger** on the **same append**. They are two independent conditions;
  neither subsumes the other, and neither may be folded into the other's evaluation. Their block
  actions emit **distinct** members of the closed `Unknown` family — `Refuse(unreachable)` and
  `Refuse(malformed-signature)` are different facts and must not be collapsed into a single
  "rejected" outcome (S1 *Do not collapse the five unknown outcomes*).
- HOOK-01 is registered at **MOD-04**, not at MOD-05. Registering it at the append site inside `facts/`
  would put the enforcement of `INV-REACH` inside the module the gate exists to guard, and is the
  first step of the merge S2 §6 obligation 2 forbids.
- HOOK-01 is the structural expression of "no append path bypasses MOD-04": the hook is on the append
  trigger itself, so a new append path inherits the guard rather than needing to remember it.

---

## 7. Production concerns surfaced by F2's modules

Developer-owned gates, not omissions. **No PC ids are minted here** — the S3 enumerates PC-1…PC-7
(C0 §6); the S1 origin of each concern is named for traceability.

1. **Concurrency on the commit path** *(S1 PC-3)* — MOD-05. Two simultaneous commitments on one
   `(unit, currency)`. `effective(u,c)` is a fold that must yield **at most one** effective commitment;
   two is malformed (§2, OBJ-12). Two concurrent appends can therefore produce a record state the fold
   cannot interpret. The interaction with MOD-04 is the sharp edge: reachability is evaluated as of a
   height, and a commitment appended between the evaluation and the candidate append changes the
   verdict — in the permissive direction, but a corresponding invalidation changes it in the
   restrictive direction. Surfaced, not resolved: any resolution that introduces a *stored* effective
   commitment to serialize on would violate S1 SC-2, and any resolution that adds a second reachability
   check at the append point violates SC-5.
2. **Observability of refusals** *(S1 PC-5)* — MOD-04, MOD-12. Every refusal is **attributable by
   construction**: `Refuse(unreachable)` names the unit, the currency and the cheapest predecessor that
   was `BOTTOM`; `Refuse(malformed-signature)` names the candidate and the commitment whose digest was
   not covered. Aggregation, retention and alerting over these are deployment concerns. The concern to
   watch is the inverse of PC-7: a refusal that is counted but not attributed restores exactly the
   silence the concept forbids, one layer below the UI.
3. **Storage growth as a function of success** *(S1 PC-1)* — MOD-05. The concept's whole point is
   drawing many cheap candidates and never deleting them; the candidate record grows fastest precisely
   when the system is working. Retention interacts with the one-at-a-time purge ruling, and no purge
   may be expressible as `delete` or `update` on the record (S2 §3 prohibited forms).
4. **Fold performance** *(S1 PC-4)* — MOD-05, MOD-04, MOD-12. `effective(u,c)`, `reachable(u,c)` and
   the `from`-closure are all recomputed per call over an append-only record that only grows. A
   **height-keyed cache is permitted; memoization across a record extension is not.** The transitive
   closure in OBJ-28 is the worst case, since it walks lineage chains whose depth grows with the
   currency order's length.
5. **Authorization and identity for the author role** *(S1 PC-2)* — MOD-05. OBJ-31 closes by
   `HUMAN_ACT` and OBJ-12 is tagged `authored: HUMAN`. Establishing *which* human, and that the author
   enum's `ENGINE` and `DIRECTOR` may only propose, is reached through MOD-02's OBJ-38 and is deployment
   work; the invariant that a commitment is a human act is not.

---

## 8. Open items and contradictions surfaced

**Surfaced, never resolved.** Each item names where it is owned.

| # | Item | Status |
|---|---|---|
| O-1 | **`MOD-nn` namespace collision.** S1 and S2 §2 use S1's eighteen-module numbering; C0 §3 mints a *different* thirteen-module numbering over the same identifiers. S2 §2 records OBJ-24 and OBJ-29 as tracing to "MOD-05" and OBJ-12 to "MOD-04", which under C0's partition read as the exact inverse of the truth. This document states every module id in C0's namespace and names the S1 seam row alongside. **Not resolvable by F2** — it is a cross-document convention. Recommend the S3 carry an explicit S1↔S3 module id crosswalk | OPEN, owned at synthesis |
| O-2 | **Hook count wording in S1.** S1's verification obligations read *"Hooks — eight, for the eight load-bearing invariants"* and then enumerate **nine** (`H-REACH` … `H-RATIO`). S2 §6 and C0 §6 both fix the count at **nine, a tenth being a defect**. F2 follows nine. The S1 prose header is inconsistent with its own enumeration | OPEN (documentation), non-blocking |
| O-3 | **Refusal-test count.** S1 reads *"Refusal tests — eighteen guards, eighteen refusals"* and S2 §6 carries **nineteen** (CT-1…CT-19, CT-19 having arrived with owner ruling DG-F4). Consistent if CT-19 is the addition; stated here so the discrepancy is not read as a dropped test | OPEN (documentation), non-blocking |
| O-4 | **DG-F3 — is a scope spent by dispatch or by return?** S1 seam `MOD-17 → MOD-12` states *a scope is spent by dispatch, not by return*, to be **cited, never restated**; S2 §7 carries DG-F3 as unresolved with the resolution trigger at "Phase 3 §4 seam row". MOD-05 records the governing scope on OBJ-16 at draw time and is therefore affected by the answer — a refused draw either does or does not burn scope. **F2 does not decide this.** It is owned by MOD-11 `spend/` (F5) and MOD-02 `ports/` (F1) | OPEN, owned elsewhere — explicitly not decided here |
| O-5 | **Module-level dependency cycle MOD-04 ↔ MOD-05.** MOD-04 reads OBJ-12's fold (S-02) and MOD-05's append path is guarded by MOD-04 (S-01). At the **object** level there is no cycle — OBJ-24 reads OBJ-12; OBJ-29 blocks OBJ-11 — so the direction is clean per object. At the **module** level it is a mutual dependency. Flagged because the obvious "fix" is to merge MOD-04 into MOD-05, which **S2 §6 obligation 2 forbids**. Any resolution must preserve the split (e.g. by MOD-04 depending on a fold interface rather than on the append path) | OPEN, resolution constrained by an upstream obligation |
| O-6 | **Module-level dependency cycle MOD-05 ↔ MOD-12.** MOD-05 supplies the superseded commitment identity and the lineage digest (S-03, S-04); MOD-12 supplies the verified signature and the derived scope back (S-05, S-06). Same shape as O-5, and not a merge candidate: C0 seam P-3 prices OBJ-18 ↔ OBJ-28 as interior to MOD-12 precisely because RC-4's ordering guarantee degrades across a boundary | OPEN |
| O-7 | **OBJ-11 → OBJ-26 Ratio is not a recorded seam row.** S1's traceability line states MOD-16 (Phase-3 MOD-11 `spend/`) is *derived from Candidate + Currency*, but S1's interfaces-and-seams list records only `MOD-01 → MOD-16` (the currency set) and `MOD-16 → MOD-12`. A per-unit draw vector must read candidates from MOD-05, yet no such seam row exists. **Surfaced, not invented** — F2 does not add the seam. Owned by F5 (MOD-11) and synthesis | OPEN, potential gap in the recorded contract graph |
| O-8 | **`from = BOTTOM` and "independent unit".** OBJ-11 permits `from = BOTTOM` only for the **least currency of an independent unit**. The predicate "independent unit" is not defined by any object F2 owns, and no S2 node names it; the nearest owner is MOD-03 `catalog/` (OBJ-06 Unit, OBJ-13 Declaration). Stated as a constraint, not implemented here, because implementing it would require inventing the predicate | OPEN, owned by F1 (MOD-03) |
| O-9 | **AE-3 / AE-4 / AE-5 are carried, not blocking on F2.** None of the three touch MOD-04, MOD-05 or MOD-12: AE-3 sits behind OBJ-19 (F3), AE-4 and AE-5 behind OBJ-22 (F4). F2's modules are fully specifiable with all three open. Recorded so that no reader treats OBJ-22's `DEFERRED` status as blocking the gate | Carried, non-blocking for F2 |

**No contradiction with a recorded seam was found in F2's own scope.** Every seam in §3 restates an S1
row in C0's module namespace; O-7 is a seam that appears in S1's traceability line but **not** in S1's
seam list, and is reported rather than reconciled.

**Self-reliance point, restated.** The `Projection` family that OBJ-24 and OBJ-28 belong to is proven
by RC-3's **membership list**, not by any property. Nothing in this document derives their membership
from statelessness, purity, or being "a computed value" — doing so would readmit OBJ-34 and defeat
owner ruling DG-F1.
