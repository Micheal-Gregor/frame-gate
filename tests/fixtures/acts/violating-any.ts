// REF-06: an act whose parameter is `any`.
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
export function actOnAny(record: Port, proposal: any): RecordHeight {
  return record.append({ author: "HUMAN", note: String(proposal) });
}
