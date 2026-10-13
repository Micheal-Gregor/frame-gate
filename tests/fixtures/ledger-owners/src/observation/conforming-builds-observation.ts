// OWNERSHIP, judged as if at src/observation/: the observation module may build observations.
import type { RecordHeight } from "../../../../../src/kernel/index.js";
export const entry = (candidate: RecordHeight) => ({ author: "ENGINE" as const, payload: { kind: "observation" as const, candidate, components: [] } });
