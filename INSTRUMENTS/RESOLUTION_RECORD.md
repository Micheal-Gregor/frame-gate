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
| R-18 O-5 / O-6: MOD-04 ↔ MOD-05 and MOD-05 ↔ MOD-12 cycles | **ACCEPTED 2026-10-12** (owner, live gate) | Broken by INJECTION: MOD-05 receives MOD-04's admission and MOD-12's signature check as constructor-declared deciders (OS-1, OS-3); MOD-04 later receives MOD-05's fold the same way; a composition root wires them (OS-11). No module imports another's decider |
| R-19 supersession before MOD-12 exists | **ACCEPTED 2026-10-12** (owner, live gate) | The effective-commitment fold takes a declared invalidation reader ("was this commitment invalidated as of h?"); MOD-12 supplies it; nothing of MOD-12's fact shape is defined in MOD-05 |
| R-20 two effective commitments for one (unit, currency) | **ACCEPTED 2026-10-12** (owner, live gate) | The fold answers `uncomputable("two-effective-commitments")` — neither a commitment nor BOTTOM — so reachability refuses rather than guesses; prevention at the source stays PC-03 |
| R-21 how the draw context gets its declaration (REF-05, SEAM-05) | **ACCEPTED 2026-10-12** (owner, live gate) | READ, not taken: the append reads the declaration in force at the draw height through an injected declaration reader (R-18 pattern) and records it by its height; none in force → `Refuse(no-declaration)`, nothing appended |
| R-22 where draw-time features come from | **ACCEPTED 2026-10-12** (owner, live gate) | GIVEN by the caller as values of the catalog's closed `Features` type; MOD-05 never calls `UnitRegistry.features` (F1: MOD-13 only; SEAM-27; DG-F1) |
| R-23 carrying scope (OBJ-14) and condition (OBJ-07) before MOD-11 / MOD-06 exist | **ACCEPTED 2026-10-12** (owner, live gate) | The scope is recorded by its record height (an appended fact's identity); the condition as an uninterpreted identity string MOD-06 will define. MOD-05 inspects neither; recording a scope spends nothing (O-4 / DG-F3 stays MOD-11's, held) |
| R-24 two resolution labels on one draw context | **ACCEPTED 2026-10-12** (owner, live gate) | The label read answers `uncomputable("two-resolution-labels")`, as R-20; nothing is refused at append |
| R-25 the scope ceiling on the candidate append (REF-16, SEAM-04) | **ACCEPTED 2026-10-12** (owner, live gate) | A THIRD injected decider, R-18's pattern applied to MOD-11: the one candidate append path asks a constructor-declared scope ceiling; a stand-in until MOD-11 exists |
| R-26 how a candidate's `from` is checked | **ACCEPTED 2026-10-12** (owner, live gate) | Against MOD-05's own fold: `from` must be the effective commitment at the currency immediately below, as of the append height; BOTTOM only at the least currency of a unit an independence act licenses at that height (R-10); else `Refuse(malformed-from)`, nothing appended |
| R-27 who computes the lineage digest (S-04, VEC-05, IR-06) | **ACCEPTED 2026-10-12** (owner, live gate) | MOD-12, from the commitment: MOD-05 passes the injected signature check the whole proposal (`from` included) and the signature as an opaque value; MOD-05 chooses no encoding and computes no digest. S-04 is a registered interpretation |
| R-28 which refusal answers when several guards fail | **ACCEPTED 2026-10-12** (owner, live gate) | Admission (MOD-04), then `from` (MOD-05), then the signature (MOD-12), then the scope ceiling (MOD-11); the first failure answers and nothing is appended |
| R-29 the reviewer model for K7 round 8 (MOD-05) | **ACCEPTED 2026-10-12** (owner, live gate) | Fable 5.1, as round 7 (R-13): a different model from the builder (Opus 5.5) keeps the review distinct in model as well as process. `reviewer_command` unchanged |
| R-30 IR-53: a unit with no independence act cannot draw at the least currency | **ACCEPTED 2026-10-12** (owner, live gate) | Keep the built behaviour (the S3 and R-10 read literally) and route the question upstream as an addendum to SP-2; no code change |
| R-31 K7 round 8 triage (MOD-05 RETURN, drift 5): the fix round | **ACCEPTED 2026-10-12** (owner, live gate) | DR-27/28: the candidate BINDS its draw context (REF-05 by construction; S-14's never-re-read; the candidate-to-context key); R-28's order becomes admission → context → from → signature → ceiling. DR-29: `paths` DECIDES appends through generic relays; act-signatures REGISTERS open members of library types as a limit. WI-06: COMMIT_GATE pinned by a test |
| R-32 WI-07: the relay forms `paths` does not see | **ACCEPTED 2026-10-13** (owner, live gate) | DECIDE the wrapped relay (a helper building the entry from its own type-parameter-typed parameter); REGISTER the destructured relay as a limit with a `limit-` fixture |
| R-33 WI-08 / IR-59: may a draw context be bound twice? | **ACCEPTED 2026-10-13** (owner, live gate) | One draw, one candidate: a context already bound by a candidate as of the append height refuses `context-spent` (an as-of read; no catalog re-read). An unused old context may still be bound: its declaration IS the draw's |
| R-34 how MOD-04's refusal names the unit, currency and cheapest BOTTOM predecessor | **ACCEPTED 2026-10-13** (owner, live gate) | In the witness set: the gate answers MOD-05 `refuse("unreachable")` (SEAM-03's shape); ONE evaluation returns the verdict with the predecessor witness set and the cheapest BOTTOM currency. The kernel is unchanged |
| R-35 how a listed member joins the Projection family (MOD-04 is the first) | **ACCEPTED 2026-10-13** (owner, live gate) | The kernel mints it: MOD-01 gains one ADDITIVE export, `asProjection(member, compute)`, with `member` typed by the ten-name list. It is a join, not a predicate. A detector pins each member joined at most once, only in the module the S3 partition assigns, and never in `advisory/`. MOD-01 work item WI-10 |
| R-36 how golden vectors are computed and re-derived (VEC-01 first) | **ACCEPTED 2026-10-13** (owner, live gate) | A harness in tools/: `rederive_invoke` becomes `node --import tsx tools/vectors/run.ts {vector_id} {entry} {input_file}`. The entry stays the implementing file (VEC-01: `src/reachability/reachability.ts`), so impl_sha pins the fold. The harness reads the input and calls the real implementation, and src/ names no external (REF-02) |
| R-37 K7 round 10's scope and reviewer | **ACCEPTED 2026-10-13** (owner, live gate) | Modules MOD-04, MOD-05 and MOD-01: the new module plus every work item since `k7-pass-9` (WI-07, WI-08 in MOD-05; WI-10 in MOD-01). Reviewer Fable 5.1, as rounds 8-9; `reviewer_command` unchanged |
| R-38 K7 round 10 triage (MOD-04 RETURN, drift 6): the fix round | **ACCEPTED 2026-10-13** (owner, live gate) | DR-30: the branch rule DECIDES destructuring (a binding element picked from the loaded order); a class field holding the least is a registered limit. DR-31: PC-05 enumerated for MOD-04 - attributable by construction through re-evaluation at the same height (a pure as-of fold); the refusal stream is deployment, carried forward. DR-32: all five forms DECIDED |
| R-39 K7 round 11 triage, and MOD-04's gate closes (cap reached) | **ACCEPTED 2026-10-13** (owner, live gate) | DR-33: decide the numeric-string and computed keys, the binding-element hop and the widened-left comparison; REGISTER rest-then-index. DR-34: decide all three (by TYPE; any-flow; type guard). DR-35: decide method reference, factory reader, `.bind`, boolean-or-nullish result; REGISTER the user iteration helper. DR-36: fix now. The gate closes on `closed-by-owner-11` (this record's commit); the fixes are new work, batteried and reviewed at the next module's gate; the drift block lifts for the next module once that work and its battery are recorded |
| R-40 inheritance: may a least-currency candidate derive from ANOTHER unit's commitment? (F3 OBJ-27 vs R-26) | **ACCEPTED 2026-10-13** (owner, live gate) | YES (amends R-26): at the least currency `from` is BOTTOM (licensed independent, R-10) or ANOTHER unit's commitment in force as of the append height (F3's inheritance relation). IR-53 is answered from F3; the SP-2 addendum is withdrawn. MOD-05 work item |
| R-41 a commitment names the candidate it accepts (F4 Accepted; S-07; SEAM-11) | **ACCEPTED 2026-10-13** (owner, live gate) | `commit(candidate, "HUMAN")`: unit and currency come from the candidate, recorded by height; Accepted is read by key, never inferred. MOD-05 also gains a record-only lineage reader (derived-from, accepted-by), so MOD-12 reads lineage without the fold (no construction cycle). MOD-05 work item |
| R-42 what an invalidation does to the commitments downstream in its scope (OBJ-28) | **ACCEPTED 2026-10-13** (owner, live gate) | SUPERSEDED WITH IT: one HUMAN approval of the displayed scope invalidates K and every commitment that accepted a candidate in K's scope (derived, not appended one by one); the invalidation reader answers true for all of them; MOD-09 moves all their candidates to PassedOver |
| R-43 what a candidate's signature IS (OBJ-32; no credential, no signer port) | **ACCEPTED 2026-10-13** (owner, live gate) | The DIGEST of its material, through the pinned OBJ-39 DigestPort; the material structurally includes the lineage digest of its `from` commitment. Verification recomputes and compares. What is unforgeable is the BINDING (VEC-05). MOD-12 offers the proposer the one way to form a signature |
| R-44 the refusal for a signature that does not match its recomputed material | **ACCEPTED 2026-10-13** (owner, live gate) | `Refuse(malformed-signature)`, OBJ-32's single ON_FAIL. Omitting the lineage stays a parse error (REF-04); a mismatch is the runtime face of the same guard. No new refusal name |
| R-45 what a BOTTOM-from candidate's signature covers in place of a lineage digest | **ACCEPTED 2026-10-13** (owner, live gate) | A typed BOTTOM lineage marker. The material's lineage is required at parse and is EITHER a lineage digest (minted only by MOD-12, from a Commitment) OR the marker, so a BOTTOM-signed candidate cannot be replayed as a derived one, nor the reverse |
| R-46 IR-77: a candidate from the displayed scope, accepted AFTER the invalidation | **ACCEPTED 2026-10-13** (owner, live gate) | BORN SUPERSEDED: a commitment accepting any candidate of an invalidation's frozen scope is invalidated, whenever it is made. The commit is appended (the record says what happened); the fold answers BOTTOM for it (the read says what holds), R-20's split. MOD-05 and OBJ-31 unchanged |
| R-47 REF-07's freshness: how recent must the displayed derivation be | **ACCEPTED 2026-10-13** (owner, live gate) | STRICT, SAME HEIGHT: `invalidate(displayed, "HUMAN", at)` refuses unless the scope was derived at `at`, the height the caller asserts as current (as `appendCandidate`'s `at` is). RecordPort has no head read, so a concurrent append between display and act is a registered single-writer production concern |
| R-48 how an invalidation proves its scope was displayed (RC-4) | **ACCEPTED 2026-10-13** (owner, live gate) | A DisplayedScope TOKEN that only MOD-12 mints, when `display` has handed the scope to RendererPort.present. `invalidate` accepts only the token: without a derivation it does not compile (REF-07 at parse); a stale one is refused at runtime (R-47). Nothing extra is appended |

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

