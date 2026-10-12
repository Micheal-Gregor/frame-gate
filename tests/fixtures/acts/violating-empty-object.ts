// REF-06: `{}` admits every non-nullish value, and so does an empty interface.
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
const write = (record: Port, note: string): RecordHeight => record.append({ author: "HUMAN", note });
interface Anything {}
export function actOnEmpty(record: Port, proposal: {}): RecordHeight {
  return write(record, String(proposal));
}
export function actOnEmptyInterface(record: Port, proposal: Anything): RecordHeight {
  return write(record, String(proposal));
}
