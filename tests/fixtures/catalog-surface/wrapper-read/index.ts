// K7 round 7 (DR-25): "now" through a PRIVATE WRAPPER, under a HUMAN parameter.
import { height, type RecordHeight } from "../../../../src/kernel/index.js";
import type { Declaration, DeclarationLedger, Unit } from "../../../../src/catalog/index.js";
export class Reader {
  readonly #ledger: DeclarationLedger;
  constructor({ ledger }: { readonly ledger: DeclarationLedger }) {
    this.#ledger = ledger;
  }
  #read(unit: Unit, at: RecordHeight) {
    return this.#ledger.declarationAt(unit, at);
  }
  current(unit: Unit, _who: "HUMAN"): Declaration | undefined {
    const d = this.#read(unit, height(Number.MAX_SAFE_INTEGER));
    return "payload" in d ? (d as Declaration) : undefined;
  }
}
