// OWNERSHIP, judged as if at src/catalog/: the catalog may build declarations, not
// commitments - a commitment-kind entry built here is a forge (BC-05-6).
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
export const entry = (unit: Unit, currency: Currency) => ({ author: "HUMAN" as const, payload: { kind: "commitment" as const, unit, currency } });
