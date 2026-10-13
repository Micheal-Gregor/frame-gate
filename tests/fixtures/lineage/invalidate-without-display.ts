// REF-07 at parse (BC-12-9, R-48): an invalidation takes only a DisplayedScope, which only
// `display` mints - an undisplayed scope value does not compile.
import type { RecordHeight } from "../../../src/kernel/index.js";
import type { InvalidationLedger, ScopeValue } from "../../../src/lineage/index.js";
export const undisplayed = (ledger: InvalidationLedger, scope: ScopeValue, at: RecordHeight) => ledger.invalidate({ scope }, "HUMAN", at);
