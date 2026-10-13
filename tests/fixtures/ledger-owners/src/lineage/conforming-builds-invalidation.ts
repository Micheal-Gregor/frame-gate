// OWNERSHIP, judged as if at src/lineage/: the lineage module may build invalidations.
import type { RecordHeight } from "../../../../../src/kernel/index.js";
export const entry = (commitment: RecordHeight, scopeAt: RecordHeight) => ({ author: "HUMAN" as const, payload: { kind: "invalidation" as const, commitment, scopeAt } });
