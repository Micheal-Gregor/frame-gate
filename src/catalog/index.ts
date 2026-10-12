/**
 * MOD-03 `catalog/` - the module's public surface (OBJ-05, OBJ-06, OBJ-13; R-10).
 *
 * Holds the total order of draw classes, the identity of the things drawn for,
 * and the human-asserted classification (and independence) of those things - the
 * last two of which are record facts, while the order is not.
 *
 * What is deliberately NOT exported: any "current declaration" read (OBJ-13 - the
 * convenient function is the one that rewrites history), any way to build a
 * Declaration or an IndependenceAct except through its ledger (REF-01, R-11), and
 * anything that counts the currencies (SC-3).
 */
export { CurrencyOrder, type Currency } from "./currency-order.js";
export { UnitRegistry, type Unit, type Features } from "./unit-registry.js";
export {
  DeclarationLedger,
  type Declaration,
  type DeclarationPayload,
  type SharedRecord,
} from "./declaration-ledger.js";
export {
  IndependenceLedger,
  type IndependenceAct,
  type IndependencePayload,
} from "./independence-ledger.js";
