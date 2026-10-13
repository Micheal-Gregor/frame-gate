# Conformance Build Layer — Phase 4 Roster & Code-Conformance Gate (v0.7, input-agnostic)

*Phase 4 of the #MetaFramework pipeline · The governed build · Reusable across concepts ·
control system (drift ledger, axioms & base cases, object model & parameters, test strategy).
v0.2 folds in the eight revisions (RD-1..RD-8) from the full pressure-test run: C4 → K7
(RETURN) → regeneration → R → K7 re-verify (narrow RETURN) → surgical fix → K7 PASS.*

Phases 0–3 prove logic and emit a build instruction; then the project "leaves AI-project
space." Phase 4 is what receives it. It is **not** free-form coding with a good CLAUDE.md —
it is the same machine as the earlier phases pointed at code: an anchored input, a governed
loop, a conformance gate, a human gate, and a trace that never breaks. The spine extends one
layer further:

    ∀ module ∈ Code : trace_back(module) ⊆ components(S3)     (S3 = the Phase 3 spec + CLAUDE.md)

And Phase 4 adds the arrow no earlier phase needed: a **backflow gate**, because the build is
the first place upstream defects become observable (pilot finding B-1: an inverted decision
polarity recoverable only from a golden-vector remark — nothing before code execution could
have caught it).

# 1 · What Phase 4 Consumes and Produces

**Input (S3):** the approved Phase 3 pair — CLAUDE_<Concept>_Phase3.md + Specification docx.
Anchored at intake; never edited, only built and, where defective, **superseded upstream**.

**Outputs:**
- **Conformant code** — built in the mandated order, open bodies behind fixed interfaces.
- **The four standing instruments** (living documents, opened at intake, maintained every step):
  1. **Object Model & Parameters** — the code-level anchor. Rule: *every module appears here
     before it is written; if it isn't here, propose the addition first.* This is CT-1 made
     enforceable at code level.
  2. **Axioms & Base Cases** — the carried rules restated as app-level invariants (each citing
     the S3/S2 rule it descends from) + pre-solved scenarios (input → expected observable
     outcome) as the primary correctness lens. Base cases are written **before** the feature.
  3. **Drift Ledger** — the running register of divergence, each entry scored (object-model
     fidelity · axiom coverage · base-case support · extensibility) **with teeth**: no new
     work on a module scoring < 7 until the score is raised. Plus an **Interpretation
     Register**: every decision the handoff didn't make (B-1..B-10 class), classified
     benign / latent / conflicting — the Stage 2b Assumption Exposure Log, re-instantiated at
     code level.
  4. **Test Strategy & Completion Ledger** — the layered harness (engine conformance / unit /
     base-case) plus the per-module CT-checklist table showing exactly which modules are
     COMPLETE, which are blocked on deferred vectors, which are OPEN awaiting resolution.
- **Resolution record** — human-gated dispositions of open bodies, fired ODGs, deferred
  vectors, and production concerns.
- **Backflow items** — handoff defects packaged as supersession proposals to Phase 3 (or
  deeper), never fixed silently in code.

# 2 · The Agent Roster

Fixed roles, same granularity test as Phase 3 (an agent exists where a judgment can resolve
more than one way):

