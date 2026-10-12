// MUST NOT be flagged (R-09): selections hand back one of their own inputs - possibly
// later, possibly nothing - and manufacture no height.
import type { RecordHeight } from "../../../src/kernel/index.js";
export const maybeLatest = (a: RecordHeight, b: RecordHeight): RecordHeight | undefined =>
  a > b ? a : b > a ? b : undefined;
export const latestLater = async (a: RecordHeight, b: RecordHeight): Promise<RecordHeight> => (a > b ? a : b);
export const firstOf = (hs: readonly RecordHeight[]): boolean => hs.length > 0;
