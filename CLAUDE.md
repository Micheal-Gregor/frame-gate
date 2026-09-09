# The Frame Gate — Phase 4/5 Build

Resident contract. The frozen Phase 3 instruction is `governance/S3/CLAUDE_FrameGate_Phase3.md` —
every table cited below lives there in full. Read it once at anchor.

## What this system does

Draw classes ("currencies") are totally ordered by cost. A draw is **refused** unless every cheaper
currency already carries a commitment for that unit — so exploration happens where it is affordable,
and the expensive currency is unreachable until the cheap one has committed. Over an append-only
record it derives a diagnostic with two independently available axes: **dispersion**, computable at
n >= 3, and **location**, computable only against a threshold that is **observed from the operator's
own accept/reject behaviour and never supplied**. When an axis is unavailable the system reports
which one and what would supply it. It owns no renderer, no credential, no media bytes and no
scoring algorithm.

Runtime: TypeScript + Node + Vitest per `ADR-001`. `tsc --noEmit` sits inside `test_command` because
six refusals demand rejection at parse, not at runtime.

## Modelling rule (ADR-001; register before MOD-01)

**BOTTOM and ABSENT are tagged variants, never `null`/`undefined`.** `{kind:'no-bar', cause,
discharge}`, `{kind:'absent', discharge}`. `??` and `||` only coalesce null/undefined, so on these
types they are **inert** — the defect shape has no purchase, and `tsc` forces a `switch` with
`assertNever`.

## Module numbering — read before carrying any identifier forward

S1 numbered eighteen modules `MOD-01..MOD-18` **before the emission contract existed**. `MOD-nn` is
minted in Phase 3 section 2, so **S1's numbers are legacy labels and the partition below is
authoritative.** The two are misleadingly compatible: S1's `MOD-02` is the unit registry, ours is
`ports/`. Full crosswalk in S3 section 1. Five of five facet agents reported this independently.

## Architecture

| MOD | Dir | Owns |
|---|---|---|
| MOD-01 | `kernel/` | OBJ-01 AppendedFact, OBJ-02 Projection, OBJ-03 Gate, OBJ-04 Unknown, OBJ-10 RecordHeight |
| MOD-02 | `ports/` | OBJ-35..OBJ-39 — the only module that may name an external |
| MOD-03 | `catalog/` | OBJ-05 Currency, OBJ-06 Unit, OBJ-13 Declaration |
| MOD-04 | `reachability/` | OBJ-24 Reachability, OBJ-29 ReachabilityGate — **the concept** |
| MOD-05 | `facts/` | OBJ-11 Candidate, OBJ-12 Commitment, OBJ-16 DrawContext, OBJ-31 CommitGate |
| MOD-06 | `condition/` | OBJ-07 ConditionIdentity, OBJ-17 PromptRevision, OBJ-19 Sample, OBJ-27 Chain |
| MOD-07 | `observation/` | OBJ-08 Score, OBJ-09 Absent, OBJ-15 Observation |
| MOD-08 | `statistics/` | OBJ-20 Dispersion, OBJ-21 Location |
| MOD-09 | `calibration/` | OBJ-22 Bar, OBJ-23 PopulationPartition — **DEFERRED** |
| MOD-10 | `diagnostic/` | OBJ-25 Diagnostic, OBJ-41 DiagnosticAxis, OBJ-42 WithheldReason |
| MOD-11 | `spend/` | OBJ-14 Scope, OBJ-26 Ratio, OBJ-30 ScopeGate, OBJ-33 StopCondition, OBJ-40 AuthorizationForm |
| MOD-12 | `lineage/` | OBJ-18 Invalidation, OBJ-28 InvalidationScope, OBJ-32 SignatureGate |
| MOD-13 | `advisory/` | OBJ-34 DifficultyAdvisory |

42 objects, each in exactly one module. **The ten Projections sit across seven modules, maximum two
each** — ODG-FG-01, so no module can see enough of the family to switch on it.

**MOD-09 can reach BUILT but never COMPLETE** until AE-5's separation rule closes: `VEC-02` row 4 is
uncomputable before then. Designed incompleteness, not a defect.

## Build order (S3 section 10)

`ports/` -> `kernel/` -> `catalog/` -> `facts/` -> **`reachability/`** -> `lineage/` · `condition/` ·
`observation/` -> `statistics/` · `calibration/` -> `diagnostic/` · `spend/` -> `advisory/`.

MOD-04 is the concept, it is small, and `REF-03` tests it completely.

## Carried payload — inherited, never generated

**28 seams** (S3 s4) · **19 refusal tests** REF-01..REF-19 (s5) · **7 golden vectors** VEC-01..VEC-07,
all DEFERRED with discharge conditions (s6) · **9 hooks** HOOK-01..HOOK-09 (s7) · **7 production
concerns** PC-01..PC-07 (s8).

**Nine hooks. A tenth is a defect, not an improvement.** S1 prose says "eight"; its own enumeration
lists nine — `HOOK-09` arrived with owner ruling DG-F4 after that prose was written.

`PC-07` is the one to watch: the only production concern that can defeat a concept-level guarantee
while every module stays conformant.

## Do not

