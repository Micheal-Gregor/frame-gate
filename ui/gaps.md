# Gap log

Engine gaps found while surfacing the library. The test: does the feature need the engine to
decide, record, or enforce something it doesn't already? If it only changes how something is
shown, it is not a gap — build it in the view.

A claim needs evidence, not absence of memory: name the interface-contract entries checked and
the compositions tried, and why each fails. States: `noticed` → `withdrawn` (it existed; name
the operation) or `shaped` → `ready`. An entry is `ready` when all three hold: no composition of
existing operations covers it; it came up in more than one walk, or it blocks a chosen job; the
owner agrees the shaped behaviour is the real need. Ready entries go to a Phase 1–4 extension
run, batched with related entries.

| ID | User job | Engine must decide / record / enforce | Walk it came from | Lookup evidence | State |
|---|---|---|---|---|---|
| G-01 | Mark ONE take FAIL while the rest of its set stays open (the Review Theater's FAIL button) | Record a per-take rejection, so the take counts as passed over without closing its sample | Simulate 1 walk, step 10: Rosa, Scene 3, cell 3.2, rejecting one still among six; Simulate 3: Rosa (a wrong file, "walk-A", counts against her stills), Tomás ("real or junk?"), Dev, Night Runner; Priya wants to flag take 2 off-model | Checked in the contract: `ObservationLedger.observe` (numeric components and ABSENT only - a verdict is not a score); `CommitmentLedger.commit` (accepts only); `Samples.samplesFor` closure (a commitment or a revision closes the WHOLE set); `DrawContextLog.label` (DRAW / REVISION resolves a draw, not a take's verdict); `PopulationPartition.of` (PassedOver derives from closed samples). No composition records a single take's rejection | noticed |
| G-02 | Leave a written note on a take for the person who approves ("take 2's jaw is wrong against the package") | Record free text against a candidate, with who wrote it | Simulate 2 walk, Priya (phone, cell 3.2, take 2), step 6; feedback round; Simulate 3: Priya (her review cannot reach Rosa), Tomás (notes for Rosa) | Checked: `ObservationLedger.observe` (numeric components and ABSENT only); `dischargeable` / `undischargeable` (why ONE component's score is absent - a discharge condition, not a note on the take); `CandidateLedger.appendCandidate` (a candidate is never updated); `DrawContextLog.label` (DRAW / REVISION only). No composition records free text on a candidate. Related: G-01 | noticed |
| G-03 | Know what the scene has cost and will cost in money, and hold a scene to a cap ("$5 for the whole scene") | Record a price per draw when a scope is authorized and the actual charge per draw; a cap spanning several cells | Simulate 2 walks: Dev steps 2 and 9, Rosa step 7, Sam step 8, Night Runner S-11; feedback round (Dev, Rosa and Sam asked for a number field and totals); Simulate 3: Rosa (a $5 cap, asked twice), Dev (spent / authorized per cell and scene), Sam, Night Runner (cost per draw) | Checked: Scope (OBJ-14) carries the estimate as given, text (R-80); `ScopeLedger.authorize` takes `estimate: string`; `Ratio.of` counts draws per currency, never summed; `ScopeGate.remaining` counts draws; every scope is one (unit, currency) - none spans cells. Summing typed estimates in the view would compute a figure the engine does not hold | shaped |
| G-04 | Two reviewers score the same take and both scores stand, each showing who gave it ("if my 0.3 wipes out Rosa's 0.64, that is the opposite of a second pair of eyes") | Keep observations per person in force side by side, and say whose the diagnostic reads | Simulate 2 feedback round, Priya; walks: Priya S-6, Dev S-10; Simulate 3: Priya (with a shared record her score would erase Rosa's, unnamed), Dev, Night Runner (who did what) | Checked: Observation (OBJ-15) "the latest is in force"; `ObservationLedger.observationOf` returns the latest (R-60); component authors are kinds (HUMAN / ENGINE), read by `authorOf` - no person; `Diagnostic.of` reads the observation in force. No composition keeps two persons' observations in force | shaped |
| G-05 | Only the owner approves and authorizes; a reviewer or a program cannot | Enforce who may commit, authorize and invalidate | Simulate 2 walk, Night Runner S-12; feedback round: Priya, Dev, Night Runner; Simulate 3: Dev (a shared record lets anyone authorize spend), Priya, Night Runner | Checked: `CommitmentLedger.commit`, `ScopeLedger.authorize`, `InvalidationLedger.invalidate` take the author HUMAN as a type (HOOK-07, R-11) - a kind, not a person; no operation takes a person or a role. The author kinds (OBJ-38, `src/ports`: ENGINE and DIRECTOR propose, HUMAN decides) are roles, not people, and establishing that a caller IS the author it claims is PC-02, a production concern carried from the seal. A screen can leave the buttons out (a layout choice); it cannot enforce it | shaped |
| G-06 | A program never records a draw against a prompt that is no longer the cell's current one | Refuse a draw whose condition is not the condition in force | Simulate 2 walk, Night Runner step 6; feedback round | Checked: `DrawContextLog.recordDraw` refusals (no-declaration; scope-exceeded; MOD-04's unreachable, R-84) - none compares the condition with `RevisionLog.conditionInForce`; `CandidateLedger.appendCandidate` refuses context-mismatch only against its own draw context. A caller can read `conditionInForce` first; nothing refuses the stale draw | noticed |
| G-07 | A shot with two characters, drawn from both their approved looks (two friends on one bench) | Record a take derived from more than one commitment, and follow every one for reachability and un-approval | Simulate 2 feedback round, Sam; Simulate 3: Sam (every shot of his film has both friends) | Checked: Candidate (OBJ-11) `from` is ONE commitment or BOTTOM; `CandidateProposal.from` is single; `InvalidationScope.of` closes over `from` as a single chain; `LineageReader.derivedFrom` walks one predecessor. No composition records two predecessors | noticed |
| G-08 | Close a draw that was held but never produced an image (a vendor failure), so the hold no longer reads as a missing take | Record a held draw's outcome as failed or refused | Simulate 3 feedback round: Night Runner, Rosa, Dev | Checked: `DrawContextLog.label` (resolutions DRAW / REVISION only); draws are charged by dispatch (R-78) and never released; `CandidateLedger.appendCandidate` binds one candidate per draw (context-spent). A held draw without a candidate is visible (draws vs. bound contexts) but cannot be closed with a reason | noticed |
| G-09 | Know who is on each missing piece and when it is due ("the 3.1 stills, the 3.3 pick, every clip") | Record an assignment and an expected date against a cell's next step | Simulate 3 walk, Tomás S-4; feedback: Tomás, Dev | Checked: no operation records a person (authors are kinds - HOOK-07) or a date (the record orders by height; no wall clock); `ScopeLedger.authorize` estimate is text. An app-side note per cell could hold it but would sit outside the record | noticed |

## Shaped detail

(For each `shaped` or `ready` entry: inputs, outputs, rules, and a worked example taken from the
simulation. Describe the need, not a class design — Phase 1 derives the component.)

### G-03 - money the engine holds (shaped, Simulate 3)

**The need.** A person can follow what a scene has cost and will cost, in money, and hold a scene to
a cap, without the app keeping a second money ledger beside the record. Today a scope carries its
estimate as given, as text (R-80), and nothing in the engine is a price or a charge.

**Inputs.** At authorization, a price per draw (an amount in a stated currency) alongside the
estimate as given, which stays as given. After a draw, optionally the actual charge reported by
whoever made it (a person or a runner). A cap: an amount over a set of cells (a scene).

**Outputs.** Per scope: the amount it authorizes (its ceiling at its price). Per cell and per scene:
charged so far, kept apart from priced-but-unreported draws and labelled which is which, and what
remains under the cap. Before a draw: whether it stays within the cap.

**Rules.** The estimate as given is never parsed or replaced. A reported charge never changes a
scope's draw count. A superseded scope's spend stays counted in the cell and scene totals.

**Worked example (Rosa, Scene 3, a $5 cap).** Mara: 3 stills authorized at $0.07, 2 drawn. 3.2:
6 stills at $0.07, all drawn; then 2 clips at $0.30, 1 drawn. 3.3: 4 stills at $0.07, 3 drawn; then
re-authorized 3 at $0.07 (the 1 left dropped), 1 drawn. Priced draws so far: 2 + 6 + 3 + 1 stills at
$0.07 and 1 clip at $0.30 = $1.14, so the board answers "$1.14 drawn (priced) · $3.86 left under the
$5 cap" - Dev's "spent ≈ / authorized ≈ per cell and for the scene" and Rosa's "add the numbers I
typed".

**Open for Phase 1.** Is the cap a gate (a draw refused past it, like scope-exceeded) or advisory?
Is the price fixed per scope or reported per draw? Whose charge stands if a runner and a person
both report one?

### G-04 - several reviewers' scores, each named (shaped, Simulate 3)

**The need.** Two people can score the same take and both scores stand, each showing who gave it;
a person's later score replaces only their own. Today the latest observation of a take is in force
(R-60), and its author is a kind (HUMAN / ENGINE), not a person.

**Inputs.** The person making each observation (a stable identity, not only HUMAN).

**Outputs.** Per take: the observation in force for each person. A statement of which observations
the diagnostic, and the bar's populations, read.

**Rules.** A person's new observation supersedes only that person's previous one. Identities are
stable across devices. The kind (HUMAN / ENGINE) stays recorded beside the person.

**Worked example (Priya, the train, cell 3.2).** Priya scores take 2 identity 0.30 with the note
"jaw too square against the reference" in mind (the note itself is G-02). Rosa's 0.64 stands. Rosa
opens 3.2 and reads "identity - Rosa 0.64 · Priya 0.30".

**Open for Phase 1.** Which observations feed the diagnostic: the owner's, each person's separately,
or an aggregate? Does a reviewer's score enter the bar's populations?

### G-05 - who may approve and authorize (shaped, Simulate 3)

**The need.** Only the people the project names may commit, authorize and invalidate; anyone else -
a reviewer, a producer, a program - is refused by the engine, not merely shown a different screen.
Today these acts take the author HUMAN as a type; no person or role is an input.

**Inputs.** The acting person on each HUMAN act (G-04's identity). The project's grants: who may
approve, who may authorize; a grant is itself a recorded act.

**Outputs.** The act, recorded with who did it; or a refusal naming the act and the reason ("not
permitted"), with nothing appended.

**Rules.** A program (ENGINE) is never permitted to commit or authorize (already true by type). A
grant or its withdrawal takes effect from its own height, like a declaration. Depends on G-04.

**Worked example (Scene 3 shared).** Dev's iPad shows the board; Authorize refuses him - "not
permitted: Rosa authorizes". Priya's Approve on take 2 is refused the same way. Night Runner can
record draws and takes only. Rosa approves and authorizes as today, and the record says it was her.

**Open for Phase 1.** Per-project or per-cell grants? Can a grant be delegated for a night?
