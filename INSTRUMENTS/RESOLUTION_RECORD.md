# R — Resolution Run Record · The Frame Gate

Live human gate, per-abstraction. RC-3 order: resolution RECORDED first, body filled second.

**No mid-round instruction changes.** Any change to gate rules, review scope, or K7's charter —
even one proposed in chat — takes effect only after it appears here with the owner's disposition.
Each entry below carries its owner disposition and date, and is in force from that date.

| Gate | Disposition (human decision, dated) | Operationalized as |
|---|---|---|
| R-01 reviewer execution permissions | **ACCEPTED 2026-09-10**; amended by R-05 | `reviewer_command` in `.metaframework/project.json` — allowlist of the three declared commands; `acceptEdits` dropped |
| R-02 tag-guard reachability | **ACCEPTED 2026-09-10** | `.githooks/reference-transaction`, activated per clone with `git config core.hooksPath .githooks` |
| R-03 move to MetaFramework 2.3.0 (roster v0.4, OS-1..OS-12) | **ACCEPTED 2026-10-11** (owner, in chat) | RD-9/RD-19 round cap governs from K7 round 4. Tools and config migrated in place once the round-4 gate closes; MOD-03 onward built under the Object Writing Standard |
| R-04 K7 round 4 triage (DR-05..DR-10) | **ACCEPTED 2026-10-11** (owner, live gate) | Fix now: DR-05, DR-06, DR-07, DR-09, DR-10. DR-08: claim withdrawn, SEAM-06 scope registered. Round 4 void for cap accounting; one re-run |
| R-05 reviewer shell tool on Windows (amends R-01) | **ACCEPTED 2026-10-11** (owner, live gate, as DR-05 fix now) | Agent `tools:` and `reviewer_command` allowlist name PowerShell alongside Bash, for the same three declared commands |
| R-06 K7 round 5 triage; gate closed | **ACCEPTED 2026-10-12** (owner, live gate) | Gate closes as `closed-by-owner-5` (tag placed by the owner, R-02). Fix now: DR-12, DR-13, WI-01; DR-11, DR-14, DR-15 decidable parts, limits registered |
| R-07 reviewer scratch worktree (amends R-05) | **ACCEPTED 2026-10-12** (owner, live gate), **subject to probe** | Runner-owned gitignored worktree `.k7/wt`; reviewer Write/Edit scoped to `.k7/**`; `k7-run.py` refuses, not warns, a verdict that leaves the real tree dirty |
| R-08 MOD-03 opens with MOD-01 at drift 5 | **ACCEPTED 2026-10-12** (owner, live gate) | Explicit owner lift of the teeth rule, effective when the R-06 fix-now items are committed with their battery. MOD-03's first K7 gate reviews everything, these fixes included |
| R-09 what "height arithmetic" means (BC-01-5, DR-14) | **ACCEPTED 2026-10-12** (owner, in chat) | Height in, plain number out: arithmetic. Height in, height out: arithmetic unless every return hands back one of the callable's own height parameters unchanged. Ordering (-1/0/1), boolean and other results are not arithmetic |
| R-10 ODG-FG-06 "independent unit" | **ACCEPTED 2026-10-12** (owner, live gate) | HUMAN-declared: an appended, never-inferred act, read as of a height; no act in force → `NoSubject` → not licensed. Owned by MOD-03; F-route proposal SP-2 |
| R-11 HOOK-07 enforcement shape | **ACCEPTED 2026-10-12** (owner, live gate) | `Declaration` is a nominal type only `declare()` can mint (REF-01 at parse); `declare()` takes only the narrowed `"HUMAN"` author. Limit registered: a holder of a HUMAN author calling `declare()` is not caught at parse (PC-02, K7) |
| R-12 DR-18: INV-PROV at the catalog's read seam | **ACCEPTED 2026-10-12** (owner, live gate) | Decide statically what is decidable: no code outside `src/catalog` builds or appends a catalog-kind entry (resolved by type), and reads ignore entries at unconfigured levels. The runtime residue is a registered limit discharged by PC-02's port-layer identity binding |
| R-13 who reviews round 7 | **ACCEPTED 2026-10-12** (owner, live gate) | MOD-03's re-check (round 7) runs on **Fable 5.1** (`--model claude-fable-5-1`), a reviewer that did not prescribe the R-06 closures, with scope covering them as well (RD-6) |
| R-14 K7 round 7 triage; MOD-03's gate closed | **ACCEPTED 2026-10-12** (owner, live gate) | Gate closes as `closed-by-owner-7` (tag placed by the owner). Fix now: DR-24; DR-23 and DR-25 (decidable parts; array/property covariance registered); WI-02..WI-05; DR-26 (truthful limits, every limit pinned) |
| R-15 detector reach is governed by a stated scope | **ACCEPTED 2026-10-12** (owner, live gate) | Each detector states the forms it decides and the limits it registers, each pinned by a fixture. K7 scores a detector against that statement; an evasion outside it is triaged as a known issue unless the owner promotes it |
| R-16 MOD-04 opens with MOD-03 at drift 5 | **ACCEPTED 2026-10-12** (owner, live gate) | Explicit owner lift of the teeth rule, effective when the R-14 fix-now items are committed with their battery |
| R-17 the next module is MOD-05, not MOD-04 (supersedes R-16's wording) | **ACCEPTED 2026-10-12** (owner, live gate) | S3 §10 mandates MOD-05 `facts/` before MOD-04 `reachability/` (MOD-04 hard-depends on MOD-05's effective-commitment fold). R-16's lift applies to MOD-05 as the next module; MOD-04 follows it against the real fold |

