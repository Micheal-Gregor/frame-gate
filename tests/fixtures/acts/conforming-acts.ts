// POSITIVE CONTROL: acts over closed types; a callback the act hands data OUT to; a
// class whose constructor only holds the port; and a proposal function that takes an
// open type but appends nothing, which is lawful - the diagnostic may be proposed.
import type { Unit } from "../../../src/catalog/index.js";
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
const write = (record: Port, note: string): RecordHeight => record.append({ author: "HUMAN", note });
export function actOnClosed(record: Port, unit: Unit, author: "HUMAN", independent: boolean, level: string): RecordHeight {
  return write(record, `${unit}:${author}:${String(independent)}:${level}`);
}
export function actOnBoundedT<T extends Unit>(record: Port, unit: T): RecordHeight {
  return write(record, unit);
}
export function actOnShape(record: Port, p: { readonly unit: Unit; readonly tags: readonly string[] }): RecordHeight {
  return write(record, `${p.unit}:${p.tags.join(",")}`);
}
export function actHandsOut(record: Port, sink: (x: unknown) => void): RecordHeight {
  const at = write(record, "handed-out");
  sink(at);
  return at;
}
export function proposeOnly(proposal: unknown): string {
  return String(proposal);
}
export class Holder {
  readonly #record: Port;
  constructor(record: Port) {
    this.#record = record;
  }
  act(unit: Unit): RecordHeight {
    return write(this.#record, unit);
  }
}
