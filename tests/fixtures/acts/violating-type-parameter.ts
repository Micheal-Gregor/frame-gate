// REF-06: a type parameter unconstrained, or constrained only to a top type, is
// instantiated to whatever the caller passes - a diagnostic included.
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
const write = (record: Port, note: string): RecordHeight => record.append({ author: "HUMAN", note });
export function actOnT<T>(record: Port, proposal: T): RecordHeight {
  return write(record, String(proposal));
}
export function actOnUnknownT<T extends unknown>(record: Port, proposal: T): RecordHeight {
  return write(record, String(proposal));
}
export function actOnObjectT<T extends object>(record: Port, proposal: T): RecordHeight {
  return write(record, String(proposal));
}
