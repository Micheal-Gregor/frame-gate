// A directive that silences the refusal itself. Any one of these anywhere in the
// tree turns every parse-level guard into a suggestion.
import { height } from "../../../src/kernel/index.js";
import type { Declaration, Unit } from "../../../src/catalog/index.js";
export function classify(unit: Unit): Declaration {
  // @ts-expect-error - the brand is missing, and this comment says "never mind"
  return { author: "HUMAN", at: height(1), payload: { kind: "declaration", unit, level: "hard" } };
}
