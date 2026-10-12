// K7 round 5 (DR-14): a delta - two heights in, a plain number out.
import type { RecordHeight } from "../../../src/kernel/index.js";
export const delta = (a: RecordHeight, b: RecordHeight): number => a - b;