---

## R-01 · The reviewer is ordered to execute and is not permitted to

**The problem.** K7's charter requires execution, in three places:

- CC-4: "**run the declared full suite yourself**"
- CC-5: "**run** the declared re-derive-all command"
- CC-6: "in a /tmp copy, delete the guarded calls… named tests MUST fail, **invoked by the declared
  single-test command**"

Its tool grant is `Read, Grep, Glob, Bash`. But the runner invokes it as:

    claude -p --agent k7-reviewer --output-format text --permission-mode acceptEdits

`acceptEdits` auto-approves **file edits** — which K7 is forbidden to make — and leaves Bash
commands requiring an approval that, under `-p`, no human is present to give. So every command is
denied. The reviewer reported this plainly both rounds: *"npx, node-run-script, tsc and vitest are
all denied ('requires approval'); only '--version' probes pass."*

**We handed it the one permission it must never use and withheld the one its charter requires.**

**What it has cost so far.** Two rounds, zero commands executed. CC-4 and CC-6 were resolved by
reading the builder's records. Round 2 deducted 1 point for exactly this and passed at 7 — one point
above the blocking threshold. **The gate has never independently verified that the test suite is
green or that the mutation battery kills anything.**

**What it will cost.** MOD-04 is the first vector-bearing module, and a golden vector is defined as
"computed from the reference implementation, never hand-written." A gate that cannot execute cannot
distinguish a computed vector from a transcribed one, which is the single thing CT-5 exists to
detect. `--rederive` becomes ceremony.

**Proposed.** Drop `acceptEdits`. Add an allowlist of exactly the declared commands and nothing else:

    claude -p --agent k7-reviewer --output-format text \
      --allowedTools "Bash(npx tsc:*)" "Bash(npx vitest:*)" "Bash(python3 tools/rederive.py:*)"

**What this grants, stated plainly.** Execution rights on the owner's machine to an adversarial
process, scoped to three command prefixes. It does **not** widen the agent's tool grant — `Bash` is
already in its charter — it stops silently denying what the charter already assigned. Dropping
`acceptEdits` is a *narrowing*: a reviewer that can edit can quietly become a builder.

**Before adoption:** the `--allowedTools` syntax must be confirmed against the installed CLI with
`tools/k7-run.py --dry-run`. An unverified flag would fail open into the same silent denial.

**If declined:** CC-4, CC-5 and CC-6 are permanently `reasoned, not measured`. That is a defensible
position, but it must then be stated in every verdict rather than discovered per round, and the
completion ledger should say that no module in this build has had its suite independently run.

---

## R-02 · The tag guard cannot reach the person who does the tagging

**The problem.** `tools/gate.py` enforces tag integrity, and its own docstring is explicit:

> `git tag k7-pass-N` without a PASS verdict N whose `reviewed.tree_sha` equals the tree being
> tagged. **Tags become evidence, not assertion.**

It is installed as a `PreToolUse` hook, so it fires only for commands **Claude** runs. The workflow
assigns tagging to the human, at a terminal, where the hook does not exist.

**Demonstrated, not hypothesised.** On 2026-09-10 `k7-pass-2` was created at commit `5316158`
(tree `ba2f49a`) while verdict 2 records reviewing commit `538c892` (tree `350a2b5`). Nothing
objected. The difference was only the verdict file itself — harmless in substance, and precisely the
reasoning that erodes the guarantee. The rule exists so nobody has to make that judgment.

