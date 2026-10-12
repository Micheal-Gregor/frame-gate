// A default export has no name in the source at all.
import type { Projection } from "../../../src/kernel/index.js";
export default function (x: unknown): x is Projection<unknown> {
  return typeof x === "object" && x !== null;
}
