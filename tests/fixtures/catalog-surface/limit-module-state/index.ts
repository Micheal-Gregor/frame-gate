// REGISTERED LIMIT (IR-41): a class answering from MODULE-level mutable state, with a
// plain return. Not a read of the record (fabricated), not a class field (held), not an
// act-returning export (returns): none of the three surface rules sees it. The
// check does NOT flag it; K7 reads for it, and OS-2 owns module-level state.
import type { Unit } from "../../../../src/catalog/index.js";
const seen = new Map<Unit, string>();
export class Recall {
  levelOf(unit: Unit): string | undefined {
    return seen.get(unit);
  }
  note(unit: Unit, level: string): void {
    seen.set(unit, level);
  }
}
