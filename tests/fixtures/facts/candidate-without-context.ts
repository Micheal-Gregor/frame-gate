// REF-05 at parse on the candidate path (R-31): a candidate proposal with no draw context.
import type { RecordHeight } from "../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../src/catalog/index.js";
import type { CandidateLedger, Commitment } from "../../../src/facts/index.js";
export const draw = (ledger: CandidateLedger, unit: Unit, currency: Currency, from: Commitment, at: RecordHeight) =>
  ledger.appendCandidate({ unit, currency, condition: "c", seed: "s", from }, "sig", at, "ENGINE");
