// R-22 / RD-13: the method taken as a value through a literal element key.
import type { UnitRegistry } from "../../../../../src/catalog/index.js";
export const reader = (registry: UnitRegistry) => registry["features"].bind(registry);
