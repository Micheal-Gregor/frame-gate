// A predicate living on an exported class, statically and per instance.
import type { Projection } from "../../../src/kernel/index.js";
export class Classifier {
  static isProjection(x: unknown): x is Projection<unknown> {
    return typeof x === "object" && x !== null;
  }
  holds(x: unknown): x is Projection<boolean> {
    return typeof x === "object" && x !== null;
  }
}
