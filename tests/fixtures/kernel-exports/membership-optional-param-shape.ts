// K7 round 7 (WI-03): the Projection SHAPE with an OPTIONAL height parameter.
import type { RecordHeight } from "../../../src/kernel/index.js";
export const looksComputable = (x: unknown): x is { compute(at?: RecordHeight): unknown } =>
  typeof x === "object" && x !== null && "compute" in x;
