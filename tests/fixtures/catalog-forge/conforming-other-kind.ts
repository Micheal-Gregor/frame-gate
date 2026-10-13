// MUST NOT be flagged: a fact of a kind NO ledger owns. (Its kind was "observation" until MOD-07
// made that a ledger kind; the intent is a kind outside every ledger.)
import type { SharedRecord } from "../../../src/catalog/index.js";
export const observe = (record: SharedRecord) =>
  record.append({ author: "ENGINE", payload: { kind: "telemetry", score: 1 } });
