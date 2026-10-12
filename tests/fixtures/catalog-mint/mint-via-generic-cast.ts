// K7 round 6 E1b: a generic identity cast. Inside it the assertion's type is the
// type parameter T, which carries no brand; the brand arrives at the call site.
import type { Declaration } from "../../../src/catalog/index.js";
function cast<T>(x: unknown): T {
  return x as T;
}
export const classify = (raw: object): Declaration => cast<Declaration>(raw);
