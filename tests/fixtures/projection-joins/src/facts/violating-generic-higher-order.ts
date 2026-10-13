// R-39: asProjection handed to a GENERIC user higher-order function - the generic returns a bare
// type parameter instantiated to a Projection, so the launder rule decides it.
import { asProjection, type RecordHeight } from "../../../../../src/kernel/index.js";
const run = <A>(f: (m: "Ratio", c: (at: RecordHeight) => number) => A): A => f("Ratio", (at) => Number(at));
export const ratio = run(asProjection);
