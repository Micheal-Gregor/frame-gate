// K7 round 6 E1a: a Declaration minted through a value typed `any`. No assertion,
// no brand written - `any` is assignable to everything.
import type { Declaration } from "../../../src/catalog/index.js";
export function classify(raw: string): Declaration {
  const parsed = JSON.parse(raw);
  return parsed;
}
