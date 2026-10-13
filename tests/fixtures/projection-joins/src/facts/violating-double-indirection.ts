// WI-12: asProjection handed to a library function - Function.prototype.call.call.
import { asProjection, type Projection, type RecordHeight } from "../../../../../src/kernel/index.js";
export const ratio = Function.prototype.call.call(asProjection, undefined, "Ratio", (at: RecordHeight) => Number(at)) as unknown;
