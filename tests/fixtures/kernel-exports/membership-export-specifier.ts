// K7 round 4 (CC-6): a local predicate exported through `export { }` carries no
// export modifier of its own, and is renamed on the way out.
import type { Projection } from "../../../src/kernel/index.js";
function looksLikeOne(x: unknown): x is Projection<number> {
  return typeof x === "object" && x !== null && "compute" in x;
}
export { looksLikeOne as shaped };
