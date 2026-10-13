// REF-06 after MOD-10 (R-76): a diagnostic is a CLOSED type, so the open-type rule cannot see an act
// that takes one. The Diagnostic brand can - bare, in a union, in a list, or in a field.
import type { Candidate, CommitmentLedger } from "../../../src/facts/index.js";
import type { DiagnosticValue } from "../../../src/diagnostic/index.js";
export function commitOnDiagnostic(ledger: CommitmentLedger, accepted: Candidate, diagnostic: DiagnosticValue) {
  void diagnostic;
  return ledger.commit(accepted, "HUMAN");
}
export function commitOnEither(ledger: CommitmentLedger, accepted: Candidate, basis: DiagnosticValue | string) {
  void basis;
  return ledger.commit(accepted, "HUMAN");
}
export function commitOnList(ledger: CommitmentLedger, accepted: Candidate, history: readonly DiagnosticValue[]) {
  void history;
  return ledger.commit(accepted, "HUMAN");
}
export function commitOnField(ledger: CommitmentLedger, accepted: Candidate, p: { readonly why: DiagnosticValue }) {
  void p;
  return ledger.commit(accepted, "HUMAN");
}
