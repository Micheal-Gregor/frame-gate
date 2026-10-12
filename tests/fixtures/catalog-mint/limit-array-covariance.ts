// REGISTERED LIMIT (R-14, IR-41), not a conforming example. TypeScript's arrays are
// covariant and unsound: a Declaration[] is assignable to object[], and pushing
// through the wider alias writes a non-Declaration into the narrower one. No
// assertion, no any, no overload - the type system itself lets it through. This
// fixture pins the limit: the check does NOT flag it.
import type { Declaration } from "../../../src/catalog/index.js";
export function classify(raw: object): Declaration | undefined {
  const slot: Declaration[] = [];
  const wide: object[] = slot;
  wide.push(raw);
  return slot[0];
}
