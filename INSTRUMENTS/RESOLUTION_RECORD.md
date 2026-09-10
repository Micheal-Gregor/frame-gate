# R — Resolution Run Record · The Frame Gate

Live human gate, per-abstraction. RC-3 order: resolution RECORDED first, body filled second.

**No mid-round instruction changes.** Any change to gate rules, review scope, or K7's charter —
even one proposed in chat — takes effect only after it appears here with the owner's disposition.
Both entries below are **PROPOSED** and are not in force.

| Gate | Disposition (human decision, dated) | Operationalized as |
|---|---|---|
| R-01 reviewer execution permissions | **PROPOSED — awaiting owner** | `reviewer_command` in `.metaframework/project.json` |
| R-02 tag-guard reachability | **PROPOSED — awaiting owner** | `.githooks/reference-transaction` + `core.hooksPath` |

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
