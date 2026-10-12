// R-22 / RD-13: the same read, spelled with a literal element key.
import type { Unit, UnitRegistry } from "../../../../../src/catalog/index.js";
export const read = (registry: UnitRegistry, unit: Unit) => registry["features"](unit);