| Agent | Owns | Decision it owns |
| --- | --- | --- |
| C4 · Anchor / Intake | S3 intake + handoff well-formedness | Re-run the halt **on the handoff itself**, with a concrete probe list (RD-3): for EACH pinned value, restate its rule WITHOUT the vector — recoverable?; for EACH typed interface, name the off-nominal input (unenumerated member, marker family with no negative case, genesis case, default under openness) — does the handoff answer it? Malformed → blocking return to Phase 3. |
| B* · Build agents | One per facet, in the mandated build order | Everything within the facet, against the seams; every un-made decision → Interpretation Register, never silently chosen. |
| DL · Drift & Trace Service | The four instruments + the module→S3 trace map | None autonomous — the shared service every agent writes to. Always-on. Analogue of T. |
| K7 · Code-Conformance Gate | The CC-1..CC-7 battery (below) | PASS / RETURN per module. **Run by a distinct session/agent from the builder** — the builder never scores its own drift (AX-2 applied to the process itself). Distinct means (RD-6): a fresh context with no builder transcript, always; a different model or human reviewer for load-bearing modules. Every builder "verified/complete" claim is an assertion for K7 to falsify, never accept (RD-2). |
| R · Resolution Run | Open bodies, fired ODGs, deferred vectors, production concerns | Disposition each through the Register (RC-3 discipline): record the resolution first, fill the body second. Human-gated per item. |
| F · Backflow Gate | Upstream-defect channel | Classify each Interpretation Register entry: utilization shape (stays local) vs handoff defect (→ supersession proposal upstream). Never edits S3 in place. |
| H · Human Gate | — | Approve / revise. Live, per-abstraction. The drift-teeth rule is its standing delegation: score ≥ 7 batches under standing approval; < 7, open-body fills, AE/ODG resolutions, and spec supersessions **halt regardless** — the load-bearing set of this phase. |

# 3 · The Code-Conformance Battery (K7 · CC-1..CC-7)

CT-1..CT-6 verified the *spec*. CC-1..CC-7 verify the *code against the spec* — same
N/A-by-absence discipline throughout:

| Test | Question | Instrument |
| --- | --- | --- |
| CC-1 Code-trace | Does every module trace to an S3 component (and transitively to S2)? Machine-checkable: module ∉ Object Model → build fails. | Object Model & Parameters |
| CC-2 Carried-rule | Does the running code honor every carried axiom? Rules absent by structure → N/A-by-absence. | Axioms & Base Cases |
| CC-3 Fidelity | Does the code add behavior S3 never specified — beyond *registered* utilization shapes? An unregistered invention fails; a registered interpretation passes pending backflow review. | Interpretation Register |
| CC-4 Refusal-execution | Does every refusal test **run and pass** — not merely appear in the spec? Forbidden input → observed rejection. | Test harness |
| CC-5 Vector-discharge | Is every computed vector re-derived from the implementation? Is every *deferred* vector now computed (this is the phase deferral discharges into)? A module with an undischarged vector is NOT COMPLETE — by rule, indefinitely. | Completion Ledger |
| CC-6 Hook-wiring | Do the hooks actually fire? Wiring proof requires BOTH (RD-2/RD-8): **divergence-injection** (force the guarded component to misbehave — a lying predicate, a suspended register — and prove the hook catches it on the real orchestrated path) AND **mutation testing** (delete the guarded call / invert the order in a throwaway copy → named tests MUST fail; presence-of-calls plus green tests is not proof). Where a rule is mechanically checkable, promote it from advisory prose to a **CI hook** that fails the build. | Hook harness + CI |
| CC-7 Drift-score | Quantified alignment ≥ 7 on all four dimensions, scored by a **distinct reviewer**, with the merge-blocking teeth. Anchored rubric (RD-5) so scores compare across reviewers: 9–10 = conforms, no known gaps; 7–8 = conforms with registered interpretations / cosmetic drift only; 5–6 = a demonstrated invariant gap or unregistered invention (RETURN); ≤4 = structural divergence from the model. This is the graduated, code-level analogue of PS_OOP admission. | Drift Ledger |

# 4 · Workflow & Control Flow

```
S3 → C4 (anchor + handoff well-formedness halt)
        | opens the four instruments; derives the module build order from S3
        v
   [ B agents — mandated order; every step: base cases FIRST, then code,
     then self-review appends to the Drift Ledger + Interpretation Register ]
        v  (per module, or per governed increment)
   ┌─► K7 Code-Conformance Gate — CC-1..CC-7, distinct reviewer ─► RETURN loops to owning B
   │        v
   │   R Resolution Run — human-gated dispositions (unblocks NOT-COMPLETE modules,
   │        v              discharges deferred vectors)
   └── resolved/discharged modules RE-ENTER K7 (the K7 ⇄ R loop, RD-1 — a module
        v   whose vector was deferred CANNOT pass CC-5 until R runs, then must re-verify)
   F Backflow Gate — handoff defects → supersession proposals upstream
        v
   H Human Gate → conformant code + instruments + resolution record
```

