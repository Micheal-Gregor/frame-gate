# C4 Anchor Record — The Frame Gate Phase 4 run

**S3 anchored:** `governance/S3/` — `CLAUDE_FrameGate_Phase3.md`, `CLAUDE_FrameGate_Phase2.md`,
`C0-coordinator.md`, `S5-K6-synthesis-and-conformance.md`, `facets/F1..F5`. Tag `s3-anchor-v1.0`.
Fixed for this run; defects route through F, never patched.

**Emission gate:** `emission-check.py CLAUDE_FrameGate_Phase3.md --phase2 CLAUDE_FrameGate_Phase2.md`
-> conforms, exit 0. Cross-document checks ran (every OBJ mapped exactly once).

**Runtime:** TypeScript + Node + Vitest per ADR-001, accepted by the owner before anchor.

## A · Pinned values — restate the rule WITHOUT the vector. Recoverable?

| Check | Verdict | Detail |
|---|---|---|
| VEC-01 reachability table | **PASS** | "Admission holds iff every currency strictly below the requested one carries a non-BOTTOM effective commitment; vacuously true at the least currency." Stated in S3 s6 independently of any cell. Fully recoverable |
| VEC-02 bar across four population states | **PASS, with a registered hold** | Rows 1-3: "BOTTOM whenever either population is empty" — recoverable. Row 4 depends on AE-5's separation operator, which is `NO_DEFAULT`. This is a **proven-open body behind a fixed interface**, not a rule recoverable only from a value: the handoff names the interface, the hold, and the discharge condition. Distinct from the halt class |
| VEC-03 dispersion at n=2,3,4 | **PASS, with finding C4-F1** | Row 1 (n=2 -> Undetermined) is pinned by the spec and recoverable. **Rows 2-3 pin no spec value** — the statistic is DG-F5, deliberately unchosen. Once chosen they are regression vectors for that choice, not conformance vectors for the spec. Their discharge condition must say so or a later reader will read a spread number as specified |
| VEC-04 diagnostic tuple, four availability combinations | **PASS** | "The product of two independent classifiers; an unavailable axis is withheld with a reason and never estimated." Recoverable, and the (absent, absent) row is anchored to a frozen upstream artifact (MWE step 6) rather than to itself |
| VEC-05 signature with/without lineage digest | **PASS, with finding C4-F2** | "A candidate's signature digests its complete emission including the digest of the commitment it derives from" — recoverable, and the assertion is an **inequality property**, not a magic number. But `Encoding: hex-sha256` names a function while SEAM-26 says the digest is "pinned externally; never chosen here." If the external pin is not SHA-256 the encoding contradicts it, and a literal hex would stop re-deriving |
| VEC-06 population membership across an invalidation | **PASS** | "An invalidated commitment's candidate leaves Accepted and enters PassedOver; the union is unchanged." Recoverable; asserts a relation, not a value |
| VEC-07 exclusion counts, both populations | **PASS** | "A candidate with no observation joins no population and is counted as excluded from the side it would have joined." Recoverable |

**No pinned value is recoverable only from its expected value. No halt on axis A.**

## B · Typed interfaces — name the off-nominal input. Does the handoff answer it?

