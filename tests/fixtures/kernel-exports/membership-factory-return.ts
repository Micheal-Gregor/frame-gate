// K7 round 5 (DR-11): the predicate is not exported; a factory that returns it is.
import type { Projection } from "../../../src/kernel/index.js";
export const makeProbe = () => (x: unknown): x is Projection<unknown> => x !== null;