---

## R-18 · O-5 and O-6 are broken by injection, not by merging

**Owner, 2026-10-12, live gate.** F2 records two module-level cycles: O-5, MOD-04 reads MOD-05's
fold while MOD-05's append is guarded by MOD-04; and O-6, MOD-05 supplies commitments and digests
to MOD-12 while MOD-12 supplies the verified signature back. S2 §6 obligation 2 forbids the
obvious merge, and F2 itself suggests the resolution: "MOD-04 depending on a fold interface
rather than on the append path".

**Ruling.** Every cross-module DECIDER is handed in at construction (OS-1, OS-3) and wired at a
composition root (OS-11).

- MOD-05's candidate append takes MOD-04's admission (`Admitted`, or `Refuse(unreachable)`) and
  MOD-12's signature check (`Refuse(malformed-signature)` on failure) as declared inputs.
- MOD-04 takes MOD-05's effective-commitment fold the same way.
- MOD-05 is built and tested now against stand-ins honouring those interfaces. The interfaces are
  declared in MOD-05 by the operations it calls, and are satisfied by MOD-04 and MOD-12 when
  they are built.

The S3's "hard dependency" rows stand: the dependency is hard, and the binding is INJECTED.

## R-19 · Supersession is read through a declared invalidation reader

**Owner, 2026-10-12, live gate.** A commitment is superseded only through MOD-12's invalidation,
appended after its scope is derived and displayed (RC-4). MOD-12 is not built. MOD-05's fold
therefore takes a declared input that answers one question: "was this commitment invalidated as
of height h?". MOD-12 supplies the answer; MOD-05 defines nothing of MOD-12's fact shape. The
effective commitment for `(unit, currency)` at `h` is the commitment that is not invalidated
at `h`.