**A structural point worth recording.** A reviewed commit can *never* contain its own verdict:
committing the verdict changes the tree. So the correct discipline is **the tag marks the reviewed
commit; the verdict lands in a later commit.**

**Options considered.**

| Option | Enforces for humans | Travels with a clone |
|---|---|---|
| `.git/hooks/` | yes | **no** — confirmed: this clone received only samples |
| `tools/tag.py` wrapper | no — discipline only | yes |
| **`core.hooksPath` + versioned `.githooks/`** | **yes** | **yes**, plus one activation line per clone |

**Proposed: the third.** A versioned `.githooks/reference-transaction` hook, activated per clone
with `git config core.hooksPath .githooks`, added as a documented clone step.

**Tested before proposing.** In a throwaway repo:

- ordinary tag → allowed
- `k7-pass-N` with no verdict → **blocked**, `fatal: ref updates aborted by hook`
- `k7-pass-N` on a tree the verdict did not review → **blocked**, error naming both trees
- `k7-pass-N` on the reviewed commit → allowed

**Cost.** One `git config` line per clone. If someone skips it, the guard is silently absent — which
is the same failure mode as today, so the change cannot make things worse, only better when applied.
`gate.py` is unchanged and stays; this is additive, covering the path `gate.py` cannot see.

**Consequential correction, pending R-02's disposition.** `k7-pass-2` currently points at an
unreviewed tree and should be moved to `538c892`:

    git tag -f k7-pass-2 538c892
    git push origin -f --tags

This is a correction to a mis-set tag, not a rule change, and does not itself require a resolution —
but it is recorded here because it is the evidence that motivated R-02.


---

## Implementation record — 2026-09-10

**R-01** applied to `.metaframework/project.json`. **One obligation remains and is the owner's:**
confirm `--allowedTools` is recognised by the installed CLI (`tools/k7-run.py --dry-run`). An
unrecognised flag fails open into the same silent denial it was written to remove, and that failure
would look exactly like success.

**R-02** applied as `.githooks/reference-transaction`, exercised against this repository's real
state before commit:

| Case | Result |
|---|---|
| ordinary tag | allowed |
| `k7-pass-9`, no verdict | **blocked** — names the missing file |
| `k7-pass-2` on HEAD (tree K7 did not review) | **blocked** — names both trees |
| `k7-pass-2` on `538c892` (the reviewed commit) | allowed |

`k7-pass-2` was moved from `5316158` to `538c892`, so it now points at tree `350a2b5` — the tree
verdict 2 records reviewing. The tag is evidence again rather than assertion.

**Activation is per clone and cannot self-install**, because `.git/` is not versioned:

    git config core.hooksPath .githooks

Recorded in `CLAUDE.md`. If someone skips it the guard is silently absent — which is exactly today's
situation, so the change cannot make matters worse, only better wherever it is applied.

---

## R-03 · Move to MetaFramework 2.3.0 mid-build

**Owner instruction, 2026-10-11, in chat:** "Run stage 4 using the latest step 4 directions — it
will prevent some sub-par code issues, and provides a class object library to support." The owner
also stated that the move is a deliberate trial of the framework. Framework defects found along the
way are logged with the framework, not in this repo's instruments.

**What takes effect, and when.**

- **From K7 round 4:** RD-9 as restated by RD-19 replaces this repo's "rounds are unbounded;
  no-progress halts". The rule is PASS, or one fix round plus one re-check, then owner triage.
- **After the round-4 gate closes:** the README's in-place migration. That covers the template
  tools, `governance/contracts/`, roster v0.4 and the new `project.json` keys. The migration is
  ordered after the close because the README requires the last gate to be closed first.
- **From MOD-03:** every class is written to OS-1..OS-12 (RD-22..RD-24).

**Open, for a later ruling.** RD-24 says the standard "applies to classes written after the change;
it does not reopen sealed files". MOD-01 and MOD-02 were written before the change but are not
sealed. Whether the seal's declaration comparison applies to them is not decided here.

---

## R-04 · K7 round 4 triage

Round 4 returned RETURN, drift 5 (`k7-verdict-4.json`, reviewed `4b6a37e`), the second non-PASS
after one fix round, so the cap was reached. Dispositions, owner, live gate, 2026-10-11:

