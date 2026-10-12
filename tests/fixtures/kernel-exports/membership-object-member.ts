// A predicate living on an exported object literal.
import type { Projection } from "../../../src/kernel/index.js";
export const probes = {
  isProjection: (x: unknown): x is Projection<unknown> => typeof x === "object" && x !== null,
};
