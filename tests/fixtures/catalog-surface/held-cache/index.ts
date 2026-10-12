// A current read with no height at all: a cache filled on write. "No derived value
// is held" (F1) - a mutable field is exactly that.
import type { DeclarationLedger, Unit } from "../../../../src/catalog/index.js";
export class Remembering {
  readonly #ledger: DeclarationLedger;
  readonly #last = new Map<Unit, string>();
  constructor({ ledger }: { readonly ledger: DeclarationLedger }) {
    this.#ledger = ledger;
  }
  declare(unit: Unit, level: string, author: "HUMAN") {
    const d = this.#ledger.declare(unit, level, author);
    this.#last.set(unit, level);
    return d;
  }
  currentLevel(unit: Unit): string | undefined {
    return this.#last.get(unit);
  }
}
