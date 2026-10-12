// R-10: independence is guarded exactly as a declaration is.
import type { IndependenceLedger, Unit } from "../../../src/catalog/index.js";
export const engineLicenses = (ledger: IndependenceLedger, unit: Unit) =>
  ledger.declareIndependence(unit, true, "ENGINE");
