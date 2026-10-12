// HOOK-07, author half (R-11): the ENGINE may propose; it may not declare.
import type { DeclarationLedger, Unit } from "../../../src/catalog/index.js";
export const engineDeclares = (ledger: DeclarationLedger, unit: Unit) =>
  ledger.declare(unit, "L1", "ENGINE");
