// K7 round 6: an exported FREE FUNCTION answering "now" - the old check saw only classes.
import { height } from "../../../../src/kernel/index.js";
import type { DeclarationLedger, Unit } from "../../../../src/catalog/index.js";
export function currentOf(ledger: DeclarationLedger, unit: Unit) {
  return ledger.declarationAt(unit, height(Number.MAX_SAFE_INTEGER));
}
