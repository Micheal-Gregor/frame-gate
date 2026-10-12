// K7 round 5 (DR-11): asserts the SHAPE, not the brand - "has a member that takes
// a height", the property S3 section 11 says the family must never be derived from.
import type { RecordHeight } from "../../../src/kernel/index.js";
export const looksComputable = (x: unknown): x is { compute(at: RecordHeight): unknown } =>
  typeof x === "object" && x !== null && "compute" in x;
