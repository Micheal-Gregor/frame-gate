// OWNERSHIP, judged as if at src/condition/: the condition module may build prompt revisions.
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
export const entry = (unit: Unit, currency: Currency, condition: string) => ({ author: "HUMAN" as const, payload: { kind: "prompt-revision" as const, unit, currency, condition } });
