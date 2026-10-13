// POSITIVE CONTROL: the same proposal, drawn under a context recordDraw minted.
import type { RecordHeight } from "../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../src/catalog/index.js";
import type { CandidateLedger, Commitment, DrawContext } from "../../../src/facts/index.js";
export const draw = (ledger: CandidateLedger, context: DrawContext, unit: Unit, currency: Currency, from: Commitment, at: RecordHeight) =>
  ledger.appendCandidate({ context, unit, currency, condition: "c", seed: "s", from }, "sig", at, "ENGINE");
