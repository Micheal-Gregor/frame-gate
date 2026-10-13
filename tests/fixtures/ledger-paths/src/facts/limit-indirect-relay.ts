// LIMIT (R-15): a relay reached through `.call` resolves to the library's Function member,
// not to the relay, so this second path is not seen (act-signatures registers the same).
import type { RecordHeight } from "../../../../../src/kernel/index.js";
import type { RecordPort } from "../../../../../src/ports/index.js";
import type { CandidatePayload } from "../../../../../src/facts/index.js";
type Port = RecordPort<unknown, RecordHeight>;
function relay<T extends { readonly author: string }>(record: Port, entry: T): RecordHeight {
  return record.append(entry);
}
export const sneak = (record: Port, payload: CandidatePayload) =>
  relay.call(undefined, record, { author: "ENGINE" as const, payload });