## R-20 · Two effective commitments is a named defect, answered as `uncomputable`

**Owner, 2026-10-12, live gate.** F2: "two effective commitments for one `(unit, currency)` is
malformed — a defect in the fold or in the record, not a case to be resolved by preference".

**Ruling.** The fold answers `uncomputable("two-effective-commitments")`, which is neither a
commitment nor BOTTOM, so reachability (MOD-04) refuses rather than guessing. The defect stays
inside the closed Unknown family as a typed, testable answer. Preventing it at the source (two
simultaneous commitments) remains PC-03's claim-or-collide primitive at the record port.

## R-21 · The draw context READS its declaration; it is not handed one

**Owner, 2026-10-12, live gate.** F2 says the draw-context append is "given ... the declaration in
force at that record height", and REF-05 refuses a draw when none was in force. Taking the
declaration from the caller would let a stale one be recorded, which is the history-rewrite
that S-08 / SEAM-10 exist to prevent. **Ruling.** The append takes the unit and the draw height,
reads the declaration in force at that height through a constructor-declared declaration reader
(SEAM-05, the R-18 injection pattern), and records that declaration by its height (IR-43). When
none is in force, it answers `Refuse(no-declaration)` and appends nothing.

## R-22 · Draw-time features are given, never read from the catalog

