// OWNERSHIP, judged as if at src/facts/: the facts module may build commitments, not
// declarations - a declaration-kind entry built here is a forge (BC-05-6).
import type { Unit } from "../../../../../src/catalog/index.js";
export const entry = (unit: Unit, level: string) => ({ author: "HUMAN" as const, payload: { kind: "declaration" as const, unit, level } });
