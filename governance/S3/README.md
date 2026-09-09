# Frozen Phase 3 anchor — The Frame Gate

Anchored at tag `s3-anchor-v1.0`. **These files are frozen.** They are superseded through
backflow (`INSTRUMENTS/F-supersession-proposals.md` -> the Phase 3 project -> a new anchor tag),
never edited in place. `tools/gate.py` blocks writes here, including via Bash.

| File | Role |
|---|---|
| `CLAUDE_FrameGate_Phase3.md` | The build instruction Phase 4 parses. Eleven numbered sections; the numbering is load-bearing (the completion ledger cites section 11). |
| `CLAUDE_FrameGate_Phase2.md` | The S2 object model. Needed by `emission-check.py --phase2` for the cross-document checks. |
| `C0-coordinator.md` | The partition, the seam pricing that produced it, and the ODG-FG-01 / ODG-FG-02 resolutions. |
| `S5-K6-synthesis-and-conformance.md` | Synthesis record and the K6 conformance verdict (PASS). |
| `facets/F1..F5` | The five parallel facet slices the partition was specified in. |

Emission-check clean at anchor: the Phase 3 document conforms, cross-checked against the Phase 2
document.
