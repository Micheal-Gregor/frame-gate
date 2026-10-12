// Height arithmetic exported through a specifier.
import { height, type RecordHeight } from "../../../src/kernel/index.js";
function gap(a: RecordHeight, b: RecordHeight): RecordHeight {
  return height(Math.abs(a - b));
}
export { gap as distance };
