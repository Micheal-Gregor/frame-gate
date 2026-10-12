// An assertion signature answers the same question by throwing instead of returning.
import type { Projection } from "../../../src/kernel/index.js";
export function assertProjection(x: unknown): asserts x is Projection<unknown> {
  if (typeof x !== "object" || x === null) throw new Error("not one");
}