| Item | Disposition |
|---|---|
| DR-05 reviewer has no shell on this host | **Fix now**, as R-05 |
| DR-06 membership-predicate and height-arithmetic detectors cover one declaration form | **Fix now**: every export form; types resolved through aliases, not text-matched |
| DR-07 spawn detector matches names as text; `rederive.py` launches `npx` by name | **Fix now** |
| DR-08 "no subclass can introduce a mutator" | **Claim withdrawn.** A TypeScript interface cannot bind an implementer or an extending interface. SEAM-06's actual enforcement scope is registered as an interpretation |
| DR-09 BC-01-3/4 accept any diagnostic | **Fix now**: pin the specific diagnostic each fixture exists to produce |
| DR-10 tautological assertion in `reported-path.test.ts` | **Fix now** |

**Round 4 is void for cap accounting.** The reviewer could not execute any declared command (DR-05),
so round 4 is not counted as the re-check RD-9 allows. After the fix-now items, K7 runs once more
with a working shell. **If that round is not PASS, owner triage closes the gate, as
`closed-by-owner-5`, and no further rounds run.** Round 4's findings stand as findings; only its
place in the count is voided.

Note: the runner (2.3.0 `k7-run.py`, once migrated) counts every non-PASS verdict and would refuse
round 5. Round 5 is therefore launched with this repo's current runner, before migration, under
this ruling.

---

## R-05 · The reviewer's shell is named after one host (amends R-01)

**Found 2026-10-11 (builder probe after round 4).** Under `claude -p` on the Windows gate host,
Claude Code 2.1.296 exposes `PowerShell` and no tool named `Bash`. R-01's allowlist and the agent's
`tools:` line name `Bash` only, so both granted nothing. The reviewer held Read, Grep and Glob, and
still returned a verdict. Round 3 executed because the CLI then still exposed Bash.

**Ruling.** Name both shells. In the agent `tools:` line and in the allowlist, use the same three
declared command prefixes for each shell. The grant is not widened: it is the same commands under
the second shell's name.

**Before adoption, as with R-01:** confirm with a live probe that the reviewer process (a) lists a
shell tool, (b) can run a declared command, and (c) is refused an undeclared one. An unverified
grant fails open into a read-only review that still scores.

**Recorded, not changed.** The allowlist does not admit the copy/edit commands a CC-6 mutation
experiment needs ("copy to a throwaway /tmp directory"). That is why round 3's CC-6 was also
non-mechanical. Changing it would widen the reviewer's grant, so it needs its own ruling.

---

## Implementation record — 2026-10-11

**R-05** applied. `.claude/agents/k7-reviewer.md` now has `tools: Read, Grep, Glob, Bash, PowerShell`.
`reviewer_command` adds `PowerShell(npx tsc:*)`, `PowerShell(npx vitest:*)` and
`PowerShell(python3 tools/rederive.py:*)` beside the three `Bash(...)` entries. The adoption probe
used `reviewer_command` from `project.json`, launched through Python `subprocess` with
`k7-run.py`'s environment:

| Check | Result |
|---|---|
| (a) shell tool listed | **yes**: `Read, Grep, Glob, PowerShell` (no `Bash` on this host) |
| (b) declared command runs | **yes**: `npx tsc --version` → `Version 5.9.3`; `npx vitest --version` → `vitest/2.1.9 win32-x64 node-v24.16.0` |
| (c) undeclared write refused | **yes**: `New-Item` on a file inside the repo and in `%TEMP%` both blocked; no file created |
| undeclared read-only command | **ran**: `whoami` was auto-approved by the CLI's read-only rule. Not a write path; recorded so it is not mistaken for a grant |

**Two things the round-5 reviewer will meet, recorded so they are not discovered as defects:**

- The host shell is Windows PowerShell 5.1, which has no `&&`. The declared `test_command` runs as
  its two declared commands in sequence.
- The reviewer reported that the PowerShell tool does not display an exit code. A failing command
  reports an error, so the exit status is observable but not printed.

The k7-run launch still needs `~/.local/bin` on `PATH` on this host. That is an environment binding,
not a repo change: the npm `claude` shim here is broken, and Python cannot spawn a `.cmd` by name.

---

## R-06 · K7 round 5 triage, and the gate's close

Round 5 returned RETURN, drift 5 (`k7-verdict-5.json`, reviewed `e0dd0cc`). It was the last round
under R-04, so this triage closes the gate. **Closed gates stay closed (RD-11):** what follows
is new work, reviewed at the next gate, never a round 6 here.

