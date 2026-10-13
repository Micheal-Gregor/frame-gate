// POSITIVE CONTROL (REF-09): arithmetic over the SCORED components alone compiles.
import { scoredComponents, type Observation } from "../../../src/observation/index.js";
export const total = (o: Observation) => scoredComponents(o).reduce((sum, c) => sum + c.score, 0);
