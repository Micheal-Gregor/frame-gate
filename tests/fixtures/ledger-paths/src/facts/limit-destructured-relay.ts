// LIMIT (R-15, R-32): a relay that receives its entry by DESTRUCTURING is not followed - the
// entry's declaration is a binding element, not a parameter - so this second path is unseen.
import type { RecordHeight } from "../../../../../src/kernel/index.js";
import type { RecordPort } from "../../../../../src/ports/index.js";
import type { CandidatePayload } from "../../../../../src/facts/index.js";
type Port = RecordPort<unknown, RecordHeight>;
const relay = <T extends object>({ record, entry }: { readonly record: Port; readonly entry: T }): RecordHeight =>
  record.append(entry);
export const sneak = (record: Port, payload: CandidatePayload) =>
  relay({ record, entry: { author: "ENGINE" as const, payload } });
