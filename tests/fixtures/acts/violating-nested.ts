// REF-06: an open type reached through a field, an array, an index signature, a
// library generic, a union member, or what a callback returns.
import type { Unit } from "../../../src/catalog/index.js";
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
type Entry = { readonly author: "HUMAN"; readonly note: string };
type Port = RecordPort<Entry, RecordHeight>;
const write = (record: Port, note: string): RecordHeight => record.append({ author: "HUMAN", note });
export function actOnField(record: Port, p: { readonly unit: Unit; readonly basis: unknown }): RecordHeight {
  return write(record, String(p.unit));
}
export function actOnArray(record: Port, p: readonly unknown[]): RecordHeight {
  return write(record, String(p.length));
}
export function actOnIndex(record: Port, p: Readonly<Record<string, unknown>>): RecordHeight {
  return write(record, String(Object.keys(p).length));
}
export function actOnMap(record: Port, p: ReadonlyMap<string, object>): RecordHeight {
  return write(record, String(p.size));
}
export function actOnUnion(record: Port, p: Unit | object): RecordHeight {
  return write(record, String(p));
}
export function actOnSource(record: Port, source: () => unknown): RecordHeight {
  return write(record, String(source()));
}
