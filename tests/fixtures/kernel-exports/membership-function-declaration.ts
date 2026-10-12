// The form the original detector saw. Kept so the widening cannot lose it.
import type { Projection } from "../../../src/kernel/index.js";
export function isProjection(x: unknown): x is Projection<unknown> {
  return typeof x === "object" && x !== null && "compute" in x;
}
