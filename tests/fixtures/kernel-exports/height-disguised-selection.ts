// Looks like a selection, but one branch manufactures a height. A selection
// test that read only the first branch would admit it.
import { height, type RecordHeight } from "../../../src/kernel/index.js";
export const latestOrSum = (a: RecordHeight, b: RecordHeight): RecordHeight =>
  a > b ? a : height(a + b);
