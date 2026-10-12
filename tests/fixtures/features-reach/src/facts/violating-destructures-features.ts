// R-22: the method destructured out of the registry.
import type { Unit, UnitRegistry } from "../../../../../src/catalog/index.js";
export function read(registry: UnitRegistry, unit: Unit) {
  const { features } = registry;
  return features.call(registry, unit);
}
