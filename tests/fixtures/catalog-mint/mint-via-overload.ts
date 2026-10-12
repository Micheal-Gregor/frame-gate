// K7 round 7 (DR-23): an OVERLOAD signature promises a Declaration; the
// implementation signature, which the compiler checks the body against, returns object.
import type { Declaration } from "../../../src/catalog/index.js";
export function classify(raw: object): Declaration;
export function classify(raw: object): object {
  return raw;
}
