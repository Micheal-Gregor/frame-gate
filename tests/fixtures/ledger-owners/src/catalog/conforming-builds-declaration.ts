// OWNERSHIP, judged as if at src/catalog/: the catalog builds its own kind.
import type { Unit } from "../../../../../src/catalog/index.js";
export const entry = (unit: Unit, level: string) => ({ author: "HUMAN" as const, payload: { kind: "declaration" as const, unit, level } });
