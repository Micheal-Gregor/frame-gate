// REF-09 at parse (HOOK-02): a possibly-ABSENT component handed to Math.max is malformed.
import { component, type Observation } from "../../../src/observation/index.js";
export const bad = (o: Observation) => Math.max(component(o, "motion"), 1);
