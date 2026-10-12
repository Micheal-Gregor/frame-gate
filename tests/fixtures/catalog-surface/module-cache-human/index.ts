// A current read wearing a "HUMAN" parameter and appending nothing. Under the old
// admission the parameter alone excused it; only "HUMAN admits an APPEND" (DR-25) sees it.
import type { Declaration, Unit } from "../../../../src/catalog/index.js";
const lastSeen = new Map<Unit, Declaration>();
export function remember(d: Declaration): void {
  lastSeen.set(d.payload.unit, d);
}
export function current(unit: Unit, _who: "HUMAN"): Declaration | undefined {
  return lastSeen.get(unit);
}