**Owner, 2026-10-12, live gate.** F1 states `features(unit)` is "consumed by MOD-13 advisory
only", and SEAM-27 is the only seam that carries features. F2 says the append is "given
draw-time features". **Ruling.** The caller passes the features as values of the catalog's
closed `Features` type, and MOD-05 never calls `UnitRegistry.features`. Difficulty therefore
cannot reach a gate through this module (DG-F1).

## R-23 · Scope by height, condition by identity string

**Owner, 2026-10-12, live gate.** OBJ-16 records the governing scope (OBJ-14, MOD-11) and the
condition (OBJ-07, MOD-06), and both modules are built after MOD-05. O-4 (DG-F3: is a scope spent
by dispatch or by return?) is open and owned by MOD-11 / MOD-02. A type parameter cannot carry
either one: REF-06 refuses an unconstrained parameter on an act. **Ruling.** A scope is an
appended fact ("appended before any draw; spent, never edited"), so the context records it by
its record height. The condition is recorded as an uninterpreted identity string that MOD-06
will define. MOD-05 inspects neither. Recording a scope is not spending it: the answer to O-4
stays with MOD-11, and MOD-05 registers it as a hold.

## R-24 · Two resolution labels on one draw context is `uncomputable`

**Owner, 2026-10-12, live gate.** A resolution label (`DRAW` or `REVISION`) is attached after the
draw, as a further append (F2). F2 does not say what two labels mean. **Ruling.** As R-20 does
for commitments: the label read answers `uncomputable("two-resolution-labels")` and never
chooses. Nothing is refused at append, because an append has no height to check against and
two racing appends would both pass.

## R-25 · The scope ceiling is a third injected decider on the one append path

**Owner, 2026-10-12, live gate.** REF-16 (owned by MOD-11) refuses the N+1th candidate under a
ceiling of N. SEAM-04 makes "the governing scope and its remaining ceiling" a hard seam INTO
MOD-05, and S-01 allows exactly one candidate append path. R-18 named MOD-04's admission and
MOD-12's signature check as injected deciders, but not MOD-11. **Ruling.** R-18's pattern
applies to MOD-11: the candidate append takes a constructor-declared scope ceiling, declared in
MOD-05 by the one question it asks, with a stand-in until MOD-11 is built. No guard is placed
around the append, because that would be a second place where a draw is judged.

## R-26 · `from` is checked against MOD-05's own fold

**Owner, 2026-10-12, live gate.** OBJ-11: `from` is the Commitment in the currency immediately
below that a candidate derives from, and BOTTOM is legal only at the least currency of an
independent unit. **Ruling.** The append checks that `from` IS the effective commitment at the
currency immediately below, as of the append height, read through MOD-05's own commitment
fold. The currency order and the independence reader (R-10) are injected. At the least
currency, BOTTOM is allowed only when an independence act asserting independence is in force
at that height. Anything else answers `Refuse(malformed-from)`, and nothing is appended.

## R-27 · MOD-12 computes the lineage digest, from the commitment

**Owner, 2026-10-12, live gate.** S-04 says MOD-05 supplies "the digest of the Commitment a
derived candidate binds, obtained via OBJ-39". VEC-05 (a signature with and without the lineage
digest) belongs to MOD-12, and the digest's encoding is IR-06's open pin. **Ruling.** MOD-05
passes the injected signature check the whole proposal, `from` included, together with the
signature as an opaque value. MOD-12 digests `from` through OBJ-39 under its own encoding.
MOD-05 chooses no encoding and computes no digest. S-04's wording is a registered
interpretation: MOD-05 supplies the commitment the digest is taken of.

