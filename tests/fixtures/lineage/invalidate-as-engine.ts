// OBJ-18 (BC-12-10): an invalidation is authored by a human - the ENGINE does not compile.
import type { RecordHeight } from "../../../src/kernel/index.js";
import type { DisplayedScope, InvalidationLedger } from "../../../src/lineage/index.js";
export const engineInvalidates = (ledger: InvalidationLedger, shown: DisplayedScope, at: RecordHeight) => ledger.invalidate(shown, "ENGINE", at);
