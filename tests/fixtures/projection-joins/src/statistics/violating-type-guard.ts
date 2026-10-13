// WI-12: a USER type guard asserting a Projection - catalog-mint's type-guard, for this brand.
import { asProjection, type Projection, type RecordHeight } from "../../../../../src/kernel/index.js";
export function isProjection(x: unknown): x is Projection<number> {
  return typeof x === "object" && x !== null;
}
export function assertProjection(x: unknown): asserts x is Projection<number> {
  if (typeof x !== "object" || x === null) throw new TypeError("not a Projection");
}
