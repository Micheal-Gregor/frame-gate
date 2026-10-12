// K7 round 7 (WI-02): a fold over a collection PARAMETER, not a rest parameter.
import { height, type RecordHeight } from "../../../src/kernel/index.js";
export const foldAll = (hs: readonly RecordHeight[]): RecordHeight => height(Math.max(0, ...hs));
