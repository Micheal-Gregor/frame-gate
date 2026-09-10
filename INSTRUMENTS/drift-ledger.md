# Drift Ledger + Interpretation Register — The Frame Gate build

**Teeth:** no new work on a module scoring < 7 on any dimension until the score is raised.
Scores are set by the DISTINCT K7 reviewer — never by the builder.

## Drift entries

| ID | Location | Drift | Score (K7) | Status |
|---|---|---|---|---|
| DR-01 | MOD-02 · S3 §5 REF-02 row vs `tests/ports/external-isolation.test.ts` | The authoritative §5 `Test name` resolves to **zero cases** under the declared `vitest -t` command. Verified: `-t "test_external_import_outside_ports_is_malformed"` reports 7 skipped, 0 run. The refusal row does not bind to an executable case, which is the one property the `Test name` column exists to provide | **6** (K7 round 1, CC-4, deduction 4) | OPEN → addressed this round |
| DR-02 | MOD-02 · `INSTRUMENTS/drift-ledger.md` | A handoff conflict (S3 §5 vs facet F1 on REF-02's test name) was resolved in code with no Interpretation Register entry and no F-supersession proposal | **6** (K7 round 1, CC-3, deduction 2) | OPEN → addressed this round |
| DR-03 | MOD-02 · `src/ports/index.ts:108` | `mayOnlyPropose` is exported, unused, untested, and named nowhere in S3 OBJ-38 | **6** (K7 round 1, CC-7, deduction 1) | OPEN → addressed this round |
| DR-04 | `.metaframework/project.json` | `rederive_all` names `tools/rederive-impl.ts`, which does not exist; the repo's driver is `tools/rederive.py`. Not blocking at MOD-02 (no vectors) but blocks MOD-04 | (K7 round 1, CC-5, no deduction — out of MOD-02 scope) | OPEN → addressed this round |

## Interpretation Register (decisions the handoff did not make)

| ID | Decision taken | Class (benign/latent/conflicting) | Route (local / F-supersession / AE-link) |
|---|---|---|---|
| IR-01 | **BOTTOM and ABSENT are modelled as tagged variants, never null/undefined.** `{kind:'no-bar',cause,discharge}` and `{kind:'absent',discharge}`. The handoff requires that neither may be coalesced; it does not say how to make that true in a language whose null-coalescing operators are idiomatic. Tagged variants make `??` and `||` **inert** on these types rather than merely discouraged | benign | local (ADR-001, owner-accepted) |
| IR-02 | **`tsc --noEmit` runs inside `test_command`.** Six refusals demand rejection at parse; a transpile-only run would bypass a third of the guard set. The handoff names the requirement, not the enforcement point | benign | local (ADR-001 action 6) |
| IR-03 | **The two Phase rosters are added to `scaffold_exempt`.** They are digest-pinned in `roster-manifest.json`, so editing them to substitute the concept placeholder would fail the rosters check. That placeholder documents a filename template — the same reason the emission contract is exempt by default. `governance/S3/` stays non-exempt | benign | local |
| IR-04 | **`governance/S3/README.md` was rewritten** to describe this anchor rather than carrying the template's placeholder text. It is our directory index, not part of the frozen spec | benign | local |
| IR-05 | **VEC-03 rows 2-3 will be authored as regression vectors for the DG-F5 statistic, not as conformance vectors for the spec** — the spec pins the floor, not the spread. Their discharge condition says so | latent | AE-link: DG-F5 |
| IR-06 | **VEC-05 will assert an inequality (the two digests differ), not a literal hex**, until the external digest pin is confirmed against the `hex-sha256` encoding the S3 declares | latent | AE-link: SEAM-26 / C4-F2 |
| IR-07 | **A single-currency configuration is left unguarded for now.** Behaviour is defined (every draw vacuously reachable) and the concept silently never fires. A startup validation is proposed rather than added, because the refusal set is inherited and Phase 4 mints none | latent | F-supersession candidate (C4-F3) |
| IR-08 | **A scope ceiling of zero is left unguarded for now**, same reasoning as IR-07 | latent | F-supersession candidate (C4-F4) |
| IR-09 | **MOD-02's port interfaces are parameterised over the kernel types they transport, rather than importing them.** F1 records a hard MOD-02 -> MOD-01 dependency while S3 s10 puts `ports/` first in the build order; the two cannot both be satisfied by an import. Parameterising honours both — the height/fact binding is preserved at the use site, where MOD-05 supplies the real kernel types, and MOD-02 compiles alone. It is also the truer reading of F1's own boundary ("a port transports, it does not validate domain rules"): a transport that named the fact type would be asserting something about the cargo. **Alternative rejected:** build a kernel type stub inside this rung, which would put two modules in one rung and make the CC-1 file column lie | benign | local; revisit at MOD-05 when the use site binds |
| IR-10 | **`@types/node` is enabled globally rather than only for `tools/` and `tests/`.** This makes node builtins type-visible inside `src/`, where ER-5 forbids naming them outside `ports/`. The isolation rule is not weakened: TypeScript cannot express "only MOD-02 may import node:crypto" under any configuration, which is exactly why REF-02 exists as an AST pass. Splitting tsconfigs to narrow ambient types would buy no enforcement and would add a second compiler configuration to keep honest | benign | local |

## Log

- **2026-09-09 — ledger opened at C4 anchor.** S3 anchored at `s3-anchor-v1.0`; emission gate clean;
  C4 verdict PROCEED with four findings (C4-F1..F4), none halt-class. Eight interpretations
  registered before any code. IR-01 is the load-bearing one: it is what makes the handoff's
  no-coalescing requirement true in this runtime rather than aspirational.
