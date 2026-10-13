// SEAM-19 at parse: a candidate proposal that omits `from` - the commitment it derives from,
// which MOD-12's signature must cover - is malformed at parse, not false at runtime.
import type { RecordHeight } from "../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../src/catalog/index.js";
import type { CandidateLedger, DrawContext } from "../../../src/facts/index.js";
export const draw = (ledger: CandidateLedger, context: DrawContext, unit: Unit, currency: Currency, at: RecordHeight) =>
  ledger.appendCandidate({ context, unit, currency, condition: "c", seed: "s" }, "sig", at, "ENGINE");
