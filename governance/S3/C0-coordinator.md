# C0 · Coordinator / Anchor — The Frame Gate

**S2 anchored:** `P2_FrameGate/CLAUDE_FrameGate_Phase2.md` (emission-check clean) with
`Final_Package_S2.md` as the record. **Fixed for this run — never edited, only specified.**
**Concept isolation:** P3_Runner and P3_Board documents are present in the workspace and are
**ignored**. No partition, seam, carried rule or CLAUDE.md content is imported from either.

---

## 1. The A1 halt, re-applied

Never assume S2 arrives clean.

| Check | Result |
|---|---|
| Well-formed against the emission contract | **PASS** — `emission-check.py` exit 0; seven headings in order, three tables with contract columns |
| Every node carries a non-empty `trace_back` | **PASS** — 42/42, each citing a proven S1 element by identifier |
| Every dependency directed | **PASS** — every is-a edge is declared under a named base in §3; every refused edge in §4 is preserved as a **directed** composition (source *has-a* target) |
| No unproven nodes | **PASS** — 41 `ACTIVE`, 1 `DEFERRED` (OBJ-22 Bar) |
| ID discipline | **PASS** — OBJ-01…OBJ-42 contiguous, no duplicates, no reuse |

**On OBJ-22's `DEFERRED` status.** This is the one node that could look like an unproven element,
and it is not. It is a **proven-open gate behind a fixed interface**: the node, its codomain
(including ⊥), its populations and its exclusion counts are all proven; what is open is AE-5's
separation *rule*, which S2 declares `NO_DEFAULT` and holds behind the Bar interface. The A1
distinction applies exactly — a proven-open body is not an unproven element. **Facet work is
assigned over it**, with the open interior preserved as `OPEN` behind that interface.

**No blocking AE. No halt. C0 proceeds.**

## 2. Seam pricing

S2 carries no named SeamSet table (Phase 2's contract does not emit one), so the **contract graph**
is priced — S1's 28 seams re-anchored onto S2's OBJ identifiers, plus the four composition edges S2
minted at RFD-01…RFD-04.

**Pricing rule.** A seam is *expensive to cross* when splitting it would put a load-bearing
invariant's enforcement on the far side of a module boundary, or would separate two objects one
contract governs jointly. Expensive seams are **interior** to a module. Cheap seams — a value
passed, a fold read, a display payload — are **module boundaries**, because a boundary is where a
contract can be written down.

### Expensive — must be interior

| Seam | Objects | Why splitting it costs |
|---|---|---|
| P-1 | OBJ-15 ↔ OBJ-08 ↔ OBJ-09 | `INV-ABSENT` is a **syntactic** guard (`ASSERT_ABSENT`, checked over definition text). A syntactic guard cannot be enforced across a module boundary — the far side sees a type, not a definition. Split it and CT-4's refusal test becomes untestable |
| P-2 | OBJ-22 ↔ OBJ-23 | One S1 contract (RC-5 `PopulationPartition`) governs both, and X21's partition move is the reason ST-F1 existed. Two modules would let the move and the bar disagree |
| P-3 | OBJ-18 ↔ OBJ-28 | RC-4 `ScopeBeforeAct` is an **ordering** guarantee — derive, display, then append. Ordering across a boundary is a protocol, not a guarantee |
| P-4 | OBJ-14 ↔ OBJ-33 | AE-05: StopCondition is a **conditionally-existing member** of Scope. Across a boundary it degenerates into a nullable field, which is the shape AE-05 exists to avoid |
| P-5 | OBJ-25 ↔ OBJ-41 ↔ OBJ-42 | AE-06's partial result is one value. Splitting `withheld[]` from the axes it qualifies is how PC-7's defect gets in |
| P-6 | OBJ-24 ↔ OBJ-29 | S2 §6 obligation 2, verbatim: these two carry the concept and must not merge into the ledger. They are cheap to *each other* and expensive to separate from each other |

### Cheap — good boundaries

| Seam | Objects | Contract that crosses |
|---|---|---|
| Q-1 | OBJ-12 → OBJ-24 | the effective Commitment, or ⊥ |
| Q-2 | OBJ-19 → OBJ-20 | a set and its cardinality |
| Q-3 | OBJ-22 → OBJ-25 | θ, or ⊥ with a cause |
| Q-4 | OBJ-26 → OBJ-40 | a count vector, display-bound |
| Q-5 | OBJ-07 → OBJ-19 | a condition identity |
| Q-6 | OBJ-16 → OBJ-23 | the declaration recorded at draw time |
| Q-7 | ports → everything | the A.2 EXTERNAL rule already makes this a boundary |

## 3. The resolved partition (ODG-A)

**Thirteen modules.** Every OBJ maps to exactly one.

| MOD | Module | Owns |
|---|---|---|
| MOD-01 | `kernel/` | OBJ-01, OBJ-02, OBJ-03, OBJ-04, OBJ-10 |
| MOD-02 | `ports/` | OBJ-35, OBJ-36, OBJ-37, OBJ-38, OBJ-39 |
| MOD-03 | `catalog/` | OBJ-05, OBJ-06, OBJ-13 |
| MOD-04 | `reachability/` | OBJ-24, OBJ-29 |
| MOD-05 | `facts/` | OBJ-11, OBJ-12, OBJ-16, OBJ-31 |
| MOD-06 | `condition/` | OBJ-07, OBJ-17, OBJ-19, OBJ-27 |
| MOD-07 | `observation/` | OBJ-08, OBJ-09, OBJ-15 |
| MOD-08 | `statistics/` | OBJ-20, OBJ-21 |
| MOD-09 | `calibration/` | OBJ-22, OBJ-23 |
| MOD-10 | `diagnostic/` | OBJ-25, OBJ-41, OBJ-42 |
| MOD-11 | `spend/` | OBJ-14, OBJ-26, OBJ-30, OBJ-33, OBJ-40 |
| MOD-12 | `lineage/` | OBJ-18, OBJ-28, OBJ-32 |
| MOD-13 | `advisory/` | OBJ-34 |

**Coverage: 5+5+3+2+4+4+3+2+2+3+5+3+1 = 42.** Contiguous OBJ-01…OBJ-42, no duplicates, no orphans.

### ODG-FG-01 — RESOLVED, and checkable

S2's obligation: *no single module may own all ten Projections* (ST-3's residue — the One True Table
one layer down). The ten are distributed across **seven** modules:

