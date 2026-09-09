# Metaframework Harness v1.0

Mechanical gates for Phases 4–5. Everything here exists to move rules out of
prose and into files that execute, because prose is advisory and compaction
thins it, while a script that exits 2 does not reinterpret itself.

**Design rule.** Nothing in this harness asks a model to assess itself. Every
gate compares an artifact to another artifact, or an exit code to zero.

---

## Contents

| File | Installs at | Does |
|---|---|---|
| `S2-S3-emission-contract.md` | `governance/` | Fixed headings, column sets, ID scheme, and status enums for the Phase 2 and Phase 3 documents. The contract everything else reads. |
| `emission-check.py` | `tools/` | Validates a Phase 2 or Phase 3 document against that contract. |
| `structure-check.py` | `tools/` | Classifies every tracked `.md` by role and enforces the resident line cap and one-acceptance-test-per-step. |
| `phase4-checks.py` | `tools/` | Four gates against Phase 4 instruments: `rosters`, `modules`, `tags`, `scaffold`. |
| `k7-verdict.schema.json` | `governance/` | The verdict contract. The only durable output of a K7 review. |
| `project.json` | `.metaframework/` | Declares test and rederive commands, source glob, scaffold exemptions. |
| `doc-roles.json` | `.metaframework/` | Maps path globs to document roles. Every tracked `.md` must match one — an unclassified document has an unknown residency cost and fails `structure-check`. |

Tooling must live in `tools/` or `.metaframework/`. The scaffold check scans
tracked files for placeholder markers and will match its own source otherwise.

---

## Install order

1. **`.metaframework/project.json`** — fill from the template. Nothing else runs
   without `source_glob`, and `test_command` is what CC-4 becomes.

2. **`tools/`** — the three checkers. Confirm each exits 0 on a clean tree
   before wiring anything to a hook; a gate that fails open is worse than none.

3. **`.metaframework/roster-manifest.json`** — record authoritative digests:

   ```sh
   python3 - <<'PY'
   import hashlib, json, pathlib
   files = ["governance/Phase4_Conformance_Build_Roster.md",
            "governance/Phase5_Utilization_Roster.md"]
   m = {f: hashlib.sha256(pathlib.Path(f).read_bytes()).hexdigest() for f in files}
   pathlib.Path(".metaframework/roster-manifest.json").write_text(json.dumps(m, indent=2))
   PY
   ```

   Regenerate **only** when deliberately refreshing from the skill rosters. That
   is the entire point: an undeclared change to a governance copy becomes a
   build failure instead of silently instructing the next session from
   superseded mechanics.

4. **`governance/`** — the emission contract and verdict schema, committed and
   tagged with the S3 anchor.

5. **Hooks** — not yet built. See Remaining.

---

## Gate topology

What blocks what, and at which frequency.

```
write any .md          -> structure-check          (PreToolUse, every write)
emit S2 / S3           -> emission-check           (C4 anchor, once per phase)
build one rung         -> test_module              (inner loop, scoped, fast)
close a rung           -> test_command             (full suite, unscoped)
close a ladder         -> phase4-checks --all
                          + mutation battery
                          + rederive --all
                          + k7 runner -> verdict
git commit             -> hook demands a verdict whose reviewed.tree_sha == HEAD
```

Two frequencies matter. `test_module` is for feedback while building; it is
never a gate. `test_command` runs the whole suite unscoped, because the value of
a suite is re-validating what you did not think you touched — and because the
mutation battery's "named tests MUST fail" is meaningless if the run was scoped.

---

## What is mechanical now

- Document structure: headings, columns, IDs, enums, orphans, duplicate IDs,
  deferred vectors missing a discharge condition.
- Governance copies match their authoritative digests.
- CC-1 in both directions: declared modules exist on disk, tracked sources are
  claimed by a module.
- Tags are backed by verdicts covering the tree they point at.
- No scaffold markers in committed artifacts.
- Resident documents under the line cap; every step has exactly one acceptance
  test.

## Remaining

Nothing. `tools/rederive.py` and `tools/state.py` complete the set.

`rederive` is language-agnostic: it drives your implementation through one
declared `rederive_invoke` command, so declare that alongside `test_command`.
It fails a vector whose value does not recompute, **and** one whose `impl_sha`
is absent or stale — a record asserting false provenance is a false record.
`--refresh-provenance` re-pins `impl_sha` for vectors whose value re-derives; it
cannot rescue a wrong value.

`state.py` owns STATE.json. Git-derived fields refresh automatically; intent
fields (`next_action`, `current_module`, `blocked_on`, `phase`, `concept`) are
set explicitly and survive every refresh. `hook-session-start` injects the state
block on start, resume, and post-compaction; `hook-precompact` checkpoints to
disk and appends to `INSTRUMENTS/state-log.jsonl` before context is lost.

`tools/k7-run.py` and `tools/gate.py` supersede the old S3 write-protect hook,
which missed Bash writes, passed `NotebookEdit` on an empty path, and failed
open when `python3` was absent. Remove `hooks/protect-s3.sh` when wiring `gate.py`.

**Set `reviewer_command` in `project.json` before the first real run.** The
default assumes `claude -p --agent-file {agent_file} --output-format json`;
verify the flags against your install with `k7-run.py --dry-run`, which runs
preflight and prints the prompt without spawning anything.
