// REF-06: an append inside an inline closure belongs to the method around it, even
// when the closure is handed to forEach rather than called.
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
export class ClosureAct {
  readonly #record: Port;
  constructor(record: Port) {
    this.#record = record;
  }
  act(proposal: unknown): void {
    [String(proposal)].forEach((note) => {
      this.#record.append({ author: "HUMAN", note });
    });
  }
}
