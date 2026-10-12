// K7 round 5 (DR-14): an offset - a height and a number in, a height out.
import { height, type RecordHeight } from "../../../src/kernel/index.js";
export const advance = (h: RecordHeight, n: number): RecordHeight => height(h + n);
