// REF-06: an act reached through a helper or a private method is still an act -
// acts are found to a fixed point, so the public signature is the one judged.
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
const write = (record: Port, note: string): RecordHeight => record.append({ author: "HUMAN", note });
export function propose(record: Port, proposal: unknown): RecordHeight {
  return write(record, String(proposal));
}
export class Wrapped {
  readonly #record: Port;
  constructor(record: Port) {
    this.#record = record;
  }
  act(proposal: unknown): RecordHeight {
    return this.#write(String(proposal));
  }
  #write(note: string): RecordHeight {
    return this.#record.append({ author: "HUMAN", note });
  }
}
