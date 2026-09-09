# <CONCEPT> — Phase 4/5 Build

> Placeholder. Replace this line and the heading with the full content of
> `CLAUDE_<Concept>_Phase3.md`, keeping the process contract below.
> See `SETUP.md`, then delete it.

---

## Phase 4 process contract (append to the Phase 3 build instruction — applies to every session in this repo)

- **Governance:** `governance/Phase4_Conformance_Build_Roster.md` governs the build;
  `governance/Phase5_Utilization_Roster.md` governs environment binding. Read both before work.
- **C4 first.** The first session runs the C4 anchor: verify the handoff's pinned semantics are
  recoverable as rules and every typed interface defines its off-nominal behavior. Record in
  `INSTRUMENTS/C4-anchor-record.md`. Halt-class defects → stop; route upstream via F.
- **Instruments are law.** A module not in `INSTRUMENTS/object-model-and-parameters.md` is not
  written yet — propose it there first. Base cases in `INSTRUMENTS/axioms-and-base-cases.md`
  BEFORE the feature. Every decision the handoff didn't make → the Interpretation Register in
  `INSTRUMENTS/drift-ledger.md` (benign / latent / conflicting), never a silent choice.
- **RC-3 order.** No open body is filled before its resolution is recorded (Register discipline).
  Resolutions are live human decisions, logged in `INSTRUMENTS/RESOLUTION_RECORD.md`.
- **Vectors are computed.** Golden vectors come from the reference implementation, then
  re-derive; deferred vectors block their module's completion in
  `INSTRUMENTS/completion-ledger.md` until discharged.
- **K7 is distinct.** The builder NEVER scores its own conformance. K7 is launched by
  `tools/k7-run.py` as a separate PROCESS with no builder context — never an in-session
  subagent — adversarially, per the CC-1..CC-7 battery, including
  divergence-injection and mutation tests (delete the guarded call → named tests must fail).
  Trace citations naming a resolution must be conditional on that resolution's live register
  status. Drift score < 7 on any dimension blocks new work on that module (the teeth), and
  `tools/gate.py` enforces that at merge rather than leaving it to be remembered.
- **Git discipline.** Commit at every approved increment; supersede, never rewrite; tag gates
  (`k7-pass-*`, `resolution-run-*`, `k8-pass-*`) — a `k7-pass-N` tag is refused unless verdict
  N exists, PASSed, and reviewed this exact tree. Merges are the human gate — no auto-merge.
- **Backflow.** Handoff defects → `INSTRUMENTS/F-supersession-proposals.md`, taken by the human
  to the Phase 3 chat project as a revision run. Never patch `governance/S3/` in place.
- **Phase 5 in this repo.** Bindings live in `utilization/`, never in the core; the concern
  inventory, discharge record, and K8 readiness run per the Phase 5 roster. The drift ledger
  does not close at deployment.
