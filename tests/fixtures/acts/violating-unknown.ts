// REF-06: an act whose parameter is `unknown` - a diagnostic is assignable to it.
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
export function actOnUnknown(record: Port, proposal: unknown): RecordHeight {
  return record.append({ author: "HUMAN", note: String(proposal) });
}
