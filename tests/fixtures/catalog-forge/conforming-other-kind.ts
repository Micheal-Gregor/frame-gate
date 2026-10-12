// MUST NOT be flagged: another module's own fact, with its own kind.
import type { SharedRecord } from "../../../src/catalog/index.js";
export const observe = (record: SharedRecord) =>
  record.append({ author: "ENGINE", payload: { kind: "observation", score: 1 } });
