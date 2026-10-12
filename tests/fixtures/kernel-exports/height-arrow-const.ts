// Height arithmetic bound to a const.
import { height, type RecordHeight } from "../../../src/kernel/index.js";
export const later = (a: RecordHeight, b: RecordHeight): RecordHeight => height(Math.max(a, b));
