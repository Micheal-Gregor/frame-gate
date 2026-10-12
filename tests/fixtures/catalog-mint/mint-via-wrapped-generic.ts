// A laundering generic that returns T WRAPPED: no call ever returns a branded type,
// so the call-site rule (generic-launder) cannot see it. Its root - `x as T` on a
// bare type parameter - is what the check flags.
import type { Declaration } from "../../../src/catalog/index.js";
function wrap<T>(x: unknown): { readonly v: T } {
  return { v: x as T };
}
export const classify = (raw: object): Declaration => wrap<Declaration>(raw).v;
