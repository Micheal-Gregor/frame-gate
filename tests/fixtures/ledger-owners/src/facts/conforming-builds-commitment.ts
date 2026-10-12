// OWNERSHIP, judged as if at src/facts/: the facts module builds its own kind.
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
export const entry = (unit: Unit, currency: Currency) => ({ author: "HUMAN" as const, payload: { kind: "commitment" as const, unit, currency } });