## R-28 · Refusal order on the candidate append

**Owner, 2026-10-12, live gate.** The Unknown family carries one guard per answer. **Ruling.**
Admission (MOD-04) is checked first, so an unreachable draw answers `unreachable` and costs
nothing (REF-03, S-01). Then come `from` (MOD-05), the signature (MOD-12, HOOK-04) and the
scope ceiling (MOD-11, REF-16). The first failure answers, and nothing is appended.

## R-29 · K7 round 8 reviews on Fable 5.1

**Owner, 2026-10-12, live gate.** R-13 put round 7 on a different model from the builder, so that
the R-06 closures were certified by a reviewer that had not designed them. Later rounds were
never ruled. **Ruling.** Round 8, MOD-05's gate, runs on Fable 5.1. The builder is Opus 5.5, so
the review stays distinct in model as well as in process. The `reviewer_command` in
`.metaframework/project.json` already names it and is unchanged.

## R-30 · IR-53 stands as built and goes upstream

**Owner, 2026-10-12, live gate.** Under F2 OBJ-11 and R-10, a unit with no independence act can
never draw at the least currency. Every unit's first draw therefore needs a HUMAN independence
declaration, and the S3 never says what a non-independent unit derives from there. **Ruling.**
Keep the behaviour as built, which reads the S3 and R-10 literally. The question goes to the
owner's Phase 3 revision run as an addendum to SP-2. No code changes. IR-53 stays latent until
Phase 3 answers it.

## R-31 · K7 round 8 triage: MOD-05's one fix round

**Owner, 2026-10-12, live gate.** Round 8 returned MOD-05 at drift 5 (DR-27..DR-29, WI-06). RD-9
allows one builder fix round and one re-check. **Rulings for the fix round:**

- **DR-27 and DR-28: the candidate binds its draw context.** `appendCandidate` takes the
  `DrawContext` (a nominal type that only `recordDraw` mints, and only when a declaration was in
  force) and records it by height. A context for another unit or another condition, or one
  recorded above the append height, is refused and nothing is appended. REF-05 then holds on the
  candidate path by construction: a candidate cannot be formed without a context, and a context
  cannot exist without a declaration. The declaration is never re-read from the catalog (F1
  S-14), and SEAM-10's declaration-at-draw-time is recoverable per candidate by key. **R-28 is
  amended:** admission → context → from → signature → ceiling.
- **DR-29: decide the relay, register the library members.** `paths` follows appends through
  generic relays (a function handing its own parameter to `RecordPort.append`) to a fixed point,
  because S-01's single entry point is MOD-05's central claim. act-signatures registers open
  members of LIBRARY types (an act taking `Error`) as a limit, pinned by a `limit-` fixture.
- **WI-06: `COMMIT_GATE` is pinned by a test** asserting OBJ-31's condition, `closedBy`,
  proposals and refusal.

The re-check (round 9) runs with the `reviewer_command` unchanged: Fable 5.1, as in round 8
(R-29).

## R-32 · WI-07: decide the wrapped relay, register the destructured one

**Owner, 2026-10-13, live gate.** K7 round 9 found two relay forms that `paths` misses. In a
WRAPPED relay, the helper builds the entry, as `record.append({ author, payload })` with
`payload: T`. In a DESTRUCTURED relay, the entry arrives as a destructured parameter. A
wrapped-relay backfill in `src/` would escape even the exact per-kind map. **Ruling.** `paths`
follows the wrapped form: an append argument that is built from a parameter of the relay counts
as relaying that parameter. The destructured form is registered as a limit, pinned by a
`limit-` fixture.

## R-33 · WI-08: one draw, one candidate

**Owner, 2026-10-13, live gate.** IR-59 noted that a candidate may bind any context that is not
newer than its append height, so a context can be reused, or bound after a re-declaration.
**Ruling.** A draw context binds at most one candidate. `appendCandidate` refuses
`context-spent` when a candidate bound to that context is in force as of the append height. That
is a read of MOD-05's own record at a height, not a re-read of the catalog (F1 S-14). An unused
older context may still be bound: the draw IS the context, so the declaration it recorded is the
draw's by definition. IR-59 is answered.

## R-34 · MOD-04 names a refusal in its witness set, not in the kernel