| MOD-04 | MOD-06 | MOD-08 | MOD-09 | MOD-10 | MOD-11 | MOD-12 |
|---|---|---|---|---|---|---|
| OBJ-24 | OBJ-19, OBJ-27 | OBJ-20, OBJ-21 | OBJ-22, OBJ-23 | OBJ-25 | OBJ-26 | OBJ-28 |

**Maximum Projections owned by one module: 2 of 10.** The `kind`-switch collapse is not merely
discouraged — it is unwritable, because no module can see enough of the family to switch on it.
Stated as a mechanical check in §11 of the emitted S3.

### ODG-FG-02 — RESOLVED: OBJ-40 is a domain object in MOD-11

**Decision: `AuthorizationForm` is a domain object owned by `spend/`, not a view.** `HOOK-09`
(`H-RATIO`) registers at `MOD-11`.

*Justification.* S2 logged this as latent assumption A4b-3: the owner's DG-F4 ruling says the ratio
is *surfaced at* the authorization but does not say whether the guarded thing is domain or view.
Placing it in the view would put the only enforcement of the concept's central economic claim
**outside the invariant-bearing core** — which is precisely S1's PC-7 defect ("a faithful core
defeated at the presentation layer, where no invariant reaches"). Placing it in `spend/` means an
authorization is *constructed* with its ratio or is not constructed at all, and a view can render it
or not without touching the guarantee.

This resolves **without contradicting the ruling**: the ratio is still surfaced at the authorization;
what C0 fixes is that the authorization is a thing the core builds, not a screen the core hopes
about.

## 4. The facet roster — derived, not imported

Five facets, emitted from §2's pricing. Each expensive seam is interior to exactly one facet; each
facet boundary is a cheap seam with a writable contract.

