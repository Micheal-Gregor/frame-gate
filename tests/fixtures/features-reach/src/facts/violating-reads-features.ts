// R-22: MOD-05 reading unit features - F1 gives features(unit) to MOD-13 alone.
import type { Unit, UnitRegistry } from "../../../../../src/catalog/index.js";
export const read = (registry: UnitRegistry, unit: Unit) => registry.features(unit);
