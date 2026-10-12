## Phase 4 process contract (every Phase 4 session in this repo — the first build or an extension build — until the next seal)

- **Governance:** `governance/Phase4_Conformance_Build_Roster.md` governs the build. Read it
  before work.
- **C4 first.** The first session runs the C4 anchor: verify the handoff's pinned semantics are
  recoverable as rules and every typed interface defines its off-nominal behavior. Record in
  `INSTRUMENTS/C4-anchor-record.md`. Halt-class defects → stop; route upstream via F.
- **Instruments are law — for engine modules.** A module not in
  `INSTRUMENTS/object-model-and-parameters.md` is not written yet — propose it there first.
  Base cases in `INSTRUMENTS/axioms-and-base-cases.md` BEFORE the feature. Every decision the
  handoff didn't make → the Interpretation Register in `INSTRUMENTS/drift-ledger.md`
  (benign / latent / conflicting), never a silent choice. `ui/` is Phase 5's tree, not a module
  source; a build session does not touch it.
- **RC-3 order.** No open body is filled before its resolution is recorded (Register discipline).
  Resolutions are live human decisions, logged in `INSTRUMENTS/RESOLUTION_RECORD.md`.
- **Vectors are computed.** Golden vectors come from the reference implementation, then
  re-derive; deferred vectors block their module's completion in
  `INSTRUMENTS/completion-ledger.md` until discharged, each row carrying its discharge condition.
- **K7 is distinct and bounded.** The builder NEVER scores its own conformance. K7 is launched by
  `tools/k7-run.py` as a separate PROCESS with no builder context — never an in-session
  subagent — adversarially, per the CC-1..CC-7 battery, including divergence-injection and
  mutation tests. PASS, or ONE fix round + ONE re-check, then owner triage (RD-9; the runner
  refuses round 3). Drift score < 7 on any dimension blocks new work on that module, and
  `tools/gate.py` enforces that at merge.
- **Git discipline.** Commit at every approved increment; supersede, never rewrite; tag gates
  (`k7-pass-*`, `resolution-run-*`, `closed-by-owner-*`). A `k7-pass-N` tag is refused unless
  verdict N exists, PASSed, and reviewed this exact tree. Merges are the human gate.
- **Backflow.** Handoff defects → `INSTRUMENTS/F-supersession-proposals.md`, taken by the human
  to the Phase 3 chat project as a revision run. Never patch `governance/S3/` in place.
- **Phase 4 ends at a seal.** When the last gate closes: `python3 tools/seal.py check` — one
  sweep, no judgment — then owner triage of anything failing (fix now in one round, or known
  issue), then `python3 tools/seal.py apply --approved-by "<owner, date>"` on the owner's live
  approval. Never a second sweep. After a seal, files present at the seal tag are frozen
  (`gate.py`); an extension build adds new files only and K7 reviews only its new modules.
