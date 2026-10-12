// K7 round 7 (DR-25): a READONLY field whose TYPE is writable - a cache by another name.
import type { RecordHeight } from "../../../../src/kernel/index.js";
import type { Declaration, DeclarationLedger, Unit } from "../../../../src/catalog/index.js";
export class Memo {
  readonly #ledger: DeclarationLedger;
  readonly #memo: { last?: Declaration } = {};
  constructor({ ledger }: { readonly ledger: DeclarationLedger }) {
    this.#ledger = ledger;
  }
  at(unit: Unit, h: RecordHeight) {
    const d = this.#ledger.declarationAt(unit, h);
    if ("payload" in d) this.#memo.last = d as Declaration;
    return d;
  }
}