| Item | Disposition |
|---|---|
| DR-11 membership from SHAPE wider than the brand | **Fix the decidable part:** structural Projection shapes (a `compute(at: RecordHeight)` member) as well as the brand; members at any depth; callables returned by exported factories. **Register the limit:** a plain `boolean` function that tests shape is indistinguishable, to any checker, from any other boolean function |
| DR-12 BC-01-3 pins `payload` only | **Fix now:** every `AppendedFact` member discovered from source must refuse assignment with TS2540 |
| DR-13 `isUnknown` tested on 2 of 5 kinds | **Fix now:** checked against every kind discovered from the `UnknownValue` declaration |
| DR-14 height arithmetic wider than two-in, one-out | **Fix the decidable part:** restate BC-01-5's prohibition so it separates from ordering, then detect every form K7 named (delta, offset, successor, rest fold) with `order` still green. Register what remains undecidable |
| DR-15 spawn forms | **Fix the decidable part:** `shell: true` refused whatever the command; `.call` / `.apply` / `Reflect.apply`; asyncio launchers; a module rebound to a local name |
| DR-16 reviewer cannot stage mutations | **R-07** |
| WI-01 MOD-02 isolation sweep (`.ts` only; ImportEquals) | **Fix now,** as a new work item against MOD-02. The `k7-pass-2` gate is not reopened |

**The close.** The owner places `closed-by-owner-5` on the commit that records this ruling.
Under 2.3.0's `k7-run.py` that tag also ends the non-PASS streak (rounds 4–5), so MOD-03's first
round is not refused.

---

## R-07 · The reviewer may mutate a throwaway worktree (amends R-05)

**Why.** CC-6 orders mutation experiments. R-05's grant refuses every write, so for three rounds
the gate has read the builder's battery instead of reproducing it.

**Ruling.**

- `tools/k7-run.py` creates a detached worktree of the reviewed commit at `.k7/wt`
  (gitignored), names it in the prompt, and removes it after the round. `node_modules` resolves
  from the repo above it, so the declared commands run against the copy with `--root .k7/wt` or
  `-p .k7/wt`.
- The reviewer gains `Write` and `Edit` scoped to `.k7/**`, and nothing else.
- **`k7-run.py` refuses a verdict that leaves the real tree dirty.** Today it warns and still
  writes the verdict, which, once the reviewer can write, would let an edit persist with only a
  warning.

**Before adoption, as with R-01 and R-05:** a live probe must show that the reviewer (a) can
write inside `.k7/wt`, (b) is refused a write to the real tree, and (c) can run a declared
command against the copy and see a planted mutation fail.

---

## R-08 · MOD-03 opens with MOD-01 at drift 5

The teeth rule blocks new work on a module scoring < 7 until a fresh score or an explicit owner
lift. **Lifted, explicitly, by the owner,** effective once the R-06 fix-now items are committed
with their mutation battery. The fresh score comes from MOD-03's first gate, which reviews the
whole tree.

---

## Implementation record — 2026-10-12 (R-07)

**R-07 applied and probed live before adoption.** `tools/k7-run.py` creates `.k7/wt`, a detached
worktree of the reviewed commit, before the reviewer starts, and removes it in a `finally`. The
prompt names the path and the two declared commands pointed at it. A verdict that leaves the
repository dirty is now **refused**, with the raw output kept as `k7-raw-N.json`; it used to be
written with a warning. The agent's tools add `Write, Edit`, and `reviewer_command` adds
`Write(.k7/**)` and `Edit(.k7/**)`. `.k7/` is gitignored.

| Check | Result |
|---|---|
| (a) write inside `.k7/wt` | **yes**: `probe-inside.txt` created |
| (b) write to the real repository refused | **yes**: `probe-outside.txt` at the repo root was not created |
| (c) a mutation run against the copy | **yes**: the reviewer appended a membership predicate to `.k7/wt/src/kernel/index.ts`, ran `npx vitest run --root .k7/wt -t "test_kernel_exports_no_projection_membership_predicate"`, and reported it FAILED (1 failed, 32 skipped). The builder's own run of the same command agrees |

The reviewer also reported that an undeclared exit-code echo was refused before it ran. The
allowlist still admits only the declared commands. CC-6's mutation experiments can now be run by
the gate rather than read from the builder's record.

---

## Implementation record — 2026-10-12 (tags, placed by the owner)

- **R-02's consequential correction is now true in this clone.** The 2026-09-10 record says
  `k7-pass-2` was moved to `538c892`, but that move never reached this clone or `origin`: both
  still had `5316158` on 2026-10-11. The owner moved it at a terminal, through the active tag
  guard. `k7-pass-2` → `538c892`, tree `350a2b5`, which is the tree verdict 2 records reviewing.
  `phase4-checks tags` passes for the first time since this was found. **Not yet pushed:**
  `origin` still has the old position.
