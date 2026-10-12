// K7 round 7 (WI-02): a successor that may answer nothing is still a successor.
import { height, type RecordHeight } from "../../../src/kernel/index.js";
export const after = (h: RecordHeight): RecordHeight | undefined => (h < 100 ? height(h + 1) : undefined);
