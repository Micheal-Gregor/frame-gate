// REF-01: a DERIVATION - a classification computed from a feature and returned AS
// a declaration. It must not compile: the Declaration brand has no runtime value,
// so nothing outside its ledger can build one (R-11). No ts-directive here; one
// would silence the very diagnostic this fixture exists to produce.
import { height } from "../../../src/kernel/index.js";
import type { Declaration, Unit } from "../../../src/catalog/index.js";
export function classify(unit: Unit, difficulty: number): Declaration {
  return {
    author: "HUMAN",
    at: height(1),
    payload: { kind: "declaration", unit, level: difficulty > 1 ? "hard" : "easy" },
  };
}
