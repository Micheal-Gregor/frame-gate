// REF-10 at parse (BC-06-3, IR-87): a sample is asked for ONE identity; two do not compile.
import type { Currency, Unit } from "../../../src/catalog/index.js";
import type { ConditionIdentity, Samples } from "../../../src/condition/index.js";
export const asOne = (samples: Samples, unit: Unit, currency: Currency, a: ConditionIdentity, b: ConditionIdentity) => samples.of(unit, currency, [a, b]);
