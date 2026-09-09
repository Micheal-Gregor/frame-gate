# F1 · Kernel & Ports — The Frame Gate, Phase 3 facet slice

**Owns:** MOD-01 `kernel/`, MOD-02 `ports/`, MOD-03 `catalog/`
**Objects:** OBJ-01, OBJ-02, OBJ-03, OBJ-04, OBJ-10 · OBJ-35, OBJ-36, OBJ-37, OBJ-38, OBJ-39 · OBJ-05, OBJ-06, OBJ-13
**Fixed input:** `P2_FrameGate/CLAUDE_FrameGate_Phase2.md` (S2), partition per `P3_FrameGate/C0-coordinator.md` §3.
**Carried payload:** REF-01, REF-02, HOOK-07 (`H-PROV`). Golden vectors: none — see §5.

---

## 1. Facet scope and carried judgment

F1 owns the three abstract bases every other facet inherits from, the single closed value family the
collapse prohibition rests on, the one module permitted to name an external, and the configuration
that the ordering of draw classes lives in. It is **not** a shared-utilities facet: it holds three
judgments each of which could have resolved otherwise, and each resolution is load-bearing downstream.

**Judgment 1 — `Unknown` (OBJ-04) is closed at exactly five.**
`Refuse(name)` · `NoSubject` · `Uncomputable(boundary)` · `Undetermined(AE-id)` · `Latent`.
The closure is the thing, not the count. EV-5's collapse prohibition is enforceable only because the
family cannot grow: a sixth outcome would express something the upstream model does not contain, and
the moment it can be added, "an unknown propagates as itself" (RC-1) stops being checkable. Rendering
any one member as another, as `null`, or as a boolean is a **distinct defect per pair**, not one
defect. The RSI probe that attempted to extend this family correctly failed (S2 §3); F1 records that
failure as the reason for the closure, not as an incident.

**Judgment 2 — a base carries a contract, not behaviour.**
OBJ-01, OBJ-02 and OBJ-03 are declared bases with mandatory field sets and prohibited operations. They
supply no default implementation. Consequence: a Gate is **not** a Projection (RFD-02) — the is-a was
refused because a Gate carries `ON_FAIL` and a Projection does not, and A.5 and A.4 are different
grammars. Each Gate instead *has-a* Projection it evaluates. Any later attempt to unify the two bases
by giving Projection an optional `ON_FAIL` re-opens RFD-02 and must be refused at review.

**Judgment 3 — configuration is not a record fact.**
OBJ-05 Currency is a value type held read-only after load (RFD-04). It is not an AppendedFact: it has
no author, no height, no lineage, and it is not appended. The consequence that must survive review is
SC-3 — **the number two appears nowhere in the codebase**, and no `if cheap … else expensive` exists.
The currency set is data indexing a total order; the gate is one code path quantified over that order
(SC-5). A per-currency admission branch is a removed duplicate growing back.

**Self-reliance point, carried and discharged in §2 under OBJ-02.** The Projection family is defined
by RC-3's membership list. F1 exports the list; F1 exports no predicate.

---

## 2. Module specifications

### MOD-01 `kernel/`

**Purpose.** Declare the three abstract bases, the closed unknown family, and the height value type
that every fold is parameterised by. Nothing here computes a domain result.

