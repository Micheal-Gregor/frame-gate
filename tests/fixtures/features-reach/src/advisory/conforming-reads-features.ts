// POSITIVE CONTROL: MOD-13 (advisory) is the one module F1 lets read unit features.
import type { Unit, UnitRegistry } from "../../../../../src/catalog/index.js";
export const difficultyInputs = (registry: UnitRegistry, unit: Unit) => registry.features(unit);
