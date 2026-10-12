// Height arithmetic spelled through an alias: the text never says "RecordHeight".
import { height, type RecordHeight } from "../../../src/kernel/index.js";
type H = RecordHeight;
export function sum(a: H, b: H): H {
  return height(a + b);
}
