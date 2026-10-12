// REF-06: `object` and the `Object` interface each admit every non-primitive.
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
const write = (record: Port, note: string): RecordHeight => record.append({ author: "HUMAN", note });
export function actOnObject(record: Port, proposal: object): RecordHeight {
  return write(record, String(proposal));
}
export function actOnObjectInterface(record: Port, proposal: Object): RecordHeight {
  return write(record, String(proposal));
}
