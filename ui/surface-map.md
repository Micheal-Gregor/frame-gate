# Surface map

What the UI surfaces today. Read this instead of the codebase when simulating. Updated at the
end of every build. The utilization audit compares the operations listed here against the
library's public operations.

| View | User job | Library operations called | Faces | Built in batch |
|---|---|---|---|---|
| Shell - cell navigation (`ui/index.html`, `ui/app/main.ts`, `ui/app/layout.css`) | Move between a scene's cells: the rail on a desktop, the cell picker in the top bar on a tablet or phone | `UnitRegistry.unit`, `CurrencyOrder.currencies` | screen: phone (≤640), tablet (≤1024), desktop | 1 |
| Cell review (`ui/app/main.ts`, `#<cell>` or `#<cell>/<take>`) | C3: review the takes of the spec the diagnostic read, score one, read the diagnostic with every withheld reason. C4: approve a take, never blocked by the diagnostic, and see I2V open | `DeclarationLedger.declarationAt`, `Diagnostic.of`, `Samples.of`, `ObservationLedger.observationOf`, `ObservationLedger.observe`, `CommitmentLedger.effectiveCommitment`, `CommitmentLedger.commit`, `ReachabilityGate.evaluate`, `score`, `dischargeable`, `isAbsent` | screen: phone (one column, approve stuck to the bottom), tablet (takes across, approve and diagnostic below), desktop (takes left, diagnostic and approve right) | 1 |
| Budget (`ui/app/main.ts`, the cell's Budget card) | C2: see the scope in force for the cell's stills (ceiling, estimate as given), what remains, the scope's own answer to the next draw, and the draws so far; authorize a new scope from a form built at the same height. A stop condition is not offered yet | `ScopeReader.governing`, `ScopeGate.remaining`, `ScopeGate.admitsDraw`, `Ratio.of`, `AuthorizationForms.build`, `ScopeLedger.authorize` | screen: phone (last card), tablet (under approve), desktop (right column, under approve) | 2 |
| Demo scene (`ui/app/demo.ts`, on an empty record) | Start the board with invented acts recorded through the library | `DeclarationLedger.declare`, `IndependenceLedger.declareIndependence`, `AuthorizationForms.build`, `ScopeLedger.authorize`, `DrawContextLog.recordDraw`, `SignatureGate.materialOf`, `SignatureGate.sign`, `CandidateLedger.appendCandidate`, `CommitmentLedger.commit`, `ObservationLedger.observe`, `score`, `dischargeable` | screen | 1 |