| Facet | Owns MOD | Carried judgment |
|---|---|---|
| **F1 · Kernel & Ports** | MOD-01, MOD-02, MOD-03 | The three abstract bases and the closed `Unknown` family; the EXTERNAL rule's single home; configuration-vs-fact (why Currency is not an AppendedFact) |
| **F2 · The Gate** | MOD-04, MOD-05, MOD-12 | The refusal itself; one gate for all currencies (CS-1); lineage binding and the signature that covers it; scope-before-act ordering |
| **F3 · Evidence** | MOD-06, MOD-07, MOD-08 | Sample identity and its partition by revision; the ABSENT non-collapse as a syntactic guard; the dispersion floor and what it returns below it |
| **F4 · Judgment** | MOD-09, MOD-10, MOD-13 | θ's ⊥ and its two populations; axis independence and the withheld axis; difficulty as advisory with no consumer |
| **F5 · Spend** | MOD-11 | Bounded permission; the stop condition that exists only where θ does; the ratio at the authorization, never blocking |

**F1 is not a "shared utilities" facet.** It owns three judgments that can resolve more than one way
— whether `Unknown` is closed, whether a base carries behaviour or only a contract, and whether
configuration is a fact — which is the roster's granularity test.

**No facet owns a Projection family it could switch on.** F3 and F4 each hold four and three
Projections respectively across *separate modules*, and ODG-FG-01's check is per-module, not
per-facet — stated here so a later reader does not relax it to the facet level.

## 5. Object-to-destination map (no orphans)

| S2 node class | Phase 3 destination | Role |
|---|---|---|
| OBJ-03 Gate family | **K6 Conformance Gate** + owning facets | The gate family becomes the conformance evaluator; its four instances are specified by F2 and F5 |
| OBJ-25 Diagnostic (the assembly/output node) | **S5 Synthesis Gate** + F4 | Consolidation and contradiction surfacing; it is the node where multiple facet outputs first meet |
| The contract graph (§2) | **C0 + T service** | The shared contract; the partition resolved above |
| All 42 concrete nodes | The facet C0 assigned them to (§3, §4) | Facet spec body |
| 19 refusal tests, 7 vectors, 9 hooks, 8 invariant tags, 7 production concerns | Owning facet, verified at K6, manifested in the S3 | CT-4 / CT-5 / CT-6 |
| AE-3, AE-4, AE-5, DG-F3, DG-F5, ODG-FG-02 | ODG-FG-02 resolved here; the rest carried to the S3 §9 | Resolved on trigger, else open |

## 6. Carried payload — bindings, not generation

Carried **unchanged** from S2 §6 to the owning facets. Phase 3 operationalizes the bindings; it
generates nothing.

| Payload | Count | Owner facet |
|---|---|---|
| Refusal tests CT-1…CT-19 → `REF-01…REF-19` | 19 | F1 (2), F2 (5), F3 (3), F4 (4), F5 (5) |
| Golden vectors GV-1…GV-7 → `VEC-01…VEC-07` | 7, **all DEFERRED** | F2 (2), F3 (1), F4 (4); **F1 and F5 pin no value — N/A-by-absence, not a silent pass** |
| Hooks H-REACH … H-RATIO → `HOOK-01…HOOK-09` | **9 — a tenth is a defect** | F1 (1), F2 (2), F3 (2), F4 (2), F5 (2) |
| Load-bearing invariants INV-* | 8 | tags travel with OBJ ids |
| Production concerns PC-1…PC-7 | 7 | enumerated in the S3, developer-owned |

**The self-reliance point, restated for every facet.** S2's `Projection` family is proven by RC-3's
**membership list**, not by a property. No facet may re-derive it from "anything stateless" — doing
so readmits OBJ-34 and defeats owner ruling DG-F1. F4 owns OBJ-34 and carries this explicitly.

## 7. Human gate

Standing approval is in force. **ODG-A is resolved with justification** (§3), **ODG-FG-01 is
resolved and made mechanically checkable** (§3), and **ODG-FG-02 is resolved with a stated rationale
that does not contradict the owner's ruling** (§3). Nothing here requires the owner's call.

Facet work is assigned. Five facets run in parallel; each writes its slice to
`facets/<facet-id>.md`. Synthesis is a closing gate.
