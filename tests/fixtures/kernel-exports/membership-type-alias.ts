// K7 round 4 (CC-6): the asserted type is an alias, so its text never says "Projection".
import type { Projection } from "../../../src/kernel/index.js";
type Derived = Projection<string>;
export function isDerived(x: unknown): x is Derived {
  return typeof x === "object" && x !== null && "compute" in x;
}