**Responsibility boundary.**
*Responsible for:* the field sets and prohibited operations of OBJ-01/02/03; the exact membership of
OBJ-04 and of the Projection family; the definition and comparison semantics of OBJ-10; the parse-level
rules that make an append-only violation, a memoization violation, and an `ON_FAIL`-omission
unwritable.
*Not responsible for:* any Projection member's body; any Gate's `condition`; which Unknown member a
given downstream node returns (that is the owning facet's ruling — see §8, open item OI-2); reading or
writing the record (MOD-02 only); the currency order (MOD-03).

**Public interface (plain language).**
- `AppendedFact` — base declaration. Members carry author, record height at append, and payload.
  Exposes `append`. Exposes **no** `update`, **no** `delete`. Those names must not exist on the base or
  any subclass.
- `Projection` — base declaration. Every member takes a `RecordHeight` and returns a value computed
  from the record as of that height. Exposes `compute(at: RecordHeight)`. Exposes no mutator and no
  cache accessor keyed on anything but a `RecordHeight`.
- `Gate` — base declaration. Every member carries `condition`, `closed_by` (`HUMAN_ACT` | `DERIVATION`),
  `proposals_in`, `records`, and a mandatory `ON_FAIL` naming exactly one OBJ-04 member. A Gate
  declaration without `ON_FAIL` is malformed at parse.
- `Unknown` — closed value family. Constructors: `Refuse(name)`, `NoSubject`,
  `Uncomputable(boundary)`, `Undetermined(AE-id)`, `Latent`. `is_unknown(v)` answers whether a value is
  a member; it does **not** answer which one, and no total conversion to boolean or to `null` is
  offered.
- `RecordHeight` — value type. `compare(h1, h2)`, `succeeds(h_new, h_old)`. Total order, monotone,
  never decreasing. No arithmetic beyond ordering is exposed.

**Internal state.** None. MOD-01 holds declarations only. It has no loaded configuration, no handle,
no memo table.

**Dependencies.** None — hard or soft. MOD-01 imports nothing, including MOD-02. This is what makes it
the base: the module every other module depends on depends on no other module, so no cycle can form
through it and the parse-level rules it declares cannot be circumvented by a module it is downstream of.

#### OBJ-01 `AppendedFact` — abstract base

An AppendedFact is a record entry that came into existence by an append at a specific record height
and never changed afterward. Its eight admitted subclasses (OBJ-11 Candidate, OBJ-12 Commitment,
OBJ-13 Declaration, OBJ-14 Scope, OBJ-15 Observation, OBJ-16 DrawContext, OBJ-17 PromptRevision,
OBJ-18 Invalidation) are proven under one base by the external append-only law together with S1's
prohibited-forms list (`✗ delete(k)`, `✗ update(ℂ)`), which governs all eight identically — not by
their resemblance to one another. The base's contract is negative as much as positive: it declares
`append` and it declares that `update` and `delete` are absent, so that "the fact was corrected" has
no expression anywhere in the type system. A correction is a new fact at a greater height whose
relationship to the earlier one is itself recorded (OBJ-18 in MOD-12). A subclass that introduces a
mutator is malformed at parse, and this is the only place that rule can be stated once for all eight.

#### OBJ-02 `Projection` — abstract base

A Projection is a value derived from the record as of a `RecordHeight`, computed per read and stored
nowhere (SC-2, EV-3, ER-3). **The family is defined by a membership list, not by a property.** Its
members are exactly: OBJ-19 Sample, OBJ-20 Dispersion, OBJ-21 Location, OBJ-22 Bar,
OBJ-23 PopulationPartition, OBJ-24 Reachability, OBJ-25 Diagnostic, OBJ-26 Ratio, OBJ-27 Chain,
OBJ-28 InvalidationScope — ten, no more. **Why the list is the definition:** the family is proven by a
single named S1 contract, RC-3 `AsOfFold`, whose stated membership is MOD-04/07/09/10/11/16 extended
across the derived objects those modules produce. It is not proven by "stateless", "pure", or "takes a
height", and those properties are what make the run's self-reliance point fragile. OBJ-34
DifficultyAdvisory is stateless, pure, and computable at a height; if any reader re-derives the family
from such a property, OBJ-34 silently rejoins it, δ becomes consumable wherever a Projection is
consumed, and owner ruling DG-F1 — difficulty is advisory, entering no gate condition, read by nothing
— is defeated without anyone editing a line that mentions difficulty. RFD-01 refused that is-a edge
for exactly this reason and preserved OBJ-34 as a composition read by nothing. Therefore MOD-01
exports the ten names and exports **no** membership predicate: a module cannot ask "is this a
Projection?" and get an answer computed from shape. Two further base rules: no member may be memoized
across an extension of the record (a cache key not derived from `RecordHeight` is forbidden), and no
member carries `ON_FAIL` (RFD-02).

#### OBJ-03 `Gate` — abstract base

A Gate is a decision point with a mandatory failure outcome. Its four admitted subclasses (OBJ-29
ReachabilityGate, OBJ-30 ScopeGate, OBJ-31 CommitGate, OBJ-32 SignatureGate) are proven under one base
by Base Case Reduction §3, which declares all four in one notation with an identical field set. The
mandatory field is `ON_FAIL`, naming exactly one OBJ-04 member: a gate that can fail without saying
in which of the five ways it failed re-opens the collapse the family exists to prevent. `closed_by`
distinguishes the two gates a human closes from the two a derivation closes and is what makes
"proposals do not decide" checkable — `proposals_in` accepts a proposal type, and a proposal type is
never an argument type of the closing act (ER-4). A Gate is not a Projection; it *has-a* Projection it
evaluates. `ASSERT_ABSENT δ` (OBJ-34) over every gate `condition` is normative here at the base, per
owner ruling DG-F1, so that no individual gate has to remember it.

#### OBJ-04 `Unknown` — closed value family

Five outcomes, and the closure is load-bearing. `Refuse(name)` — an act was declined, and the named
guard declined it. `NoSubject` — the question has no subject to be about. `Uncomputable(boundary)` — the
answer is unreachable given a named boundary. `Undetermined(AE-id)` — an ambiguity is open, and the
named admitted exception is the ambiguity. `Latent` — a verdict exists but is withheld. These are five
different facts; a refusal, an unresolved subject, an unreachable answer, an open ambiguity and a
withheld verdict do not substitute for one another, and each unfaithful rendering — one member as
another, any member as `null`, any member as a boolean — is a separate defect with a separate test.
An Unknown is **returned**, never logged-and-defaulted (ER-2), and it **propagates as itself** (RC-1):
a caller receiving `Undetermined(AE-3)` returns `Undetermined(AE-3)`, not a generic unknown. The
family is closed against extension by design; a proposed sixth member is a signal that something is
being expressed which the upstream model does not contain, and the correct response is to raise it as
an admitted exception upstream, not to widen the family. **OBJ-09 `Absent` (MOD-07, F3) is not a
member of this family** and must not be added to it — it is an in-band non-value inside a vector of
values (AE-04) with its own discharge condition. Rendering `Absent` as an `Unknown` member, or the
reverse, is a defect of the same class as collapsing two members.

#### OBJ-10 `RecordHeight` — value type

A RecordHeight identifies a prefix of the append-only record: the record as it stood after some number
of appends. It is the sole parameter that makes a Projection reproducible and the sole legitimate
cache key. Its contract is threefold — it is totally ordered and never decreases; every Projection
takes one; and any memo, cache or stored derivation keyed on anything else (wall clock, unit id,
session, "latest") is forbidden, because such a key gives a derived fact a second home that can go
stale at the moment a human reads it (SC-2). A height-keyed cache *is* permitted; memoization carried
across an extension of the record is not. The distinction is precise and is the whole of PC-4: a value
computed at height *h* remains correct for height *h* forever, and is simply not an answer about
height *h+1*.

---

### MOD-02 `ports/`

**Purpose.** Be the only module in the codebase that names an external. Every external is *cited*
here and *defined* nowhere.

**Responsibility boundary.**
*Responsible for:* declaring the five port interfaces; being the single import site for any record
driver, renderer client, dispatch mechanism, author-identity source, and hash library; carrying the
DG-F3 dispatch citation verbatim.
*Not responsible for:* implementing any of them; choosing a digest function; choosing a renderer;
deciding authorization or identity policy for the author role (that is a production concern, §7);
interpreting the values that pass through — a port transports, it does not validate domain rules.

**Public interface (plain language).**
- `RecordPort` (OBJ-35) — `append(fact) -> RecordHeight`, `read_as_of(height)`. No `update`, no `delete`.
- `RendererPort` (OBJ-36) — `present(payload)`. Outbound only; returns nothing the core branches on.
- `DispatchPort` (OBJ-37) — `dispatch(work)`. Carries the cited external semantics: **a scope is spent
  by dispatch, not by return.** Cited, never restated (DG-F3).
- `AuthorEnum` (OBJ-38) — `ENGINE | DIRECTOR | HUMAN`. Exposed as a value with the rule attached:
  ENGINE and DIRECTOR may only **propose**; only HUMAN may decide.
- `DigestPort` (OBJ-39) — `digest(bytes)`. The function is pinned externally and never chosen here.

**Internal state.** Configuration handles for the bound externals, established once at load and not
reassigned during a run. No domain state.

**Dependencies.** Hard: MOD-01 (a `RecordPort` append returns an OBJ-10 RecordHeight, and the facts it
appends are OBJ-01 subclasses). Soft: none. MOD-02 depends on no domain module — the arrow always
points from a domain module into `ports/`, never out.

#### OBJ-35 `RecordPort` — port (external)

The append primitive and the as-of read. It is the mechanical reason OBJ-01's contract holds at
runtime rather than only at parse: the port surfaces `append` and `read_as_of` and surfaces no mutator,
so even a correct-looking call to update a fact has nothing to call. It is first in the build order
(S2 §6: OBJ-35 → OBJ-01 → OBJ-11/OBJ-12 → OBJ-24 → OBJ-29), because every other object's tests need a
record to stand on. Cited, never defined: this system owns no storage engine.

#### OBJ-36 `RendererPort` — port (external)

The outbound presentation boundary. Everything the system shows a human — a derived invalidation scope
before an append, an authorization form, a withheld-axis report — leaves through here. Its return value
must not be an input to any domain decision. It is the boundary at which PC-7's defect becomes
possible (a faithful core defeated by a UI that renders only the axes present), which is why the
withheld list is constructed in the core (MOD-10) and merely transported here. Cited, never defined:
this system owns no renderer.

#### OBJ-37 `DispatchPort` — port (external)

The mechanism by which work is actually performed. It carries one semantic that must be **cited
verbatim from the external, not restated in our words**: a scope is spent by dispatch, not by return
(DG-F3). Without the citation an implementer invents whether a failed draw burns a scope, and the two
answers give different ceilings. The citation is a required artefact of MOD-02, not of MOD-11 which
consumes it — see §8, OI-1, for its current status. Cited, never defined.

#### OBJ-38 `AuthorEnum` — port (external)

The three author roles, `ENGINE | DIRECTOR | HUMAN`, sourced externally and never minted here. It is
tagged load-bearing for INV-PROV: ENGINE and DIRECTOR may only propose, and only HUMAN may close a
`closed_by: HUMAN_ACT` gate or author a Declaration. The enum is the value; the *authorization* that a
caller genuinely is the author it claims is explicitly a production concern (§7) and is not solved
here. Cited, never defined.

#### OBJ-39 `DigestPort` — port (external)

The digest function used by the signature that binds a derived candidate to the commitment it derives
from (OBJ-32, MOD-12/F2). It is pinned externally so that no local choice of hash can silently change
what a signature covers. This system chooses no hash. Cited, never defined.

---

### MOD-03 `catalog/`

**Purpose.** Hold the total order of draw classes, the identity of the things drawn for, and the
human-asserted classification of those things — the last of which is a record fact, while the first is
not.

**Responsibility boundary.**
*Responsible for:* the currency order and its read-only-after-load property; predecessors and least
element; unit identity; appending Declarations by human act; answering "which declaration was in force
at height *h*"; hosting HOOK-07 (`H-PROV`).
*Not responsible for:* the reachability condition itself (MOD-04 — one gate, one condition; a second
check anywhere is a defect); computing difficulty from unit features (MOD-13 reads features from here
and returns nothing here); population membership (MOD-09 — MOD-03 supplies the level, not the
partition); any current-declaration read on behalf of a population computation (see the prohibition in
OBJ-13).

**Public interface (plain language).**
- `predecessors(currency) -> set of cheaper currencies` — the ordered predecessor set MOD-04 quantifies
  over.
- `least() -> currency` — the least element; guaranteed to exist.
- `currencies() -> the currency set` — used to index the ratio vector (MOD-11). Not counted, not
  summed, not divided.
- `unit(id) -> Unit` — identity.
- `features(unit) -> feature values, read-only` — consumed by MOD-13 advisory only.
- `declare(unit, level, author) -> Declaration` — appends. Guarded by HOOK-07; succeeds only for
  `author = HUMAN` with no derivation in the call chain.
- `declaration_at(unit, height) -> Declaration | Unknown` — the declaration in force as of a height.
- `levels() -> the declared levels` — one bar per level; levels never merged (consumed by MOD-09).

**Internal state.** The loaded currency order — established once, read-only afterward, never appended
to and never re-sorted at runtime. Unit identities. No derived value is held: `declaration_at` is a
read of the record through MOD-02, not a maintained index.

**Dependencies.** Hard: MOD-01 (Declaration is an OBJ-01 subclass; `declaration_at` takes an OBJ-10
RecordHeight; the `Unknown` return is OBJ-04), MOD-02 (all record access, and the OBJ-38 author role
HOOK-07 tests). Soft: none. MOD-03 does not depend on MOD-04, MOD-09, MOD-11 or MOD-13 — all four are
consumers.

#### OBJ-05 `Currency` — value type

A currency is a draw class, and the classes are **totally ordered by cost**. The order is loaded once
and read-only thereafter — it is configuration, not a record fact. That is-a edge was refused (RFD-04)
because an AppendedFact has an author, a height and a place in lineage, and an ordering of draw classes
has none of those; making it a fact would mean the order could be re-appended mid-run and every earlier
reachability answer would silently mean something else. Two properties are load-bearing downstream:
the order is **total and finite** and a **least element exists** — MOD-04's universally-quantified
condition `∀c' < c : effective(u,c') ≠ ⊥` is vacuously true at the least element and terminates
everywhere else precisely because of these. And the set is data, not structure: SC-3 requires that
**the number two appear nowhere in the codebase**, that no `if cheap … else expensive` exist, and that
the gate be one code path quantified over the order (SC-5). A three-currency set must run unmodified.
Since SC-3 is a codebase property rather than a node, it is expressible only as this object's kind and
must be carried as a mechanical review check — see §8, OI-4.

#### OBJ-06 `Unit` — value type

The identity of the thing a draw is made for. It is the index under which reachability is asked
(`effective(u, c')`), the key of a declaration, the subject of a per-unit ratio vector, and the carrier
of the features MOD-13 turns into an advisory. It holds no classification of its own — classification
is OBJ-13, appended separately and read as of a height — so that "what this unit is" always has a
stated author and a stated moment rather than being a property of the identity itself. A Unit is not an
AppendedFact and carries no history; its history is the sequence of Declarations that cite it.

#### OBJ-13 `Declaration` — class (AppendedFact)

A Declaration is a human assertion that a unit belongs to a classification level, appended to the
record with its author and its height. Two prohibitions run in opposite directions and both are
load-bearing for INV-PROV: **a declared classification may never be produced by any derivation**, and
**an inferred classification may never be written.** The first is enforced at parse — a derivation
whose result type is `Declaration` is malformed (REF-01, HOOK-07); the second means no code path
converts a computed feature, a difficulty advisory, or a score into a written declaration. It is an
**appended act, not a field on a Unit**: a field can hold the current classification but cannot record
that a re-declaration happened, who made it, or when — and the moment a re-declaration overwrites a
field, every population computed afterwards silently changes meaning for events that already happened.
Hence the third rule, enforced at the consumer: population membership elsewhere (OBJ-23, MOD-09) reads
**the declaration recorded at draw time**, never the current one. MOD-03 therefore offers
`declaration_at(unit, height)` and offers no `current_declaration()` convenience — the convenient
function is precisely the one that rewrites history. Where no declaration is in force at a height, the
answer is an OBJ-04 member, and `draw` asserts `declaration_at(u,h) ≠ ⊥`.

---

## 3. Seam contracts where F1 modules are the SOURCE

C0 §2 prices `ports → everything` as one cheap seam (Q-7). It is expanded below into four directed
rows, one per consuming module, because a validation rule cannot be written against "everything". This
is a refinement of Q-7, not a departure from it.

| # | Source | Target | Transferred value | Dependency requirement | Validation rule |
|---|---|---|---|---|---|
| S-01 | MOD-01 | MOD-04 reachability | `Gate` base (for OBJ-29), `Projection` base + `RecordHeight` (for OBJ-24), `Unknown.Refuse` | MOD-04 imports MOD-01; MOD-01 imports nothing | OBJ-29 declares `ON_FAIL = Refuse(unreachable)`; OBJ-24 takes a height and is never memoized across an extension; OBJ-29 is not declared as a Projection (RFD-02) |
| S-02 | MOD-01 | MOD-05 facts | `AppendedFact` base (OBJ-11, OBJ-12, OBJ-16), `Gate` base (OBJ-31) | MOD-05 imports MOD-01 | No `update`/`delete` name exists on any subclass; OBJ-31 accepts a diagnostic only via `proposals_in`, never as an argument of the closing act (ER-4) |
| S-03 | MOD-01 | MOD-06 condition | `AppendedFact` base (OBJ-17), `Projection` base + `RecordHeight` (OBJ-19, OBJ-27), `Unknown.Undetermined(AE-id)` | MOD-06 imports MOD-01 | OBJ-19 returns `Undetermined(AE-3)` below the dispersion floor rather than a number; the unknown propagates as itself into MOD-08 |
| S-04 | MOD-01 | MOD-07 observation | `AppendedFact` base (OBJ-15); the closed `Unknown` family, with the exclusion of OBJ-09 stated | MOD-07 imports MOD-01 | OBJ-09 `Absent` is **not** added to OBJ-04 and is not rendered as any member of it; no member of OBJ-04 is rendered as `Absent` |
| S-05 | MOD-01 | MOD-09 calibration | `Projection` base + `RecordHeight` (OBJ-22, OBJ-23); the closed `Unknown` family for θ's ⊥ | MOD-09 imports MOD-01 | θ's ⊥ is a returned OBJ-04 member carrying a cause and a discharge condition, never `null` and never coalesced (ER-1); OBJ-23 is computed as-of, never accumulated (SC-4). Which member θ=⊥ carries is MOD-09's ruling, not MOD-01's — see OI-2 |
| S-06 | MOD-01 | MOD-11 spend | `AppendedFact` base (OBJ-14), `Gate` base (OBJ-30), `Projection` base + `RecordHeight` (OBJ-26), `Unknown.Refuse` | MOD-11 imports MOD-01 | OBJ-30 declares a mandatory `ON_FAIL`; a stop condition requested where θ=⊥ yields `Refuse(...)`, never a default (AE-05); OBJ-26 is a vector in every representation (ER-6) |
| S-07 | MOD-01 | MOD-12 lineage | `AppendedFact` base (OBJ-18), `Projection` base + `RecordHeight` (OBJ-28), `Gate` base (OBJ-32) | MOD-12 imports MOD-01 | OBJ-28 is derived and displayed **before** the OBJ-18 append (RC-4); OBJ-32 declares `ON_FAIL = Refuse(malformed-signature)` |
| S-08 | MOD-01 | MOD-13 advisory | **A negative contract:** the ten-name Projection membership list, and no membership predicate | MOD-13 imports MOD-01 | OBJ-34 does **not** declare `Projection` and is not admitted to the list (RFD-01); no predicate exists by which OBJ-34 could be classified as a Projection by shape; `ASSERT_ABSENT δ` holds over every gate condition |
| S-09 | MOD-02 | MOD-05 facts | The record append primitive (OBJ-35) | MOD-05 imports MOD-02; no other route to storage exists | Append-only — no update, no delete; every append returns an OBJ-10 height; no candidate append path bypasses MOD-04's gate |
| S-10 | MOD-02 | MOD-07 observation | The author enum (OBJ-38) | MOD-07 imports MOD-02 | ENGINE and DIRECTOR may only propose; a per-component author is recorded with every observation component |
| S-11 | MOD-02 | MOD-11 spend | Dispatch semantics (OBJ-37): **a scope is spent by dispatch, not by return** | MOD-11 imports MOD-02 | Cited from the external, never restated in local wording (DG-F3). Absent the citation, MOD-11 has no defined answer for whether a failed draw burns a scope — this is a blocking gap for MOD-11's ceiling arithmetic, not for MOD-02 |
| S-12 | MOD-02 | MOD-12 lineage | The digest function (OBJ-39) | MOD-12 imports MOD-02 | Pinned externally; never chosen locally; omitting the lineage digest from a signature is malformed at parse |
| S-13 | MOD-03 | MOD-04 reachability | The ordered predecessor set of a currency; the least element (OBJ-05) | MOD-04 imports MOD-03 | The order is total and finite and a least element exists; the predecessor set is read from the loaded order, never rebuilt per currency; no branch on currency identity (SC-3, SC-5) |
| S-14 | MOD-03 | MOD-05 facts | The declaration in force at draw time (OBJ-13, via `declaration_at(u,h)`) | MOD-05 imports MOD-03 | `draw` asserts `declaration_at(u,h) ≠ ⊥`; the value recorded into OBJ-16 DrawContext is the one read at draw height, and is thereafter never re-read from the catalog |
| S-15 | MOD-03 | MOD-09 calibration | The level that partitions the populations (OBJ-13's levels) | MOD-09 imports MOD-03 | One bar per level; levels are never merged. **This seam carries the level only** — the *recorded* declaration reaches MOD-09 through MOD-05 (C0 Q-6), never from here. See OI-3 |
| S-16 | MOD-03 | MOD-11 spend | The currency set indexing the ratio vector (OBJ-05) | MOD-11 imports MOD-03 | The set indexes the vector; it is never summed, never divided, never counted into a scalar; `⟨1,4⟩` must not be able to hide inside `0.25` (ER-6) |
| S-17 | MOD-03 | MOD-13 advisory | Unit features, read-only (OBJ-06) | MOD-13 imports MOD-03; **MOD-03 does not import MOD-13** | Difficulty flows **out** to display and **into nothing**. There is no return path on this seam; a write from MOD-13 to MOD-03 is a defect, and a derivation in MOD-13 producing an OBJ-13 Declaration is malformed at parse (REF-01) |

---

## 4. Refusal tests

| ID | MOD | Invariant | Forbidden input | Expected rejection | Test name |
|---|---|---|---|---|---|
| REF-01 | MOD-03 | INV-PROV | A derivation whose result type is `Declaration` (OBJ-13) — i.e. any definition that computes a classification and returns it as a declared one | **Malformed at parse.** The definition does not compile; no runtime path is reached and no fact is appended | `test_derivation_producing_declaration_is_malformed_at_parse` |
| REF-01a | MOD-03 / MOD-13 | INV-PROV (second direction) | Any write path from OBJ-34 difficulty into a Declaration or into a gate `condition` | **No path exists.** The absence is structural (S-17 is one-directional; `ASSERT_ABSENT δ` holds over every gate condition), so the test asserts non-existence of a route, not a runtime refusal | `test_no_write_path_from_difficulty_to_declaration_or_gate_condition` |
| REF-01+ | MOD-03 | INV-PROV (positive) | A declaration appended by `author = HUMAN` with no derivation in the call chain | **Succeeds.** The Declaration is appended and `declaration_at` returns it at every height at or above the append | `test_human_authored_declaration_append_succeeds` |
| REF-02 | MOD-02 | ER-5 external isolation | Any module other than MOD-02 importing a renderer client, a hash library, or a record driver | **Malformed at parse.** The import is rejected; the violation is caught at build, not at runtime | `test_external_import_outside_ports_module_is_malformed_at_parse` |
| REF-02+ | MOD-02 | ER-5 (positive) | The same external reached through the corresponding MOD-02 port | **Succeeds.** The call completes and the port is the only named site of the external | `test_external_reached_through_ports_module_succeeds` |

REF-01a is not a new refusal test and mints no new id — it is the second clause of carried test CT-11
("a write to difficulty must have no path") expressed as its own executable assertion, because a
parse-level refusal and a non-existent-path assertion are checked differently.

---

## 5. Golden vectors — **N/A-by-absence**

**F1 pins no value. Zero golden vectors, declared explicitly and not by silence.**

**Reason.** A golden vector pins a computed result that could be got wrong numerically. All seven
carried vectors (GV-1…GV-7, all `DEFERRED` with discharge conditions) pin the outputs of reachability
(F2), dispersion (F3), the bar and its populations (F4), the diagnostic tuple (F4), the signature
(F2), and the exclusion counts (F4). F1's three modules compute **no** domain result: MOD-01 declares
bases and a closed family and holds no state; MOD-02 cites externals and computes nothing; MOD-03
holds a loaded order and appends and reads human assertions. There is nothing here whose value could
drift, so there is nothing here to pin.

**What this is not.** It is not a pass, and it is not "vectors to be added later". The correct
verification instruments for F1 are the parse-level refusals in §4 and the structural seam validations
in §3 — a violation in F1 shows up as a definition that compiles when it should not, never as a number
that comes out wrong. **A golden vector appearing under F1 in a later phase should be treated as a
signal that a domain computation has migrated into the kernel, ports, or catalog, and reviewed as
such.** C0 §6 records F1 and F5 as the two facets pinning no value; this section is that record's F1
half, stated so no downstream reader mistakes an empty section for an unfilled one.

---

## 6. Hook specification

| Field | Value |
|---|---|
| ID | HOOK-07 |
| Carried name | `H-PROV` |
| Registered at | MOD-03 `catalog/` |
| Trigger | `@before-declaration-write` |
| Condition | author is HUMAN **and** no derivation is in the call chain |
| Block action | fail at parse |
| Invariant | INV-PROV |
| Guards | OBJ-13 Declaration |
| Related refusal | REF-01 (and REF-01a for the second direction) |
| Author source | OBJ-38 AuthorEnum, via MOD-02 |

```
HOOK HOOK-07 @before-declaration-write {
    condition: author is HUMAN and no derivation is in the call chain,
    BLOCK: fail at parse
}
```

**Note on the block action.** The block is at *parse*, not at runtime, and the two conjuncts are
checked differently: "author is HUMAN" is a value check against OBJ-38, while "no derivation is in the
call chain" is a structural check over the definition — the same class of check as `ASSERT_ABSENT`.
Downgrading either to a runtime guard weakens INV-PROV to a condition that holds only when the guard
happens to be reached.

**Hook count.** HOOK-07 is F1's only hook. Nine hooks exist across the run and a tenth is a defect,
not an improvement — recorded here so that a reader of this slice alone does not add one.

---

## 7. Production concerns surfaced by F1 modules

Listed for the coordinator. **No PC ids minted here.**

1. **Authorization and identity for the author role.** Surfaced at MOD-02, OBJ-38. The enum states
   three roles and the rule that ENGINE and DIRECTOR may only propose. It does not establish that a
   caller presenting `HUMAN` is one. INV-PROV and HOOK-07 both rest on that claim being true, so the
   authorization mechanism is where the strongest invariant in F1 is actually load-bearing at
   deployment. (Corresponds to S1's PC-2.)
2. **Fold performance under the height-key rule.** Surfaced at MOD-01, OBJ-10. A height-keyed cache is
   permitted; memoization across an extension of the record is not. The permitted form is precise and
   the forbidden form is the natural optimisation, so this needs a stated deployment posture — cache
   sizing, eviction, and a check that no key derives from anything but a `RecordHeight`.
   (Corresponds to S1's PC-4.)
3. **Retention against unbounded append.** Surfaced at MOD-01, OBJ-01, and MOD-02, OBJ-35. The base
   forbids delete and the port offers no delete; the concept's whole point is drawing many cheap
   candidates and never removing them. Storage growth is therefore a function of success, and retention
   policy is a deployment question that must not be answered by adding a delete path.
   (Corresponds to S1's PC-1. Listed because F1 owns the two objects that make it structural, not
   because F1 owns the concern.)

---

## 8. Open items and recorded-seam contradictions

**Surfaced, not resolved.**

- **OI-1 — DG-F3's citation is required of MOD-02 and does not yet exist.** S2 §7 routes DG-F3 to
  "Phase 3 §4 seam row", and seam S-11 above is that row — but the row can only state *that* the
  citation is required and *what breaks without it*. The citation text itself is external material
  that F1 cannot author without inventing it. Until it is supplied, MOD-11 has no defined answer for
  whether a failed draw burns a scope. Non-blocking for F1; blocking for F5's ceiling arithmetic.
- **OI-2 — which OBJ-04 member θ=⊥ carries is unassigned.** AE-01 establishes that OBJ-22's ⊥ carries a
  cause and a discharge condition and is not a missing value; RC-1 serves MOD-10. Neither S1 nor S2
  names *which* of the five members it is. F1 supplies the closed family and deliberately does not
  choose — choosing here would put a MOD-09 ruling in the kernel. F4 must record the choice against
  OBJ-22, and the choice must not be "a generic unknown".
- **OI-3 — the MOD-03 → MOD-09 level seam is unpriced in C0 §2.** C0's cheap list names Q-6
  (OBJ-16 → OBJ-23, the declaration recorded at draw time) but does not price the separate S1 seam
  MOD-02 → MOD-10 ("the level partitioning the populations; one bar per level; levels never merged"),
  which in the Phase 3 partition is MOD-03 → MOD-09. It appears in neither C0's expensive nor cheap
  table. S-15 is written as a cheap boundary carrying **only** the level, with the recorded declaration
  arriving separately via Q-6, so that MOD-09 has exactly one route to each. If C0 intended these as
  one seam, the two-route separation is the thing to confirm — the prohibition "do not read a current
  declaration when computing populations" is enforceable only while they stay distinct.
- **OI-4 — SC-3 is a codebase property with no node to carry it.** S2 §7 records this: "the number two
  appears nowhere" is expressed only as OBJ-05's kind. F1 owns OBJ-05 and therefore owns the only place
  it can be stated, but a property over the whole codebase cannot be enforced by an object spec. It
  needs a mechanical check at K6 (a scan for a hard-coded currency count and for any
  `if cheap … else expensive` branch), alongside VC-9 which S2 already carries as a Phase 3 §11
  obligation.
- **OI-5 — recorded count discrepancy in S1, already corrected by S2, noted so it is not
  re-introduced.** S1's prose says "Refusal tests — eighteen guards, eighteen refusals" and "Hooks —
  eight, for the eight load-bearing invariants", while S1's own enumerations run to nineteen and nine
  respectively (CT-19 and `H-RATIO` both arrived with owner ruling DG-F4). S2 §6 fixes the counts at
  **19 refusal tests and 9 hooks**, and that is the count F1 works to. Surfaced because a later reader
  going back to S1's headline numbers would conclude a hook and a test had been invented.
- **OI-6 — ODG-FG-01's per-module check, as it applies to F1.** F1's three modules own **zero** of the
  ten Projections. MOD-01 owns the *base* and the membership list, which is deliberately not the same
  thing: it is the one place in the codebase where all ten names appear together, and therefore the one
  place a private `kind` switch could be written. The check must be read as "no module owns all ten
  Projection *members*" — MOD-01 exports names and no predicate (S-08), and any dispatch-on-kind
  appearing in `kernel/` is the ODG-FG-01 defect arriving by the only door left open to it.
- **OI-7 — OBJ-22's `DEFERRED` status is not F1's to close.** Recorded only because MOD-01 supplies the
  `Unknown` family OBJ-22's ⊥ is expressed in, and AE-5 states that **no default may be supplied**. If
  a later phase asks the kernel for a "sensible default" so that a bar function can be made total, the
  correct answer is that the function is supposed to return ⊥.

**No contradiction found between F1's assignment and C0's partition.** Coverage check: OBJ-01, OBJ-02,
OBJ-03, OBJ-04, OBJ-05, OBJ-06, OBJ-10, OBJ-13, OBJ-35, OBJ-36, OBJ-37, OBJ-38, OBJ-39 — thirteen
objects, matching C0 §3's rows for MOD-01 (5), MOD-02 (5) and MOD-03 (3). Every component above traces
to one of these ids.
