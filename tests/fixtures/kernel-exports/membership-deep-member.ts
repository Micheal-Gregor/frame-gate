// K7 round 5 (DR-11): four members down - past the old fixed depth of two.
import type { Projection } from "../../../src/kernel/index.js";
export const registry = {
  kinds: { derived: { probes: { isProjection: (x: unknown): x is Projection<unknown> => x !== null } } },
};
