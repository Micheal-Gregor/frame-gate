// R-38: asProjection reached through .apply and .bind - two indirect joins.
import { asProjection, type RecordHeight } from "../../../../../src/kernel/index.js";
export const viaApply = asProjection.apply(undefined, ["Ratio", (at: RecordHeight) => Number(at)]);
export const viaBind = asProjection.bind(undefined, "Ratio")((at: RecordHeight) => Number(at));
