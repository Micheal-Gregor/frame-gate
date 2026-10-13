// POSITIVE CONTROL (BC-12-9): derive and display, then invalidate.
import type { RecordHeight } from "../../../src/kernel/index.js";
import type { Commitment } from "../../../src/facts/index.js";
import type { InvalidationLedger } from "../../../src/lineage/index.js";
export const shownThenInvalidated = (ledger: InvalidationLedger, k: Commitment, at: RecordHeight) => ledger.invalidate(ledger.display(k, at), "HUMAN", at);