**Owner, 2026-10-13, live gate.** F2 OBJ-29 asks that `Refuse(unreachable)` name the unit, the
currency, and the cheapest currency whose effective commitment was BOTTOM (S1 PC-5). The kernel's
closed `refuse` member carries only `guard`, and MOD-01's gate is closed. **Ruling.** Toward
MOD-05 the gate answers SEAM-03's shape, `"ADMIT"` or `refuse("unreachable")`. ONE evaluation
returns the verdict together with the predecessor witness set: each strictly cheaper currency's
effective commitment or BOTTOM, and the cheapest currency that is not a commitment. That is the
attributable content of the refusal, derived from the same evaluation, never a second one (F2).
The kernel is unchanged.

## R-35 · The kernel mints Projection membership, by name

**Owner, 2026-10-13, live gate.** OBJ-24 Reachability is the first Projection to join the family.
The kernel's `Projection<T>` brand symbol is unexported and has no runtime value (IR-18), so no
module can implement it, and the kernel mints nothing. The two other doors are worse. An
assertion `as Projection<...>` cannot say which member it claims. An unbranded class makes "a
Projection" prose, not type. **Ruling.** MOD-01 gains one additive export,
`asProjection(member, compute)`. Its `member` parameter is typed by `ProjectionMember`, so only
one of the ten listed names compiles, and OBJ-34 DifficultyAdvisory cannot be named. It is a
JOIN, not a membership predicate: nothing in the kernel answers "is this a Projection?" (BC-01-2
stands).

A detector pins three things:

- every member is joined at most once in `src/`;
- only in the module the S3 partition assigns it to;
- never in `advisory/`.

An assertion to a Projection type anywhere in `src/` is flagged, because only the kernel mints.
This is a new work item (WI-10) against MOD-01's closed gate. It is not a reopening, and it is
reviewed with MOD-04.

## R-36 · Golden vectors run through a harness; the entry is the implementing file

**Owner, 2026-10-13, live gate.** VEC-01 is the first vector this build computes. The declared
`rederive_invoke`, `node --import tsx {entry} {input_file}`, runs the module's file as a script.
That file would then have to read the input file, and a file in src/ cannot do so without naming
an external, which REF-02 forbids outside ports/. **Ruling.** `rederive_invoke` becomes
`node --import tsx tools/vectors/run.ts {vector_id} {entry} {input_file}`. It still begins with
`node` (IR-26). `{entry}` stays the IMPLEMENTING file, so `impl_sha` pins what computes the value.
For VEC-01, the vector's module is the object-model row `MOD-04 · Reachability`, whose file is
`src/reachability/reachability.ts`. The harness checks that `{entry}` is the file its handler
derives from, reads the input, builds the fixture record, calls the real implementation and
prints only the encoded output. This is a change to a declared command K7 runs for CC-5, so it
takes effect from this record (RD-15).

## R-37 · K7 round 10 reviews MOD-04 with the work items, on Fable 5.1

**Owner, 2026-10-13, live gate.** Round 10 is MOD-04's gate. Since `k7-pass-9`, three work items
have landed on closed modules: WI-07 and WI-08 in MOD-05, and WI-10 in MOD-01. **Ruling.** The
round's scope is MOD-04, MOD-05 and MOD-01 (`--modules MOD-04,MOD-05,MOD-01`), so every line
changed since the last PASS gets a reviewer. R-35 already said WI-10 is reviewed with MOD-04.
The reviewer stays Fable 5.1, as in rounds 8 and 9. This is recorded before the round runs
(RD-15).

## R-38 · K7 round 10 triage: MOD-04's one fix round

**Owner, 2026-10-13, live gate.** Round 10 returned MOD-04 at drift 6 (DR-30..DR-32). RD-9 allows
one fix round and one re-check. **Rulings:**

- **DR-30: decide the destructured member.** The branch rule follows a binding element of an
  array or object destructuring back to what it was picked from. A member picked by POSITION from
  the LOADED ORDER is particular: an indexed or destructured element of a zero-parameter call
  returning the currency collection, or of a `const` one hop from such a call. Currencies taken
  from data, such as a parameter or a payload field, are compared as data and are never
  particular. A class field holding the least currency is a registered limit, pinned by a
  `limit-` fixture.
