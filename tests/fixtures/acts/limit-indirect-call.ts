// LIMIT (R-15): an indirect call - `.call`, `.apply`, `Reflect.apply` - resolves to
// the library's Function member, not to the act, so it is not followed.
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
const write = (record: Port, note: string): RecordHeight => record.append({ author: "HUMAN", note });
export function actIndirectly(record: Port, proposal: unknown): RecordHeight {
  return write.call(undefined, record, String(proposal));
}
