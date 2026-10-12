// A current read through a MODULE-level cache and an exported free function: no
// class field (the held rule's scope) and no read of the record (the fabricated
// rule's). Only the returns rule over FREE FUNCTIONS sees it: it hands back an act
// with no height and no HUMAN append.
import type { Declaration, Unit } from "../../../../src/catalog/index.js";
const lastSeen = new Map<Unit, Declaration>();
export function remember(d: Declaration): void {
  lastSeen.set(d.payload.unit, d);
}
export function current(unit: Unit): Declaration | undefined {
  return lastSeen.get(unit);
}
