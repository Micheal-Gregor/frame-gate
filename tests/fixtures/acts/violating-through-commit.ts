// REF-06: a function that commits through the real CommitmentLedger is an act, and
// one that takes the engine's reason for committing takes a proposal into an act.
import type { Currency, Unit } from "../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../src/facts/index.js";
export function commitBecause(ledger: CommitmentLedger, unit: Unit, currency: Currency, because: unknown) {
  void because;
  return ledger.commit(unit, currency, "HUMAN");
}
