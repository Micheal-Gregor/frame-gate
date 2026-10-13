// LIMIT (R-15; K7 round 8, DR-29; registered by R-31): members declared in LIBRARY types are
// not recursed, so an act taking an Error - whose `cause` is `unknown` - is not flagged.
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
export function actOnError(record: Port, why: Error): RecordHeight {
  return record.append({ author: "HUMAN", note: why.message });
}
