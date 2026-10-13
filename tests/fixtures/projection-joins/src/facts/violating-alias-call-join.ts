// WI-12: asProjection by ALIAS, then .call - recognised by its TYPE.
import { asProjection, type Projection, type RecordHeight } from "../../../../../src/kernel/index.js";
const j = asProjection;
export const ratio = j.call(undefined, "Ratio", (at: RecordHeight) => Number(at));
