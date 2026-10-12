// REGISTERED LIMIT (IR-41): property covariance, array covariance's sibling. A
// { d: Declaration } is assignable to { d: object }, and writing through the wider
// alias puts a non-Declaration where the narrower type promises one. The check does
// NOT flag it - TypeScript's own type system lets it through.
import type { Declaration } from "../../../src/catalog/index.js";
export function classify(genuine: Declaration, raw: object): Declaration {
  const holder: { d: Declaration } = { d: genuine };
  const wide: { d: object } = holder;
  wide.d = raw;
  return holder.d;
}
