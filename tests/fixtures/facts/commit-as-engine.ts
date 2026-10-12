// OBJ-31 closed_by HUMAN_ACT: the ENGINE may propose; it may not commit.
import type { Currency, Unit } from "../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../src/facts/index.js";
export const engineCommits = (ledger: CommitmentLedger, unit: Unit, currency: Currency) =>
  ledger.commit(unit, currency, "ENGINE");
