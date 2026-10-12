// The kind through a const (its type is still the literal), as a shorthand property.
import type { SharedRecord, Unit } from "../../../src/catalog/index.js";
const kind = "independence";
export const license = (record: SharedRecord, unit: Unit) =>
  record.append({ author: "HUMAN", payload: { kind, unit, independent: true } });
