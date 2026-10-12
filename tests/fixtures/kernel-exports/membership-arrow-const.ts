// K7 round 4 (CC-6): an arrow bound to an exported const is not a FunctionDeclaration.
import type { Projection } from "../../../src/kernel/index.js";
export const isProjection = (x: unknown): x is Projection<unknown> =>
  typeof x === "object" && x !== null && "compute" in x;
