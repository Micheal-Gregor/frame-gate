// R-22: the method taken as a value, to be called later.
import type { UnitRegistry } from "../../../../../src/catalog/index.js";
export const reader = (registry: UnitRegistry) => registry.features.bind(registry);
