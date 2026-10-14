# Gap log

Engine gaps found while surfacing the library. The test: does the feature need the engine to
decide, record, or enforce something it doesn't already? If it only changes how something is
shown, it is not a gap — build it in the view.

A claim needs evidence, not absence of memory: name the interface-contract entries checked and
the compositions tried, and why each fails. States: `noticed` → `withdrawn` (it existed; name
the operation) or `shaped` → `ready`. An entry is `ready` when all three hold: no composition of
existing operations covers it; it came up in more than one walk, or it blocks a chosen job; the
owner agrees the shaped behaviour is the real need. Ready entries go to a Phase 1–4 extension
run, batched with related entries.

| ID | User job | Engine must decide / record / enforce | Walk it came from | Lookup evidence | State |
|---|---|---|---|---|---|

## Shaped detail

(For each `shaped` or `ready` entry: inputs, outputs, rules, and a worked example taken from the
simulation. Describe the need, not a class design — Phase 1 derives the component.)
