// MUST NOT be flagged: passing on a Declaration the ledger produced, or one handed
// in, mints nothing. A detector that flagged these would pass by refusing all use.
import type { RecordHeight } from "../../../src/kernel/index.js";
import type { Declaration, DeclarationLedger, Unit } from "../../../src/catalog/index.js";
export const inForce = (l: DeclarationLedger, u: Unit, at: RecordHeight) => l.declarationAt(u, at);
export function keep(d: Declaration): Declaration {
  return d;
}
export const first = (ds: readonly Declaration[]): Declaration | undefined => ds.find(() => true);
