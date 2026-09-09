# Repo setup — delete this file at C4 close

RD-14 exists because a register that misdescribes its artifact hides every other
failure. A setup block living inside CLAUDE.md is that failure in miniature: it
instructs its own deletion, and if the deletion is forgotten it stays in the one
document re-injected after every compaction. So the scaffold lives here, in a
file whose removal is checkable, rather than in the contract.

1. Commit the Phase 3 exports into `governance/S3/` — the spec docx/md AND the
   original `CLAUDE_<Concept>_Phase3.md`. Tag the commit `s3-anchor-v1.0`. These
   files are FROZEN — superseded via backflow, never edited.
2. Replace the placeholder section of `CLAUDE.md` with the FULL CONTENT of
   `CLAUDE_<Concept>_Phase3.md` (the disambiguation rename the file itself
   mandates: in its own repo root it becomes THE CLAUDE.md). Keep the "Phase 4
   process contract" section and append it after the Phase 3 content. Keep the
   result under 200 lines — it is re-injected after every compaction, and length
   reduces adherence rather than increasing it.
3. Substitute `<Concept>` / `<CONCEPT>` throughout the instruments and guides.
   `tools/phase4-checks.py scaffold` fails until you do; that failure is the
   remaining to-do list, and C4 does not close while it stands.
4. Fill `.metaframework/project.json` — every command is declared, never
   inferred. Generate `.metaframework/roster-manifest.json` per `HARNESS.md`.
5. Confirm `.claude/settings.json` wires `gate.py`, and that each checker exits 0.
6. Delete this file. `git rm SETUP.md`
