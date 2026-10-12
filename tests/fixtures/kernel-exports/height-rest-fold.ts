// K7 round 5 (DR-14): a fold over any number of heights.
import { height, type RecordHeight } from "../../../src/kernel/index.js";
export const fold = (...hs: RecordHeight[]): RecordHeight => height(Math.max(0, ...hs));