- **DR-31: PC-05 is enumerated for MOD-04, and attribution is re-evaluation at the same height.**
  `ReachabilityGate.evaluate(u, c, h)` is a pure as-of fold, so whoever reports a refusal gets
  the same evaluation (witnesses, cheapest unmet currency) by asking again at the refusal's
  height: attributable by construction. The aggregating stream is deployment (PC-05's
  resolution, Developer) and is carried forward. The stale MOD-04 and MOD-05 module rows are
  corrected.
- **DR-32: decide all five.** Sole site: a commitment read wrapped in a helper (a fixed point
  over helpers that return a boolean or a commitment), `Array.from(xs, fn)`, and iteration
  through library collections (Set, Map). Joins: a generic launder, as catalog-mint decides it,
  and `asProjection` reached by `call`, `apply` or `Reflect.apply`, as spawn-resolve decides it.
  Each gets a violating fixture, watched red first.

The re-check (round 11) keeps R-37's scope and reviewer.

## R-39 · K7 round 11 triage, and MOD-04's gate closes

Round 11 (`k7-verdict-11.json`, Fable 5.1, reviewed `724e048`) was MOD-04's re-check: RETURN,
drift 6. The cap is reached, so this triage closes the gate. **Closed gates stay closed:** what
follows is new work, reviewed at the next module's gate.

| Item | Disposition |
|---|---|
| DR-33 the branch rule's sibling spellings | **Fix now.** Judge a destructured key by its RESOLVED name (a numeric literal, a numeric string, a computed numeric key), as DR-24 did for `kind`. Follow the one hop through a binding element. Strip widening on the CURRENCY side (`as`, `satisfies`, `String(c)`, a template). **Registered:** a rest element read back by a literal index, pinned by a `limit-` fixture |
| DR-34 the joins rule | **Fix now, all three.** Resolve the receiver of `.call` / `.apply` / `.bind`, and `Reflect.apply`'s target, by TYPE (its call signature's declaration), as the SCOPE claims. Port catalog-mint's any-flow and user type-guard rules to the Projection brand |
| DR-35 the sole-site rule's by-reference forms | **Fix now:** a reader METHOD handed by reference, a FACTORY call returning a reader, `.bind` of a reader, and a read-wrapping helper whose result is boolean or nullish. **Registered:** a reader called from a USER-written iteration helper, pinned by a `limit-` fixture |
| DR-36 REF-03's name selects two cases; stale cell; vacuous assertion | **Fix now:** rename the orchestrated-path case so the §5 name selects one; the completion ledger says the orchestrated path is covered by a test §5 does not name (ODG-FG-08's observation); correct the cell; replace the vacuous assertion |

**The close.** The owner places `closed-by-owner-11` on the commit that records this ruling.
**The next module.** MOD-04 closes at drift 6. The drift block on opening the next module (MOD-12
`lineage/` or MOD-06 `condition/`, S3 §10) is lifted once the work above and its battery are
recorded, as R-16 did for MOD-03. The work is reviewed at that module's gate.

## R-40 · A least-currency candidate may inherit from another unit's commitment (amends R-26)

**Owner, 2026-10-13, live gate.** Reading MOD-12's specification surfaced F3's OBJ-27 Chain:
"unit *v* is the successor of unit *u* when *v*'s least-currency candidate derives from *u*'s
commitment", and a chain ends where "an independently-generated candidate terminates it". R-26, as
built in MOD-05, allows only a licensed BOTTOM at the least currency. **Ruling.** At the least
currency, `from` is either BOTTOM, licensed by an independence act in force (R-10), or ANOTHER
unit's commitment that is in force (the fold answers it for that unit and currency) as of the
append height. Above the least currency, R-26 stands unchanged: the same unit's commitment
immediately below. IR-53's question ("what does a non-independent unit derive from?") is answered
from F3, and the SP-2 addendum (R-30) is withdrawn. This is new work against MOD-05's closed gate.

## R-41 · A commitment names the candidate it accepts