| Check | Verdict | Detail |
|---|---|---|
| OBJ-04 Unknown — a sixth member | **ANSWERED** | The family is closed at five and the closure is load-bearing; the S2's RSI probe records that extending it is a rewrite, not an extension. The intended behaviour of the off-nominal is "this must not compile" |
| OBJ-05 Currency — empty set / no least element | **ANSWERED** | SEAM-01's validation rule: "order is total and finite; a least element exists" |
| OBJ-05 Currency — **a single-currency configuration** | **DEFINED BUT UNGUARDED — finding C4-F3** | With one currency every draw is vacuously reachable and the gate never fires. Behaviour is fully **defined**, so this is not the halt class ("undefined AND semantically risky"), but it is the ST-F3 shape in configuration form: total conformance, zero refusals. No REF covers it. Registered; a startup validation is **proposed, not silently added** |
| OBJ-24 Reachability — genesis (first draw, empty record) | **ANSWERED** | Vacuously true at the least currency; exercised at MWE step 4 |
| OBJ-15 Observation — an all-ABSENT vector | **ANSWERED** | Legal and useless; REF-09's positive case accepts and stores it |
| OBJ-15 / OBJ-20 — does an all-ABSENT candidate count toward the floor of three? | **ANSWERED AS OPEN** | ODG-FG-03, registered with a stated reading (no) and its reason |
| OBJ-22 Bar — genesis (both populations empty) | **ANSWERED** | BOTTOM on the population branch, before the separation operator is consulted; REF-11 tests exactly this |
| OBJ-14 Scope — **ceiling of zero or negative** | **UNGUARDED — finding C4-F4** | REF-16 covers the N+1th draw under a ceiling of N; nothing refuses N = 0. A zero-ceiling scope authorises nothing and is almost certainly malformed. Minor, but no test names it |
| OBJ-14 Scope — expiry | **ANSWERED AS OPEN** | ODG-FG-05: the inherited HOOK-05 text implied expiry, nothing proves it. The S3 restated the condition to what is proven and preserved the original wording |
| OBJ-13 Declaration — a draw before any declaration | **ANSWERED** | REF-05 refuses with no-declaration |
| OBJ-16 DrawContext — a unit never closed | **ANSWERED** | The resolution label is null while open; it is attached later, not required at draw |
| OBJ-25 Diagnostic — below the floor AND no bar | **ANSWERED** | Both axes absent; VEC-04's (absent, absent) row, pinned to MWE step 6 |
| OBJ-40 AuthorizationForm — an authorization in the least currency | **ANSWERED** | HOOK-09 triggers only above the least currency; the ratio requirement is scoped to the expensive spend by the trigger itself |
| OBJ-23 PopulationPartition — a candidate invalidated then re-committed | **ANSWERED BY RULE** | Populations are computed as-of a record height, never accumulated, so membership is whatever the fold yields at that height. Not spelled out case-by-case, and does not need to be |

**No interface has undefined off-nominal behaviour. No halt on axis B.**

## C · Mechanical gates at anchor

| Gate | Result |
|---|---|
| `emission-check.py` S3 with `--phase2` | pass |
| `structure-check.py` | pass |
| `phase4-checks.py rosters` | pass |
| `phase4-checks.py tags` | pass |
| `phase4-checks.py scaffold` | pass |
| `phase4-checks.py modules` | **13 violations — expected and correct.** Every module is declared with its `File` and no file exists yet. This is CC-1 in the declared-but-absent direction, and it is the build's to-do list, not a defect. It clears as each rung lands |
| `rederive.py --all` | exit 2, "no vectors found" — correct: all seven vectors are DEFERRED and none is computed. `rederive_invoke` is declared and reachable |
| `gate.py` — write to `src/` | allow (exit 0) |
| `gate.py` — write to `governance/S3/` | **deny** (exit 2), routed to F-supersession |
| `gate.py` — malformed payload | deny, fails closed |
| `SETUP.md` | deleted (`git rm`) |

## C4 verdict: **PROCEED**

No halt-class defect. Four findings, all registered in the drift ledger, none blocking:

- **C4-F1** — VEC-03 rows 2-3 pin an implementation choice, not a spec value. Discharge condition must say so.
- **C4-F2** — VEC-05's `hex-sha256` encoding names a function the seam says is externally pinned. Assert the inequality; do not write a literal until the pin is confirmed.
- **C4-F3** — a single-currency configuration conforms totally and refuses nothing. Startup validation proposed, not added.
- **C4-F4** — no refusal covers a scope ceiling of zero.

C4-F3 and C4-F4 are candidate REFs. **They are not minted here**: the refusal set is inherited from
the S3 and Phase 4 generates none. Both route through F as supersession proposals if the owner wants
them in the guard set.
