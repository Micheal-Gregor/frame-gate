# MOD-05 `facts/` — clause map at module close

Written after K7 round 8 (MF-32 in the framework trial): every row the S3 carries for MOD-05,
split into its clauses, each mapped to the test that turns red when the clause is broken. A
clause marked **elsewhere** is honoured by another module, under the cited ruling. A clause
with no test is an unpinned claim. Both kinds found by this map were pinned or registered
before K7 round 9.

## Refusal rows (S3 §5, F2 §5)

| Row | Clause | Pinned by |
|---|---|---|
| REF-05 | a draw with no declaration in force → `Refuse(no-declaration)` | `test_draw_without_declaration_is_refused` |
| REF-05 | … no draw context appended | same (nothing appended since `h`) |
| REF-05 | … **no candidate appended** (round 8, DR-27) | `test_no_candidate_without_a_declaration_in_force` (parse: no proposal without a context), `test_the_bound_context_must_be_this_draws` |
| REF-06 | no act signature accepts a diagnostic | `test_no_act_signature_accepts_diagnostic` (acts found by resolution; limits pinned) |

## Seams (S3 §4) and F2's S-rows

| Row | Clause | Pinned by |
|---|---|---|
| SEAM-02 / S-02 | the effective commitment per (unit, currency), or ⊥ | `test_no_commitment_folds_to_bottom_never_null`, `test_a_commitment_answers_only_for_its_own_unit_and_currency` |
| SEAM-02 | ⊥ is a value; never coalesced (BOTTOM = NoSubject, IR-42) | `test_no_commitment_folds_to_bottom_never_null` |
| SEAM-02 / OBJ-12 | recomputed per call, never stored | the surface `held` rule (`test_no_operation_answers_the_current_declaration`, every ledger root) |
| SEAM-03 / S-01 | no append path bypasses admission | `test_an_unreachable_draw_appends_nothing_and_asks_no_one_else`; `test_each_ledger_kind_has_exactly_one_append_path` (one path per kind, relays decided) |
| SEAM-03 | "no third outcome" | **elsewhere** — MOD-04's answer (VEC-01). MOD-05 passes any Unknown through unchanged and never invents one (`test_refusals_answer_in_order_and_later_deciders_are_not_asked`) |
| SEAM-04 | ceiling not exceeded | `test_draw_beyond_the_scope_ceiling_is_refused_on_the_append_path` (R-25) |
| SEAM-04 | the scope is never edited | **elsewhere** — MOD-11 (REF-17). MOD-05 records the scope by height and holds no scope (IR-52) |
| SEAM-05 / F1 S-14 | `draw` asserts `declaration_at(u,h) ≠ ⊥` | `test_draw_without_declaration_is_refused` |
| F1 S-14 | the recorded value is the one read at draw height | `test_the_recorded_declaration_is_the_one_in_force_at_draw_time` |
| F1 S-14 | … thereafter never re-read from the catalog | structural: `CandidateLedger` declares no declaration input (object model; isolation test; `seal` declaration comparison) |
| SEAM-06 | append-only; no update, no delete | the record port has no mutator (MOD-02); the surface `held` rule; no MOD-05 class exposes a mutator |
| SEAM-10 / S-08 | the declaration recorded at draw time, never a current one | `test_a_redeclaration_does_not_rewrite_a_recorded_draw`; per candidate, `test_a_candidate_identifies_the_declaration_it_was_drawn_under` |
| SEAM-14 | a proposal only, never a precondition | `test_no_act_signature_accepts_diagnostic` |
| SEAM-17 / S-03 | the superseded commitment identity reaches MOD-12 | `derivedFrom` and the commitment's height identity (IR-43): `test_derived_from_answers_the_lineage` |
| SEAM-17 / SEAM-18 / S-06 | the scope is derived and displayed BEFORE the append | **elsewhere** — MOD-12's invalidation append (REF-07). MOD-05's side: a re-commitment appended before its invalidation folds to `uncomputable` (R-20), so reachability refuses. `test_two_effective_commitments_are_uncomputable_not_chosen` (IR-61) |
| SEAM-19 / S-04 | the commitment a derived candidate binds | `from` checked against MOD-05's own fold (R-26): `test_from_must_be_the_effective_commitment_immediately_below` |
| SEAM-19 | omitting it is malformed AT PARSE | `test_a_candidate_without_from_is_malformed_at_parse` (added by this map) |
| SEAM-19 / S-04 | its digest | **elsewhere** — MOD-12 computes it (R-27, IR-54, SP-3) |
| S-05 | no candidate is appended unsigned | the signature is a required parameter, and MOD-12's check is asked on the one path: `test_the_signature_check_sees_the_whole_proposal_and_its_refusal_passes_through` |
| SEAM-20 | records reached only through MOD-02 | `test_external_import_outside_ports_is_malformed` (REF-02, all of `src/`) |
| SEAM-22 | per-unit candidate counts indexed by currency; never summed, never divided | `test_counts_are_per_currency_in_order_never_summed` |
| S-09 | candidates by unit, currency and condition IDENTITY, never a window | `test_candidates_are_read_by_condition_identity_as_of_a_height` |

## Objects (F2 §2)

| Object | Clause | Pinned by |
|---|---|---|
| OBJ-11 | appended only through the single guarded path | `test_each_ledger_kind_has_exactly_one_append_path` |
| OBJ-11 | never updated, never deleted | surface `held`; no mutator on any MOD-05 class |
| OBJ-11 | `from = BOTTOM` only at the least currency of an independent unit | `test_bottom_from_needs_an_independence_license_at_the_least_currency` (R-10, R-26; IR-53 upstream) |
| OBJ-12 | a HUMAN act | `test_a_non_human_author_cannot_commit` |
| OBJ-12 | two effective is malformed, never resolved by preference | `test_two_effective_commitments_are_uncomputable_not_chosen` (R-20) |
| OBJ-16 | features, declaration at the draw height, scope, condition | `test_features_are_recorded_as_given_and_frozen`, `test_scope_and_condition_are_carried_as_given` |
| OBJ-16 | the resolution label is later, not a precondition | `test_an_unlabelled_draw_has_no_resolution_yet`, `test_a_label_answers_from_its_own_height_on` |
| OBJ-31 | closed by a HUMAN act; proposals never close | `test_commit_gate_states_obj_31`; commit's `"HUMAN"` author at parse |
| OBJ-31 | a commitment must not require an observation | `commit(unit, currency, author)` takes none; REF-06 |

## Hooks (S3 §7)

MOD-05 owns none. Its candidate append is the trigger site of HOOK-01 (MOD-04), HOOK-04 (MOD-12)
and HOOK-05 (MOD-11). Each is reached through an injected decider, asked in R-31's order. Each
is discharged by its owner.
