// K7 round 7 (DR-24): the key computed - still the property named kind.
import type { SharedRecord, Unit } from "../../../src/catalog/index.js";
export const forge = (record: SharedRecord, unit: Unit) =>
  record.append({ author: "HUMAN", payload: { ["kind"]: "declaration", unit, level: "L1" } });
