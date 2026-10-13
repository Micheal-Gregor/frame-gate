// REF-09 at parse (HOOK-02): combining a possibly-ABSENT component with a value: + is malformed.
import { component, type Observation } from "../../../src/observation/index.js";
export const bad = (o: Observation) => component(o, "motion") + 1;
