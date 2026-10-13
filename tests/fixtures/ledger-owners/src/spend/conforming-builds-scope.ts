// OWNERSHIP, judged as if at src/spend/: the spend module may build scopes.
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
export const entry = (unit: Unit, currency: Currency) => ({ author: "HUMAN" as const, payload: { kind: "scope" as const, unit, currency, ceiling: 1, estimate: "e" } });
