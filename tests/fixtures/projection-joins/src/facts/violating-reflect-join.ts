// DR-32: asProjection reached through Reflect.apply.
import { asProjection, type Projection, type RecordHeight } from "../../../../../src/kernel/index.js";
export const ratio = Reflect.apply(asProjection, undefined, ["Ratio", (at: RecordHeight) => Number(at)]) as unknown;
