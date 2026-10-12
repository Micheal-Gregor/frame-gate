// POSITIVE CONTROL (R-22): features GIVEN as a value of the catalog's type, and another
// registry method called - neither is a read of unit features.
import type { Features, UnitRegistry } from "../../../../../src/catalog/index.js";
export const record = (registry: UnitRegistry, id: string, features: Features) => ({ unit: registry.unit(id), features });
