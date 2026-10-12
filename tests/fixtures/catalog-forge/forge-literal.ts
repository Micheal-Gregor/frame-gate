// K7 round 6 E3: a difficulty-derived classification written straight to the shared
// record as a plain literal, labelled HUMAN. No brand, no `as`, no declare().
import type { SharedRecord, Unit } from "../../../src/catalog/index.js";
export function classify(record: SharedRecord, unit: Unit, difficulty: number): void {
  record.append({ author: "HUMAN", payload: { kind: "declaration", unit, level: difficulty > 1 ? "hard" : "easy" } });
}
