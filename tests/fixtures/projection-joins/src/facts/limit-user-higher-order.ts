// LIMIT (R-15, R-39): asProjection handed to a NON-generic user higher-order function with a
// declared Projection return - neither a launder (no bare type parameter), nor a library call,
// nor a call resolved to asProjection inside it - so this wrong-module join is not seen.
import { asProjection, type Projection, type RecordHeight } from "../../../../../src/kernel/index.js";
const run = (f: (m: "Ratio", c: (at: RecordHeight) => number) => Projection<number>): Projection<number> => f("Ratio", (at) => Number(at));
export const ratio = run(asProjection);
