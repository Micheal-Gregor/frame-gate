// A user-written predicate asserting the branded type: no assertion, no any.
import type { Declaration } from "../../../src/catalog/index.js";
function looksDeclared(x: unknown): x is Declaration {
  return typeof x === "object" && x !== null;
}
export function classify(x: unknown): Declaration | null {
  return looksDeclared(x) ? x : null;
}
