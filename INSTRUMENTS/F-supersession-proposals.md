# F Backflow — Supersession Proposals to Phase 3 · The Frame Gate

Each proposal supersedes upstream via the Phase 3 chat project — S3 is never patched in place.

## SP-1 · Ten §5 `Test name` rows disagree with the facet slice that specified them

**STATUS: DISCHARGED at `s3-anchor-v1.1`, 2026-09-10.** See the disposition at the foot of this proposal.
*(from K7 round 1, CC-4 / CC-3 — class: handoff defect, not a build defect)*

### What K7 found, and what following it found

K7 round 1 reported one instance: S3 §5's REF-02 row names
`test_external_import_outside_ports_is_malformed`, while facet F1 §4 names
`test_external_import_outside_ports_module_is_malformed_at_parse`. The builder implemented F1's
name, so the authoritative row selected **zero** test cases. Verified before the fix:

```
npx vitest run -t "test_external_import_outside_ports_is_malformed"
  ->  Tests  7 skipped (7)
```

Auditing the whole table found the same disagreement in **ten of nineteen rows**. Only REF-02 was
in scope for round 1; the other nine are latent and will surface one rung at a time, each looking
like a fresh defect.

### The rows

| REF | Module | S3 §5 (authoritative) | Facet slice | Source |
|---|---|---|---|---|
| REF-01 | MOD-03 | `test_declaration_from_derivation_is_malformed` | `test_derivation_producing_declaration_is_malformed_at_parse` | F1 |
| REF-02 | MOD-02 | `test_external_import_outside_ports_is_malformed` | `test_external_import_outside_ports_module_is_malformed_at_parse` | F1 |
| REF-08 | MOD-08 | `test_dispersion_below_floor_returns_undetermined` | `dispersion_of_two_returns_undetermined_with_no_number` | F3 |
| REF-09 | MOD-07 | `test_arithmetic_on_absent_component_is_malformed` | `arithmetic_with_absent_sibling_is_malformed_at_parse` | F3 |
| REF-10 | MOD-06 | `test_cross_condition_sample_query_is_empty` | `cross_condition_sample_query_intersects_to_empty` | F3 |
| REF-15 | MOD-11 | `test_stop_condition_without_bar_is_refused` | `test_stop_condition_refused_when_threshold_is_bottom` | F5 |
| REF-16 | MOD-11 | `test_draw_beyond_scope_ceiling_is_refused` | `test_draw_beyond_scope_ceiling_refused` | F5 |
| REF-17 | MOD-11 | `test_no_mutating_signature_on_scope` | `test_no_edit_path_exists_on_appended_scope` | F5 |
| REF-18 | MOD-11 | `test_ratio_as_quotient_is_malformed` | `test_ratio_rendered_as_quotient_is_malformed` | F5 |
| REF-19 | MOD-11 | `test_authorization_without_ratio_is_refused` | `test_authorization_form_without_draw_vector_refused` | F5 |

Nine rows agree or have no facet row (REF-03..07, REF-11..14) and are untouched by this proposal.

### Why this matters more than a naming quibble

The emission contract states that §5's `Test name` "is the field that makes CC-4 and CC-6
mechanical. Without it no S3 refusal row can be joined to an executable case." Phase 4 invokes
`test_select` with that exact string. A row whose name resolves to nothing does not merely read
oddly — it **silently disables the guard it describes**:

- CC-4 cannot join the refusal row to a case, so the refusal is unverified.
- The mutation battery's rule that "deleting the guarded call makes exactly that test fail" is
  vacuous when the selector matches no test: nothing runs, so nothing fails, and a mutation
  survives while appearing to be covered.

Ten of nineteen guards are in that state today.

### Root cause

S5 synthesis composed §5's `Test name` column rather than carrying the facets' names verbatim. The
facet agents each named the case they specified; synthesis paraphrased. Nothing in the Phase 3
conformance battery compares the two, so K6 passed a document with ten broken joins.

### Proposed supersession

1. **Reconcile all ten rows to a single name each.** The builder's ruling for the instance (build
   IR-12) is that **§5 governs** — it is the artifact Phase 4 parses, and a facet slice records how
   the specification was produced rather than being the specification. Applying that uniformly:
   correct the *facet* rows to match §5. Either direction closes the defect; what must not survive
   is two names.

