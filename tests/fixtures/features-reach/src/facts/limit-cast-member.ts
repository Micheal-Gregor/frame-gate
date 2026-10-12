// LIMIT (R-15): through a cast to a structural record of functions, the call resolves
// to the record's index signature, not to UnitRegistry.features.
import type { Unit, UnitRegistry } from "../../../../../src/catalog/index.js";
export const read = (registry: UnitRegistry, unit: Unit) =>
  (registry as unknown as Readonly<Record<string, (u: Unit) => unknown>>)["features"]?.(unit);
