// DR-32: asProjection reached through Function.prototype.call - a wrong-module join, indirectly.
import { asProjection, type Projection, type RecordHeight } from "../../../../../src/kernel/index.js";
export const ratio = asProjection.call(undefined, "Ratio", (at: RecordHeight) => Number(at));
