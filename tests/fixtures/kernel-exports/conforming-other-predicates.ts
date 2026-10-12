// Must NOT be flagged: predicates over other types, height ORDER (not arithmetic),
// and a one-height function. A detector that flags these refuses by default.
import { height, type RecordHeight, type UnknownValue } from "../../../src/kernel/index.js";
export const isText = (x: unknown): x is string => typeof x === "string";
export function isUnknownish(v: unknown): v is UnknownValue {
  return typeof v === "object" && v !== null && "kind" in v;
}
export const order = (a: RecordHeight, b: RecordHeight): -1 | 0 | 1 => (a < b ? -1 : a > b ? 1 : 0);
export const first = (): RecordHeight => height(0);
export class Holder {
  isText(x: unknown): x is string {
    return typeof x === "string";
  }
}
