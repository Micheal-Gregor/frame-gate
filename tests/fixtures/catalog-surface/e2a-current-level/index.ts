// K7 round 6 E2a: "the current level", as a plain string, through a made-up height.
import { height } from "../../../../src/kernel/index.js";
import type { DeclarationLedger, Unit } from "../../../../src/catalog/index.js";
export class Classifications {
  readonly #ledger: DeclarationLedger;
  constructor({ ledger }: { readonly ledger: DeclarationLedger }) {
    this.#ledger = ledger;
  }
  currentLevel(unit: Unit): string {
    const d = this.#ledger.declarationAt(unit, height(Number.MAX_SAFE_INTEGER));
    return "payload" in d ? d.payload.level : "none";
  }
}
