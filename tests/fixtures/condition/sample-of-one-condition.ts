// POSITIVE CONTROL (BC-06-3): one identity, one sample.
import type { Currency, Unit } from "../../../src/catalog/index.js";
import type { ConditionIdentity, Samples } from "../../../src/condition/index.js";
export const one = (samples: Samples, unit: Unit, currency: Currency, a: ConditionIdentity) => samples.of(unit, currency, a);