- **`closed-by-owner-5`** placed by the owner on `5ca4355`, the commit recording R-06. Verdicts 4
  (`4b6a37e`) and 5 (`e0dd0cc`) both reviewed ancestors of it, so the gate is closed under
  RD-11, and under 2.3.0's round cap the non-PASS streak ends here.

---

## R-09 · What counts as height arithmetic (BC-01-5; DR-14)

**Owner, 2026-10-12, in chat:** "latest is not arithmetic, flag asNumber."

K7 round 5 showed that "two heights in, a height out" misses a delta, an offset, a successor and
a fold, and that `order` and a delta share a signature, so the line must be drawn on what comes
back. The owner drew it:

- **A height in, a plain `number` out, is arithmetic.** This covers a delta (`a - b`) and also
  a bare unwrap (`asNumber(h)`), because a height's value leaving the type is how arithmetic gets
  done outside the kernel.
- **A height in, a height out, is arithmetic unless it is a SELECTION.** A selection is a
  callable whose every return hands back one of its own height parameters unchanged, as in
  `latest(a, b)`. A successor, an offset, a fold or a sum manufactures a new height, which is
  arithmetic.
- **Not arithmetic:** an ordering (`-1 | 0 | 1`), a boolean, any other result type, and any
  callable that takes no height at all (the constructor `height(n: number)`).

Signatures cannot separate `latest` from `sum`, which have identical types, so the selection test
reads the body: every return expression must resolve (by symbol) to one of the declaration's own
height parameters, directly or through a conditional or `??`/`||`/`&&` whose operands all do. A
body the test cannot read, such as an overload signature or an interface member, is not a
selection, so a height-returning callable without a readable body is flagged. That bias is
conservative and is registered.

---

## Implementation record — 2026-10-12 (R-03: migrated in place to MetaFramework 2.3.0)