- **Gate policy (builder mode):** increments batch under standing approval with a recorded
  audit note; the load-bearing set halts regardless: drift < 7, filling an open body,
  resolving an AE/ODG, computing a deferred vector, any CC failure, any spec supersession.
- **Regeneration loop:** K7 RETURN names the failing CC test and the owning module — exact
  analogue of K6's return-to-facet.
- **Hard halt:** C4 finds the handoff under-determined (a B-1-class pinned value with no
  recoverable rule) → blocking return to Phase 3. No building over ambiguous semantics.

# 5 · Do not

- Do not write a module that is not yet in the Object Model & Parameters — propose first (CC-1).
- Do not make an interpretation silently — register it, classify it, and let F route it (CC-3).
- Do not let the builder score its own drift — the conformance reviewer is a distinct agent/session (AX-2 on the process).
- Do not add features on top of a module scoring < 7 — raise the score first (the teeth).
- Do not fill an open body without recording its resolution through the Register first (RC-3, carried).
- Do not count a module complete while any of its vectors is deferred-undischarged (CC-5).
- Do not trust a hook that has never fired — prove wiring with a forbidden-transition run (CC-6).
- Do not leave a mechanically-checkable rule advisory — promote it to a CI hook (CC-6).
- Do not ship a base case that cannot be expressed as a test — that is a signal the object model is wrong; fix the model (backflow), don't skip the test.
- Do not fix an upstream defect silently in code — supersede the upstream document through F.
- Do not let an interpretation implement an open body's interface without linking it to that AE in the register at write time — it dies or is sanctioned when the AE resolves, never floats (RD-4).
- Do not stamp a trace citation naming a resolution unless that resolution's register status is RESOLVED at stamp time — a citation is itself a claim; false provenance in an append-only store is worse than none (RD-7).
- Do not accept presence-of-calls + green tests as hook wiring — mutation-test it: delete the guarded call in a throwaway copy and named tests must fail (RD-8).
- Do not edit S3 in place — it is fixed at anchor, superseded never patched.
- Do not close any gate without a live human decision — no defaults, timeouts, batch approvals.

# 6 · Traceability

Every S3 element maps to exactly one Phase 4 destination: modules → B agents (built) → K7
(verified) → Completion Ledger (statused); open bodies/ODGs/deferred vectors/production
concerns → R (dispositioned); handoff defects → F (superseded upstream); everything → DL
(traced). The no-orphans guarantee now reaches code, and — through F — the pipeline finally
learns from its builds, the way v3 → v3.1 absorbed the verification-handoff rule.

*The spine was preserved for this. Now it survives contact with the code.*

---

# v0.3 amendments — RD-9..RD-16

*These amend §5's regeneration loop and §3's battery discipline. Where v0.2 says "the K7 ⇄ R
loop … RETURN loops to owning B" and "re-enter K7", RD-9 SUPERSEDES that mechanics. Everything
else in v0.2 stands.*

