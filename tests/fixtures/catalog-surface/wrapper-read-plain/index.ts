// "Now" through a private wrapper, returning a PLAIN string: no act is returned and
// no HUMAN parameter is worn, so only the wrapper-following read rule (DR-25's fixed
// point) can see the made-up height.
import { height, type RecordHeight } from "../../../../src/kernel/index.js";
import type { DeclarationLedger, Unit } from "../../../../src/catalog/index.js";
export class PlainReader {
  readonly #ledger: DeclarationLedger;
  constructor({ ledger }: { readonly ledger: DeclarationLedger }) {
    this.#ledger = ledger;
  }
  #read(unit: Unit, at: RecordHeight) {
    return this.#ledger.declarationAt(unit, at);
  }
  levelNow(unit: Unit): string {
    const d = this.#read(unit, height(Number.MAX_SAFE_INTEGER));
    return "payload" in d ? d.payload.level : "none";
  }
}
