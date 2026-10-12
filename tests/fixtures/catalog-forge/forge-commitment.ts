// BC-05-6: a commitment written straight to the shared record from outside MOD-05 -
// the DR-18 defect, for the commit path. A commitment is a HUMAN act through its ledger.
import type { Currency, SharedRecord, Unit } from "../../../src/catalog/index.js";
export const forge = (record: SharedRecord, unit: Unit, currency: Currency) =>
  record.append({ author: "HUMAN", payload: { kind: "commitment", unit, currency } });