2. **Add a K6 conformance check.** For every §5 row, the `Test name` must equal the name in the
   facet slice that specified it. This is a string comparison across two tables in the same
   document set and would have caught all ten before emission. Suggested as CT-7, or as an
   extension of CT-4's scope from "a refusal test exists" to "a refusal test exists *and its
   declared selector resolves to it*".

3. **Consider carrying facet names verbatim into §5 at synthesis** rather than composing them. The
   facet agent that specified the guard is better placed to name its test than the synthesis step
   that consolidates it, and verbatim carriage removes the opportunity for divergence rather than
   detecting it afterward.

### Secondary observation — one `Test name` per guard is a floor, not coverage

Fixing REF-02's name made CC-6's mutation rule runnable for the first time, and running it exposed
a second, smaller thing. Six mutations of the REF-02 detector all die against the **full suite**;
against **the declared selector alone**, only one dies. The other five are killed by supporting
tests §5 does not name.

The suite is stronger than the specification. But a reviewer or CI step doing what the emission
contract describes — invoke `test_select` with the `Test name` from each §5 row — would watch five
of six mutations survive and record the guard as covered.

Proposed alongside the reconciliation: either CC-6 runs the **full declared suite** when
mutation-testing rather than the per-row selector, or §5 admits more than one `Test name` per guard
so the binding reflects what actually guards the invariant. This is a smaller defect than the ten
broken joins and is in the same family: the specification's link to executable evidence is thinner
than it appears.

### Status

- **REF-02 is resolved in the build** at commit `32f1335` — the code now carries §5's name and the
  selector resolves to exactly one case. That closes the instance.
- **The remaining nine are open** and blocked on this proposal. They are not build defects and must
  not be fixed by renaming code against a specification that will later be corrected in the other
  direction.
- Recommended handling: run this as a Phase 3 revision producing `s3-anchor-v1.1`, then re-anchor
  the build against it.


---

## SP-1 disposition — discharged at `s3-anchor-v1.1`, 2026-09-10

**What was done.**

1. **All ten rows reconciled**, facet → §5, per build ruling IR-12. §5 is unchanged; the facet
   slices moved. REF-01 (F1), REF-02 (F1), REF-08/09/10 (F3), REF-15..19 (F5). Verified: no
   pre-reconciliation name survives anywhere under `governance/`.
2. **The join is now checked**, not assumed — `tools/checks/spec-name-join.py`. Property A
   (§5 agrees with its facet) catches the defect at emission, before code exists, and would have
   caught all ten. Property B (each name selects exactly one case) catches it at build. Rows for
   unbuilt modules report **pending**, never passing — the distinction that stops an unbuilt module
   from looking verified.
3. **Proven against the defect**, not merely written: re-breaking a reconciled row makes the check
   fail and name both sides; restoring it makes the check pass.

**What was deliberately not done.**

The **secondary observation** — that a single `Test name` per guard binds only one of six mutations
— is **not resolved here, and must not be.** Both available fixes change a concept-agnostic asset:

- *CC-6 runs the full declared suite when mutation-testing* changes **K7's charter**, which reads
  "named tests MUST fail, invoked by the declared single-test command."
- *§5 admits more than one `Test name` per guard* changes the **emission contract's** column set,
  which `emission-check` pins.

Neither belongs to this concept. A concept driving a change to a concept-agnostic asset is exactly
the violation BX-14 exists to catch, and the framework's own remedy is to **raise a gate against the
asset and halt**, the way an insufficient Appendix A is handled — never to extend it inline.

**Carried forward as ODG-FG-08** (see the S3's open gates, and below): a decision gate against the
Phase 4 roster and the K7 charter, owned upstream, not by this build. The observed fact stands on
its own and is reproducible: `INSTRUMENTS/mutation-battery.md` round 2 records six mutations, all
killed by the full suite, one killed by the declared selector.

**What this does not fix.** Property B can only be checked where tests exist. Eighteen of nineteen
rows are `pending` today. Each becomes checkable as its module is built, and a row that never
resolves is a defect the check will name at that point rather than at emission.