- **Do not supply a threshold.** Not a literal, constant, config key, default parameter, fallback, or
  coalesced value. A threshold is observed or it does not exist. Wanting one to make a function total
  means the function should return BOTTOM.
- **Do not treat an absent observation component as zero, low, or passing.** It is ABSENT, it carries
  a discharge condition, and no arithmetic may touch it.
- **Do not collapse the five Unknown outcomes** into one another, into `null`, or into a boolean.
  `Unknown` is **closed**; a sixth member expresses something the model does not contain.
- **Do not store anything derived.** No cache keyed on anything but record height.
- **Do not write a second reachability check.** One gate, one condition, quantified over the currency
  order. A per-currency branch is a removed duplicate growing back.
- **Do not pass the diagnostic to an act.** It proposes; it never closes a gate. No act signature may
  accept it — if one can, the smallest possible run becomes unexecutable.
- **Do not require an observation to commit** — that inverts authority. But **count the exclusion, on
  both populations**, not just the one you were thinking about.
- **Do not accumulate a population incrementally.** The partition is non-monotone; a counter cannot
  represent it.
- **Do not read a current declaration when computing populations.** Read the one recorded at draw
  time, or a re-declaration silently rewrites history.
- **Do not infer a declared classification, and do not write an inferred one.**
- **Do not let difficulty into a gate condition, ever** — owner ruling DG-F1: advisory.
- **Do not divide the ratio.** A 1-to-4 vector must not hide inside "0.25".
- **Do not append before deriving the consequence scope.** The human approves a scope they were shown.
- **Do not sign a candidate without covering the commitment it derives from.**
- **Do not name an external outside `ports/`.**
- **Do not block a unit for having drawn only once.** It may have been lucky. Report the ratio; refuse
  nothing. The model does not infer intent from behaviour — the same restraint that keeps it from
  inventing a threshold.
- **Do not re-derive the Projection family from a property.** It is a fixed ten-name membership list
  (S3 s3). "Anything stateless" readmits OBJ-34 and defeats DG-F1. `kernel/` exports **no** membership
  predicate so the question cannot be asked and answered by shape. **The build's most fragile point.**

---

## Phase 4 process contract (applies to every session in this repo)

- **Governance:** `governance/Phase4_Conformance_Build_Roster.md` governs the build;
  `governance/Phase5_Utilization_Roster.md` governs environment binding. Read both before work.
- **C4 first.** The first session runs the C4 anchor: verify the handoff's pinned semantics are
  recoverable as rules and every typed interface defines its off-nominal behavior. Record in
  `INSTRUMENTS/C4-anchor-record.md`. Halt-class defects -> stop; route upstream via F.
- **Instruments are law.** A module not in `INSTRUMENTS/object-model-and-parameters.md` is not written
  yet — propose it there first. Base cases in `INSTRUMENTS/axioms-and-base-cases.md` BEFORE the
  feature, written first and watched failing. Every decision the handoff didn't make -> the
  Interpretation Register in `INSTRUMENTS/drift-ledger.md` (benign / latent / conflicting).
- **Base cases pin RULES, not instances.** A guard over "the five Unknown members" is a reflective
  scan over every member discovered from source — a hard-coded list lets the sixth skate.
- **Detectors resolve, never string-match.** Module-reach and conformance detectors resolve specifiers
  and test containment; name scans are supplementary tripwires only.
- **Two test frequencies.** `test_module` inside a rung for feedback; `test_command` — full suite,
  unscoped — to close one. Scoping the gate run hides the regression you did not think you touched.
- **RC-3 order.** No open body is filled before its resolution is recorded. Resolutions are live human
  decisions, logged in `INSTRUMENTS/RESOLUTION_RECORD.md`.
- **Vectors are computed** from the reference implementation, persisted to `vectors/<VEC-ID>.json`
  with the `impl_sha` they were computed against, and re-derived. Deferred vectors block their
  module's completion in `INSTRUMENTS/completion-ledger.md`, each row carrying its discharge condition.
- **Mutation battery before K7**, on a committed tree, every restore verified against HEAD. "BUILT &
  GREEN" without a battery is an unverified claim.
- **K7 is distinct.** The builder NEVER scores its own conformance. K7 is launched by
  `tools/k7-run.py` as a separate PROCESS with no builder context — never an in-session subagent.
  Drift < 7 on any dimension blocks new work on that module; `tools/gate.py` enforces it at merge.
- **Rounds are unbounded; no-progress halts.** A round changing neither the tree nor the failing-check
  set goes to owner triage. Convergence is measured, not counted.
- **Git discipline.** Commit at every approved increment; supersede, never rewrite; tag gates. A
  `k7-pass-N` tag is refused unless verdict N exists, PASSed, and reviewed this exact tree. Closed
  gates stay closed — a later defect is a new work item, never a retroactive RETURN.
- **No mid-round instruction changes.** Any change to gate rules or K7's charter takes effect only
  after it is recorded in `RESOLUTION_RECORD.md`.
- **Backflow.** Handoff defects -> `INSTRUMENTS/F-supersession-proposals.md`, taken by the human to
  the Phase 3 project as a revision run. Never patch `governance/S3/` in place.
- **Phase 5 in this repo.** Bindings live in `utilization/`, never in the core. The drift ledger does
  not close at deployment.
