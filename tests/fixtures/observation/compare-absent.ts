// REF-09 at parse (HOOK-02): a possibly-ABSENT component compared to a value is malformed.
import { component, type Observation } from "../../../src/observation/index.js";
export const bad = (o: Observation) => component(o, "motion") > 0.5;
