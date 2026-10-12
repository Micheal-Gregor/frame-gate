// K7 round 7 (WI-02): a successor that answers later is still a successor.
import { height, type RecordHeight } from "../../../src/kernel/index.js";
export const later = async (h: RecordHeight): Promise<RecordHeight> => height(h + 1);
