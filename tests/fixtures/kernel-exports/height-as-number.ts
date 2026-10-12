// R-09: a height's value leaves the type as a plain number. No arithmetic happens
// here - it lets the arithmetic happen anywhere else. Flagged by owner ruling.
import type { RecordHeight } from "../../../src/kernel/index.js";
export const asNumber = (h: RecordHeight): number => h;