Applied after the round-5 gate closed (`closed-by-owner-5`), as the README requires, and after a
clean rehearsal on a scratch clone. **Copy where the repo never changed the file; port where it
did** (trial finding MF-16; the README's two instructions disagree on this).

- **Ported:** `tools/k7-run.py`, the 2.3.0 template (round cap, seal guards, the Phase-5 refusal)
  with this repo's rulings re-applied: IR-22, R-07, the deduction wording, and raw-output
  preservation. The port also **fixes a latent bug in the old copy**: its schema-failure branch
  used `{path}` after the line defining it had been removed, so the first non-conforming verdict
  would have crashed the runner instead of reporting.
- **Copied (no local rulings):** `state.py` (it now recognises `closed-by-owner-*`; STATE reads
  `last_gate_tag: closed-by-owner-5`), `gate.py`, `phase4-checks.py`, `emission-check.py`,
  `seal.py` and `new-object.py` (new). `rederive.py` is kept: it carries IR-26.
- **Governance:** roster v0.4 and `Object_Writing_Standard.md` copied in. The README never lists
  the latter, but the manifest pins it and RD-22 names it. `governance/contracts/` added;
  `Phase5_Utilization_Roster.md` and `utilization/` removed (RD-20); `ui/README.md` added;
  `roster-manifest.json` regenerated over the two pinned copies.
- **Config:** `project.json` gains `sealed_globs`, `ui_root`, `ui_render_command`,
  `object_standard` and `isolation_test_command` (`npx vitest run .isolation.test`), and
  `scaffold_exempt` follows the governance change. `doc-roles.json` adds `ui/**/*.md` to
  ledgers. The settings matcher adds `PowerShell` (GOV-1).
- **Object model:** `Declared inputs (OS-1)` and `Decides` columns added. MOD-01/MOD-02: "n/a, no
  class" and "NO", with reasons. Unbuilt modules are set at build.
- **CLAUDE.md:** the v0.2 process contract ("rounds are unbounded", `utilization/`, the Phase 5
  roster) is replaced by `governance/contracts/phase4-contract.md` plus a short local section.
  159 lines.

**Verified on the migrated tree:**

- **`phase4-checks`, all six checks:** pass, except the 11 known `module_file_absent` rows for
  unbuilt modules. `tags` and `rosters` now pass.
- **`structure-check`:** pass.
- **`emission-check`:** conforms. It notes that the S3 predates the binding rule, so OS-3 at the
  seam is unchecked for this S3.
- **Suite:** `tsc` clean, 37/37.
- **`k7-run.py --dry-run`:** the 2.3.0 round cap admits the next round, and IR-22 names the
  dirty file.
- **`gate.py`, fed hook payloads directly:**
  - denies frozen-S3 writes through Write, Bash and PowerShell;
  - denies an OS-2 `Date.now()` in a class, with the fix in the message;
  - denies a hand-made `seal-*` tag;
  - allows an ordinary write.

**Note:** this builder session is rooted one folder above the repo, so the repo's hooks do not
guard it (MF-08). The gate was exercised directly instead. Sessions started in the repo get it
automatically.

---

## R-10 · ODG-FG-06: "independent unit" is a human declaration

**Owner, 2026-10-12, live gate.** OBJ-11 permits `from = BOTTOM` only for the least currency of an
*independent* unit (F2 O-8). No object defined the predicate, and the S3 assigned it to MOD-03.

**Ruling.** Independence is **declared by a HUMAN, appended, and read as of a height**, under the
same INV-PROV discipline as classification: never derived, never inferred, and never a field on a
Unit.

- MOD-03 gains `declare_independence(unit, independent, author)`, an appended act. `independent`
  is a boolean so that a later act can withdraw the license. It is HOOK-07-guarded like
  `declare`.
- MOD-03 gains `independence_at(unit, height)`, which returns the act in force at that height,
  or `NoSubject` when none has been made.
- **No act in force means not licensed.** MOD-05 refuses a `from = BOTTOM` draw unless
  `independence_at` returns an act asserting independence.
- `NoSubject` follows the sibling modules' precedent for "none has been declared":
  `condition_in_force` (F3), `observation_of` (F3), `governing_scope` (F5). The same member is
  used for `declaration_at` with no declaration in force (IR-29).

**Upstream.** The S3 interface for MOD-03 does not list these two operations, so they are a
registered interpretation linked to ODG-FG-06 (RD-4), and SP-2 proposes adding them to the
Phase 3 S3. `governance/S3/` is not patched.

---

## R-11 · HOOK-07: how much of "no derivation in the call chain" is enforced at parse

**Owner, 2026-10-12, live gate.** HOOK-07's condition is "author is HUMAN **and** no derivation is in
the call chain", with BLOCK "fail at parse". TypeScript can constrain types but not call chains.

**Ruling.**

- **REF-01, enforced at parse.** `Declaration` (and the independence act) is a nominal type
  carrying a brand that only MOD-03's `declare` / `declare_independence` can mint. Any other
  definition that produces one cannot compile.
- **The author half of HOOK-07, enforced at parse.** `declare` accepts only the narrowed
  `"HUMAN"` member of OBJ-38 `Author`. Passing `ENGINE` or `DIRECTOR` cannot compile, and a
  caller holding a plain `Author` must narrow it through ports' `mayDecide`.
- **Registered limit (IR-30).** A function that already holds a narrowed `"HUMAN"` and calls
  `declare` with a level it computed is not detectable at parse. That half rests on PC-02 (who
  may act as HUMAN is bound at the port layer, a deployment fact) and on K7 review. A capability
  token minted at a human-input boundary would close it, at the price of a new work item against
  the closed MOD-02 slice; the owner declined that for now.

---

## R-12 · DR-18: what the catalog's read seam can and cannot guarantee

**Owner, 2026-10-12, live gate.** K7 round 6 (E3) showed `declarationAt` / `independenceAt`
certifying any shared-record entry whose `author` string is `"HUMAN"`. Every module holds the same
`RecordPort<unknown>`, so any of them can append one as a plain literal.

**Ruling: fix what is decidable now, and register the rest against PC-02.**

- **Static, at parse/build.** No source outside `src/catalog/` may construct an object whose TYPE
  carries a catalog kind (`"declaration"`, `"independence"`), directly, through a const, or by
  spreading. No `append` call outside `src/catalog/` may take an argument whose type carries one,
  which would be a replay of a genuine entry. Decided by the type checker, with positive-control
  fixtures.
- **At read.** An entry whose level is not in the ledger's `levels()` cannot have come from
  `declare()`, which refuses it, so it is not certified.
- **Registered limit.** An entry built with a dynamically computed kind (typed `string`), one built
  from `any`, or one appended by a module the deployment wires to the raw record, is still read
  as a catalog act. The guarantee then rests on PC-02: who may append as whom is an identity
  binding at the port layer. Port-level provenance was offered and declined for now, because it
  changes the closed MOD-02 contract ahead of the deployment decision.

---

## R-13 · Round 7 runs on a different model, and certifies the R-06 closures

**Owner, 2026-10-12, live gate.** K7 round 6 declined to certify the R-06 closures (DR-11..DR-15,
WI-01) because K7 round 5 prescribed their shapes: "a reviewer cannot certify a closure whose
shape it specified". Rounds 5 and 6 both ran on `claude-opus-5-5`, the CLI default and also the
builder's model.

**Ruling.** MOD-03's re-check, round 7, runs on **`claude-fable-5-1`**, under RD-6's "a different
model … for load-bearing modules". Its scope is the whole tree, which already includes the R-06
closures, so one run re-checks MOD-03 and falsifies or certifies R-06. The model was probed
before adoption: `claude -p --model claude-fable-5-1` answered, and `modelUsage` named only
`claude-fable-5-1`. The flag is added to `reviewer_command` for round 7. **Later rounds' model is
a separate decision**, recorded when it is made.

---

## Implementation record — 2026-10-12 (R-13)

`reviewer_command` gains `--model claude-fable-5-1`, probed before adoption (the CLI answered and
`modelUsage` named only `claude-fable-5-1`). It applies from K7 round 7. Whether later rounds keep
it is a separate ruling, still to be made.

---

## R-14 · K7 round 7 triage, and MOD-03's gate closes

Round 7 (`k7-verdict-7.json`, Fable 5.1, reviewed `4c4ef5a`) was MOD-03's re-check: RETURN, drift
5. The cap is reached, so this triage closes the gate. **Closed gates stay closed:** what follows
is new work, reviewed at MOD-04's gate.

| Item | Disposition |
|---|---|
| DR-24 forge decides `kind` by node text (RD-13) | **Fix now.** The key is decided by its resolved property name (quoted, computed, class field), with a fixture per form. IR-38 restated |
| DR-23 mint escapes | **Fix the decidable part:** every overload signature's declared return; no hand-written ambient declarations (`.d.ts`, `declare`) in `src/`. **Registered:** array / property covariance, a hole in TypeScript's own type system, pinned by a `limit-` fixture |
| DR-25 surface escapes | **Fix:** reads followed through catalog-internal wrappers to a fixed point; the "HUMAN" admission requires an actual append; `held` judges the field TYPE's writability |
| DR-26 limit registers | **Fix:** every register entry states its true scope and limits, and every limit has a `limit-` fixture (SC-3 included) |
| WI-02 composite height forms; WI-03 optional-parameter shape; WI-04 `.cts/.tsx/.jsx` and Python `import *`; WI-05 template-literal import specifier | **Fix all now**, as new work items against their closed slices |

**The close.** The owner places `closed-by-owner-7` on the commit that records this ruling.

---

## R-15 · Detector reach is governed by a stated scope (from MOD-04 on)

**Why.** Rounds 4–7 each widened the static detectors and each found the next ring of evasions:
one declaration form, then aliases, then shapes and depth, then overloads, `.d.ts` files,
covariance and quoted keys. Part of that ring is TypeScript's own unsoundness, which no checker
over TypeScript can close. RD-19 names the shape: "a loop of ever-smaller fixes never trips the
no-progress halt".

**Ruling.**

- **Every load-bearing detector carries a SCOPE STATEMENT** in its header. It lists the forms the
  detector decides, by rule rather than by example, and the limits it registers. Each decided
  form has a positive fixture, and each registered limit has a `limit-` fixture that the detector
  must NOT flag. A limit that is quietly closed later turns its fixture red and must be
  re-registered as covered.
- **K7 scores a detector against its statement.** An evasion that falls inside a stated "decides"
  rule is a defect of the detector, as before. An evasion of a form the statement does not claim
  is reported, and triaged by default as a **known issue**, unless the owner promotes it to the
  next fix round. A statement that claims a form it does not decide, or omits a limit it has, is a
  CC-3 defect (DR-26's shape).
- **Operationalized:** the k7-run prompt and the reviewer charter state this rule. Effective from
  K7's next round, MOD-04's gate.

---

## R-16 · MOD-04 opens with MOD-03 at drift 5

The teeth rule blocks new work on a module scoring under 7 until a fresh score or an explicit
owner lift. **Lifted, explicitly, by the owner** (the R-15 choice: "MOD-04 opens on your lift"),
effective once the R-14 fix-now items are committed with their mutation battery. MOD-04's first
gate reviews the whole tree.

---

## R-17 · The next module is MOD-05 (supersedes R-16's wording)

**Owner, 2026-10-12, live gate.** R-16 lifted the teeth rule so that "MOD-04" could open. That
name was the builder's error: S3 §10 mandates the order catalog → **facts** → reachability, and
F2 records a hard MOD-04 → MOD-05 dependency (`effective_commitment(u, c')` or BOTTOM; C0 seam
Q-1). R-16 is left as written. **The lift applies to MOD-05, the next module in the mandated
order**, and MOD-04 follows it, built against the real fold rather than a stub.
