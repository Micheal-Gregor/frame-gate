# Surface map

What the UI surfaces today. Read this instead of the codebase when simulating. Updated at the
end of every build. The utilization audit compares the operations listed here against the
library's public operations.

| View | User job | Library operations called | Faces | Built in batch |
|---|---|---|---|---|
| Shell - cell navigation (`ui/index.html`, `ui/app/main.ts`) | Move between a scene's cells | `UnitRegistry.unit`, `CurrencyOrder.currencies` | screen | 1 |
| Cell review (`ui/app/main.ts`, `#<cell>` or `#<cell>/<take>`) | C3: review the takes of the spec the diagnostic read, score one, read the diagnostic with every withheld reason. C4: approve a take, never blocked by the diagnostic, and see I2V open | `DeclarationLedger.declarationAt`, `Diagnostic.of`, `Samples.of`, `ObservationLedger.observationOf`, `ObservationLedger.observe`, `CommitmentLedger.effectiveCommitment`, `CommitmentLedger.commit`, `ReachabilityGate.evaluate` | screen | 1 |
| Demo scene (`ui/app/demo.ts`, on an empty record) | Start the board with invented acts recorded through the library | `DeclarationLedger.declare`, `IndependenceLedger.declareIndependence`, `AuthorizationForms.build`, `ScopeLedger.authorize`, `DrawContextLog.recordDraw`, `SignatureGate.materialOf`, `SignatureGate.sign`, `CandidateLedger.appendCandidate`, `CommitmentLedger.commit`, `ObservationLedger.observe` | screen | 1 |