- **RD-9 · The round cap.** The unbounded K7 ⇄ R loop converges on exhaustion, not correctness
  (observed: six rounds with a floating exit condition). Superseding mechanics: **PASS, or ONE
  builder fix round + ONE K7 re-check, then everything still open goes to the OWNER as a triage
  list** (fix now / known issue / won't-fix). No round 3, ever. A slice still returning at the
  cap is a finding about its scope.
- **RD-10 · Builder battery before K7.** The builder re-plants the defect shapes its tests
  exist to kill (plus any a prior K7 found) BEFORE invoking K7 — after committing the slice
  (an untracked tree cannot be git-restored; a battery with silent restore failures proves
  nothing; restores are verified against HEAD and the run aborts on failure). Build-only kills
  get a compiler-evading re-plant that must die by TEST. Observed: "BUILT & GREEN" with 9/16
  mutation survival.
- **RD-11 · Tag and closure discipline.** Tag only the tree K7 actually reviewed. A gate may
  close on owner triage without a K7 PASS — tag `closed-by-owner`, never a `k7-pass` tag for a
  verdict that does not exist. Closed gates stay closed: later defects are NEW work items,
  never retroactive RETURNs, never voided tags.
- **RD-12 · Rule-level pins.** A base case guarding "the members" scans SOURCE for the set and
  checks it reflectively — never a hard-coded list (the fifth member skates), and never one
  declaration form (class fields shadow sealed prototypes under ES2022 field semantics).
- **RD-13 · Resolve-then-contain (standing detector rule).** A module-reach detector RESOLVES
  specifiers to paths and tests CONTAINMENT; string/name scans are supplementary tripwires
  only. String detectors were defeated three times by sibling spellings (`'../index'`,
  `'./../index'`, computed-key member fetches) each carrying a live, running breach past a
  green suite.
- **RD-14 · Banners close with the code.** Scaffold/status banners in the instruments are
  rewritten at build close IN THE SAME COMMIT as the code. A register that misdescribes its
  artifact is the failure that hides every other one (caught three times).
- **RD-15 · No session-minted procedure.** Changes to gate rules, review scope, or the
  reviewer's charter — even owner-proposed in chat — take effect only once recorded in
  RESOLUTION_RECORD. Conversational adoption produced reviewer role-blur (K7 writing code it
  then certified).
- **RD-16 · Deferral is a recorded state, not a gap.** A golden vector may lawfully defer TO
  Phase 5 when its discharge condition names a target event (e.g. a governed first
  enactment); the completion ledger row must carry that condition verbatim, and the module is
  BUILT-but-NOT-COMPLETE — an honest state Phase 5's C5 accepts as input.

---

# v0.4 amendments — RD-17..RD-24

*Appended; everything above stands except where a line below says SUPERSEDES.*

- **RD-17 · The seal is Phase 4's exit.** Once the last gate closes (K7 PASS or owner triage),
  `tools/seal.py check` runs ONE sweep, mechanical only: the nearest closing tag covers the
  code being sealed; full suite; `rederive --all`; the phase4 checks; structure and emission;
  every ACTIVE module in S3 §2 exists on disk. Failures go to the OWNER once: fix now (one
  round) or known issue. `tools/seal.py apply` then writes the seal record, archives the Phase
  4 CLAUDE.md, installs the Phase 5 contract, and tags `seal-N`. After the tag, files present
  at the seal that match `sealed_globs` are frozen — `gate.py` refuses writes, `seal.py verify`
  and `phase4-checks seal` detect changes. **There is no second sweep.** Observed: reviewing
  documentation and code together with no stated end goal produced relative verdicts —
  what one pass accepted the next rejected — and each pass generated documentation the next
  pass audited.
- **RD-18 · Extension builds.** A gap Phase 5 cannot close with existing operations becomes an
  extension run through Phases 1–3 (sealed objects are givens; new objects only), then
  `seal.py begin-extension` returns the repo to Phase 4. The extension adds NEW files; a need
  to change a sealed file is not an extension and halts for the owner. K7 reviews the new
  modules only (`--modules` is required after a seal; the runner verifies sealed files
  unchanged first). The extension closes by re-sealing as `seal-N+1`.
- **RD-19 · The round cap is restored and enforced.** SUPERSEDES the skill-level note that
  made rounds unbounded under a no-progress halt. Moving review to a separate process fixed
  role blur; it did not fix convergence. The no-progress halt measures motion, not distance —
  a loop of ever-smaller fixes changes the tree every round and never trips it. RD-9 stands as
  written — PASS, or ONE fix round + ONE re-check, then owner triage — and `k7-run.py` refuses
  a third consecutive non-PASS round until a closing tag is placed. The no-progress halt is
  kept inside the cap. Owner-triaged closes are tagged `closed-by-owner-N` (a suffix, so more
  than one gate can close that way).
- **RD-20 · Phase 5 surfaces; it does not bind.** The Utilization roster (C5, W-ENV/SEC/PERS/
  OBS/OPS/DISCHARGE, K8) is retired from this repo. RD-16 is amended accordingly: production
  concerns (`PC-*`) and vectors deferred to a target event are carried in the seal record and
  become inputs to Phase 5's latency / scale / security review. Discharging a target-deferred
  vector computes and pins an engine value, so it runs as a scoped extension build, not as UI
  work.
- **RD-21 · Blocked by the seal: log, continue, batch.** When a build cannot proceed as written
  because a sealed module would have to change — most often a decider reached by name that now
  needs handing in — the builder does NOT stop and does NOT reach into the library. It records
  the exception in `INSTRUMENTS/F-supersession-proposals.md` (call site, sealed target, what
  the new code needs, what was built around it, what is left unbuilt), builds everything else
  on the list, and finishes the full pass. At the end of the run it presents ONE consolidated
  case covering every blocked item: the call sites, what each unlocks, the order, and the
  default if the owner declines. The owner rules once. Fifteen interruptions for fifteen call
  sites is the failure this rule exists to prevent; so is a builder that quietly edits a
  helper to keep moving. Nothing is applied until the owner rules, and what is approved is
  applied as one deliberate re-seal, not as fifteen reaches into sealed code.
- **RD-22 · The Object Writing Standard is binding.** `governance/Object_Writing_Standard.md`
  (OS-1..OS-12) governs how every class is written: dependencies declared at construction, no
  ambient reads, deciders injected, valid-or-refuse constructors, private state, typed
  refusals, declared determinism and side effects, no bucket modules, one responsibility,
  injection at the wiring point, and an isolation test per class. `phase4-checks.py objects`
  enforces what a scanner can see; OS-12's isolation test proves the rest. The seal sweep runs
  both, so a library cannot seal over a hard-wired dependency. The failure this closes: an
  object that reaches for what it was never handed works perfectly for one scenario, seals,
  then answers the second scenario with the first one's assumption — which the next session
  reports as a missing object and brings back as an extension request. Extensions are for
  capabilities the engine lacks, not for dependencies it never declared.
- **RD-23 · The standard is enforced where the choice is made, not where it is documented.**
  A rule read 40,000 tokens ago loses to the three-token shortcut sitting in front of the
  cursor, so OS-2 is refused by `gate.py` AT THE WRITE, with the fix in the denial;
  `phase4-checks.py objects` runs at `git commit` on staged files, so a violation cannot
  accumulate for a later sweep; `tools/new-object.py` scaffolds the compliant shape so
  compliance costs fewer tokens than improvising; and the OS-12 isolation tests run at the seal
  with the environment cleared, which is the only step that proves absence rather than scanning
  for presence. Documentation states the rule; these four make it the path of least resistance.
- **RD-24 · A seal may not close over an undeclared input.** The defect: a sealed class answers
  from a fact nobody declared — a zero-argument helper returning a literal, a default argument,
  a module constant — so it works for the scenario it was written for and lies to the second
  one. Phase 5 then reads the lie as a missing class and opens an extension, which adds a class
  and cannot repair one. The repair is upstream, in four places: OS-1 names the illegal shapes;
  `gate.py` refuses them at the write; `phase4-checks.py objects` parses for them and requires
  an isolation test that CALLS every operation and proves a declared input changes the answer;
  and the seal sweep fails — not notes — on an undeclared `isolation_test_command`, an unwritten
  interface contract, or any disagreement between a signature, the object model's Declared
  inputs cell, and the contract's Inputs cell. The contract is copied from the signatures, never
  written from memory of the happy path. This applies to classes written after the change; it
  does not reopen sealed files.

---

# v0.5 amendments — RD-25..RD-26

*Appended; everything above stands except where a line below says AMENDS. Adopted by the owner, 13 Oct 2026, battery size as a guide (from the Frame Gate trial's findings F3 and F4, MF-35).*

- **RD-25 · A materiality bar for the record.** AMENDS §1's Interpretation Register ("every decision the handoff didn't
  make"), §2's B* row ("every un-made decision → Interpretation Register") and §1's "maintained every step".
  - **What is material.** An interpretation is registered when the builder's choice is material. A choice is
    material when it changes observable behaviour or a contract:
    - what a public operation returns, refuses, records or emits;
    - a signature, or a type at a seam;
    - a persisted or exchanged format;
    - declared determinism or side effects;
    - anything inside an open body, which RC-3 still requires to be linked to its AE when it is written.
  - **What is not.** A choice that changes none of these is not registered: a private helper's name, an internal
    structure with identical outputs, how tests are arranged, wording.
  - **The register's form.** An interpretation is one line: id, the choice, its class (benign / latent / conflicting),
    and the rule or AE it touches.
  - **Rulings.** A ruling is one row in `RESOLUTION_RECORD.md`, quoting the owner's words where they decide it, with no
    narrative copy elsewhere.
  - **The instruments.** They are updated when a step changes what they record. No entry is written to show activity.
  - **CC-3 reads with this test.** An unregistered choice is a finding only when it is material; a choice that adds no
    behaviour is not an invention.
  - **Observed** (Frame Gate, six modules): 85 interpretations, many changing no behaviour and no contract, and every
    ruling written twice, as a row and as a narrative section. The record grew faster than the code, and each review
    read it all.

- **RD-26 · A battery is sized to the change's new claims.** AMENDS RD-10, which says what a battery re-plants but not
  how many.
  - **What gets planted.** A battery plants at least one mutation for each NEW or CHANGED claim in the slice: a base
    case, a refusal, or a test's stated claim. Every mutation names the claim it targets; a mutation that names none is
    not planted.
  - **Prior findings are always re-planted.** Each defect shape a K7 round found in the module is re-planted. That is
    regression, and it is cheap.
  - **Unchanged claims are not re-planted.** A claim whose code and tests are unchanged since the module's last
    concluded battery is not re-planted. Its earlier kill is the credit.
  - **Size.** About 10 to 15 mutations is the usual size. A larger battery states its reason in the battery record:
    for example, a detector whose reach is itself the claim.
  - **What stands.** Everything else in RD-10: a committed tree, verified restores, and a build-only kill re-planted
    so that it dies by TEST.
  - **Observed** (Frame Gate): the builder sized batteries toward exhaustion. Battery 19 planted 36 mutations in about
    40 minutes, and nothing in the roster bounded it.

---

# v0.6 amendments — RD-27

*Appended; everything above stands except where a line below says AMENDS. Adopted by the owner, 13 Oct 2026 (from the Frame Gate trial's finding F1 and the F1/F6 design, stage 1).*

- **RD-27 · Credited review.** AMENDS §3's battery mechanics and the K7 runner. RD-9's round cap and the reviewer as a
  separate process stand.
  - **The fingerprint.** The runner computes each module's content fingerprint (`tools/manifests.py`). It covers:
    - the module's files from the object model;
    - the internal files they import that belong to no module;
    - the test files that import any of them;
    - the module's object-model rows;
    - the content of every module its files import, transitively.

    Imports are resolved to tracked files (RD-13). An internal import that cannot be resolved is recorded, and a module
    with one is never credited.
  - **Concluded.** A round is concluded when its verdict is PASS, or when a closing tag (`k7-pass-*`,
    `closed-by-owner*`, `seal-*`) sits at or after its reviewed commit.
  - **Modes.** Each module in scope gets one, written into the verdict's `reviewed.scope`:
    - **credited**: this exact fingerprint was in scope of a concluded round. It is not reviewed again.
    - **diff**: the module was in scope of a concluded round on other content. It is reviewed on its changes since the
      base, which is the reviewed commit of the newest such round. The reviewer also reads, in full, the unchanged code
      those changes depend on or that calls them, following imports and injection seams (the object model names them).
      A defect found there is a finding against the module whose code holds it.
    - **full**: the module was never concluded, or the owner asks (`--full`).
  - **Checks.** Mechanical checks run as declared every round, the full suite included. A judgement check that passed
    at the base is re-assessed only where the changes touch what it reads, and the reviewer says which checks it
    carried.
  - **A round of credited modules is not spent.** Nothing is spawned and no verdict is written.
  - **The backstop.** `seal.py check` fails its `full-review` step unless every module's final fingerprint had a FULL
    review in a concluded round. A first review is always full, so only modules last reviewed by diff come back.
  - **Observed** (the Frame Gate trial, MF-35, and its builder's reading of rounds 8-12 from git):
    - closed modules were re-reviewed end to end for a handful of changed files;
    - all three product defects K7 found sat in their round's diff;
    - DR-37 was completed by unchanged code that a diff-only review would have skipped. Hence the read-in rule, and
      the backstop.

---

# v0.7 amendments — RD-28

*Appended; everything above stands except where a line below says AMENDS. Adopted by the owner, 13 Oct 2026 (from the Frame Gate trial's finding F6 and the F1/F6 design, stage 2).*

- **RD-28 · The gates are receipts.** AMENDS RD-10, RD-27 and RD-9's owner close, for a repo that declares its
  PipelineGate store (`pipelinegate_command`). A repo that does not declare one keeps RD-27 as written.
  - **The store.** The repo keeps its own store, `.pipelinegate/`, its lines committed with the repo. The owner signs
    its catalog: `bootstrap`, then `battery_complete@1` (mechanical), `k7_verdict@1` (judged, pinned to the digest of
    the repo's K7 charter) and `owner_triage@1` (judged, pinned to the owner's principal).
    `tools/receipts.py setup --signer P` prints the commands. The executor never signs.
  - **Points.** Each module's content manifest (RD-27) is an artifact. Its line carries:
    - `battery`: the builder's battery record covers this content. Every mutation names its claim, was killed, and had
      its restore verified; a build-only kill has a test re-plant; an empty battery says why.
    - `k7`: the reviewer's verdict. It is pending when the round starts, and ACCEPT on a PASS.
    - `owner-triage`: the owner's close.
    - `full-review`: ACCEPT on a PASS of a FULL review, or on the owner's close of a round that reviewed the module in
      full.
  - **The battery before review is a refusal.** `k7-run.py` does not spawn the reviewer for content whose standing at
    `battery` is not ACCEPT.
  - **The reviewer's independence is enforced.** The engine refuses a decider who is the artifact's author
    (`AUTHOR_IS_JUDGE`), and a reviewer whose charter's digest is not the one the rubric pins
    (`DECIDER_NOT_IN_RUBRIC`). The runner learns this from the pending receipt, before any round is spent. Changing the
    charter is therefore a signed act: the owner admits a new rubric version.
  - **Credit and the backstop are read from standing,** on every call, never from the verdict files:
    - credited means ACCEPT at `k7` or `owner-triage`;
    - the seal's full-review step means ACCEPT at `full-review`.

    The verdict files still give each module its diff base.
  - **The owner's close is a receipt.** `tools/receipts.py owner-close --round N --person P` is run only on the
    owner's explicit, live word, with the principal the owner names. `gate.py` refuses the `closed-by-owner-N` tag
    until it exists for every module in round N's scope.
  - **A RETURN or HALT stays pending.** Its findings live in the verdict file. The sealed library's judged rubrics
    declare no outcome names, so a RETURN cannot be a receipt without a PipelineGate extension.
  - **Observed** (the sandbox, against the real engine):
    - a verdict file edited to claim credit for changed content was credited from the verdict files alone, and
      refused by the receipts;
    - the same forgery fooled a backstop read from the verdict file's mode, which is why `full-review` is a receipt;
    - an edited charter was refused before a round was spent.
