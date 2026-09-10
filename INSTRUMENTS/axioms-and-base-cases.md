# Axioms & Base Cases — The Frame Gate build

Rule: the base case is written BEFORE the feature and **watched failing**, against a typed stub.
The red count is recorded. A base case pins a **RULE, not an instance** — a guard over "the five
members" is a reflective scan over every member discovered from source, because a hard-coded list
lets the sixth member skate.

## MOD-02 `ports/` — the single external boundary

**Axiom carried:** ER-5 external isolation. Every external is *cited* in `src/ports/` and *defined*
nowhere. Any other module naming a record driver, renderer client, dispatch mechanism, author source
or hash library is **malformed at parse** — caught at build, never at runtime.

**Base case BC-02-1 — the rule, stated without reference to any particular external.**

> For every module specifier imported by a file under `src/`: resolve it. If the resolution lands
> outside `src/`, or fails to resolve because the specifier names a runtime builtin, the import is
> **external**. An external import is admitted only from a file contained in `src/ports/`.

Three properties this phrasing buys, each of which a weaker phrasing loses:

1. **It names no external.** There is no allow-list of `pg`, `node:crypto`, or any renderer client to
   fall out of date. A dependency added next year is caught the day it is imported.
2. **It resolves and tests containment** (RD-13). It does not scan specifier text. String detectors
   are defeated by sibling spellings — `'../ports/index.js'` and `'./../ports/index.js'` denote one
   file and a name-scan sees two. Both are asserted equivalent in the base case below.
3. **Containment is computed on normalised absolute paths**, so `src/ports/../facts/x.ts` cannot pose
   as a ports file.

**Acceptance test:** `test_external_import_outside_ports_is_malformed` (REF-02),
with its positive counterpart `test_external_reached_through_ports_module_succeeds` (REF-02+).

**Watched failing:** yes — recorded below.

| Base case | Test | Red at | Green at |
|---|---|---|---|
| BC-02-1 refusal | `test_external_import_outside_ports_is_malformed` | stub, 4/4 red | detector body |
| BC-02-1 positive | `test_external_reached_through_ports_module_succeeds` | stub, 4/4 red | detector body |
| BC-02-1 RD-13 tripwire | `test_sibling_specifier_spellings_resolve_to_one_file` | stub, 4/4 red | detector body |
| BC-02-1 self-check | `test_the_real_src_tree_has_no_external_isolation_violation` | stub, 4/4 red | detector body |
| BC-02-1 lookalike | `test_lookalike_directory_is_not_exempted_by_name` | added at battery-preview | same commit |

## Log

- **2026-09-09 — opened at the MOD-02 rung.**
- **2026-09-09 — BC-02-1 watched failing.** Four tests written against a typed stub
  (`tools/checks/external-isolation.ts`, signature final, body throwing). **Red count: 4 failed / 4.**
  Typecheck clean at the moment of the red count, so the red was the base case and not the toolchain —
  an earlier run showed 3 tsc errors from a missing `@types/node`, which were fixed before the count
  was recorded. A red count taken over a broken toolchain proves nothing.
- **2026-09-09 — BC-02-1 green.** Detector body implemented; 4/4 pass, typecheck clean.
  `src/ports/index.ts` written afterward, so the self-check ran over a real tree rather than an
  empty one. The mutation battery is what turns "green" into evidence.

- **2026-09-09 — BC-02-1 strengthened before the battery.** Planning the mutation set exposed a hole:
  a name-scan mutation (`file.includes("ports")`) survived all four tests. `src/portsmith/` contains
  the substring and is not the ports module, so a name scan exempts it and misses the violation. Added
  `test_lookalike_directory_is_not_exempted_by_name` and the fixture. **This is the base case pinning
  a RULE rather than an instance** — the rule is containment, and nothing was testing that it was
  containment rather than a name that happened to agree with containment on the fixtures I had.
