// POSITIVE CONTROL: a caller that narrows through mayDecide compiles. Without it,
// a HOOK-07 check that refused every call would pass the two fixtures above.
import { mayDecide, type Author } from "../../../src/ports/index.js";
import type { DeclarationLedger, IndependenceLedger, Unit } from "../../../src/catalog/index.js";
export function humanActs(d: DeclarationLedger, i: IndependenceLedger, unit: Unit, author: Author) {
  if (!mayDecide(author)) return null;
  return [d.declare(unit, "L1", author), i.declareIndependence(unit, true, author)] as const;
}
