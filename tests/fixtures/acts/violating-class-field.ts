// REF-06 / RD-12: the class-field arrow is an act too - the declaration FORM is not
// what makes an act, the append is.
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
export class FieldActs {
  readonly #record: Port;
  constructor(record: Port) {
    this.#record = record;
  }
  readonly act = (proposal: unknown): RecordHeight => this.#record.append({ author: "HUMAN", note: String(proposal) });
}
