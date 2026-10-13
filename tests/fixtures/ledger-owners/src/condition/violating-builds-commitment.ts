// OWNERSHIP, judged as if at src/condition/: a commitment-kind entry built here is a forge (BC-05-6).
import type { RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
export const entry = (unit: Unit, currency: Currency, candidate: RecordHeight) => ({ author: "HUMAN" as const, payload: { kind: "commitment" as const, unit, currency, candidate } });
