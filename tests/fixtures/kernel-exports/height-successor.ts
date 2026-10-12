// K7 round 5 (DR-14): a successor - one height in, the next height out.
import { height, type RecordHeight } from "../../../src/kernel/index.js";
export const next = (h: RecordHeight): RecordHeight => height(h + 1);