**Owner, 2026-10-13, live gate.** F4: "`Accepted` = candidates that received a commitment". S-07
and SEAM-11 move "each invalidated commitment's candidate" to PassedOver. MOD-05's `commit(unit,
currency, author)` names no candidate. **Ruling.** `commit(candidate, "HUMAN")`. The unit and
currency come from the candidate, and the commitment records the candidate by height (IR-43), so
Accepted is read by key and never inferred. MOD-05 also gains a record-only LINEAGE READER (the
candidates derived from a commitment; the commitments accepting a candidate). It needs no fold, so
MOD-12 can derive scopes without constructing the commitment ledger whose invalidation reader
MOD-12 itself supplies. This is new work against MOD-05's closed gate.

## R-42 · An invalidation supersedes every commitment downstream in its scope

**Owner, 2026-10-13, live gate.** OBJ-28's scope of a commitment K is the candidates whose `from`
names K, closed transitively. With R-41, the closure walks: K → candidates from K → the
commitments that accepted them → candidates from those, and so on. **Ruling.** One HUMAN approval
of the DISPLAYED scope invalidates K and every commitment in that closure. That is derived from
the one invalidation, as of the height its scope was derived and displayed, not appended one by
one. MOD-12's invalidation reader answers true for all of them, so reachability above them
refuses. The invalidated set MOD-09 reads holds all of them, and their candidates move
Accepted → PassedOver.

## R-43 · A candidate's signature is the digest of its material

**Owner, 2026-10-13, live gate.** OBJ-32 requires a candidate's signature to cover the digest of the
commitment it derives from. The system owns no credential (S3 "What this system does"), and the
ports OBJ-35..OBJ-39 name no signer. **Ruling.** A signature is the digest, through the pinned
OBJ-39 DigestPort, of the candidate's MATERIAL. The material is the whole proposal plus its lineage:
the digest of the `from` commitment (R-27: MOD-12 computes it, under its own encoding). Verification
recomputes the digest from the proposal and compares. What is unforgeable is the binding: a
signature formed over one lineage cannot validate against another (VEC-05; F2's "re-approving a
different commitment would leave an old signature still validating"). MOD-12 offers the proposer
the one way to form a signature, so no second encoding exists.

## R-44 · A mismatched signature is malformed-signature

**Owner, 2026-10-13, live gate.** **Ruling.** A signature that does not equal the digest recomputed
from the proposal answers `Refuse(malformed-signature)`, OBJ-32's single ON_FAIL, and nothing is
appended (MOD-05's order, R-31). OMITTING the lineage stays a parse error (REF-04): the material
type requires it. A mismatch is the same guard at runtime. No new refusal name is minted.

## R-45 · A BOTTOM-from candidate's signature covers a typed BOTTOM marker

**Owner, 2026-10-13, live gate.** An independent unit's least-currency candidate derives from
nothing (R-10, R-40). **Ruling.** The material's lineage is required at parse and is EITHER a
lineage digest, a type minted only by MOD-12 from a Commitment, OR a typed BOTTOM marker. The
signature then covers "derives from nothing". A BOTTOM-signed candidate cannot be replayed as
derived, nor the reverse, and no bytes are invented to hash for a value that names nothing.

## R-46 · A commitment accepting a candidate of a frozen scope is born superseded (IR-77)

**Owner, 2026-10-13, live gate.** IR-77: after K is invalidated, a candidate derived from K can
still be committed, if it was in the displayed scope but never accepted. The result is a
commitment in force on a lineage the human un-approved. **Ruling.** An invalidation's scope is
FROZEN as derived and displayed (R-42, R-47): K's closure over `from` as of `scopeAt`. A commitment
that accepts any candidate of that frozen scope is invalidated, WHENEVER it is made. The commit is
still appended, because the record says what happened. The fold answers BOTTOM for it, because the
read says what holds. This is the split R-20 already uses for two commitments in force. Nothing
can then derive from that commitment: MOD-05's from-check refuses a `from` not in force. MOD-05,
and OBJ-31's condition, are unchanged.

## R-47 · REF-07: the displayed derivation must be at the act's height

**Owner, 2026-10-13, live gate.** REF-07 (F2): "an append reached without a prior derivation at the
same height is rejected." RecordPort (OBJ-35) exposes `append` and `readAsOf`, and `readAsOf(h)` is
exactly the first `h` facts (IR-31). So an act cannot learn the head without appending. **Ruling.**
`invalidate(displayed, "HUMAN", at)` refuses unless the displayed scope was derived at `at`, the
height the caller asserts as current. `CandidateLedger.appendCandidate`'s `at` is trusted the same
way. A concurrent append between display and act cannot be seen through the port. It is registered
as a single-writer production concern and carried forward, not built around.

## R-48 · A DisplayedScope token proves the display (RC-4)

**Owner, 2026-10-13, live gate.** **Ruling.** `display(scope)` hands the scope to RendererPort.present
(OBJ-36, outbound; its return is never branched on) and returns a DisplayedScope that only MOD-12
mints. `invalidate` accepts only that token. An invalidation without a derivation therefore does
not compile, which is REF-07 at parse, and a stale token is refused at runtime under R-47. Nothing is
appended for the display: no fact kind or append path beyond the S3's.

