// "Now" inside an inline closure: the height the closure captures is a LOCAL made up in
// the method, not the caller's. Looking outward through closures (IR-49) must not excuse it.
import { height, type RecordHeight } from "../../../../src/kernel/index.js";
import type { DeclarationLedger, Unit } from "../../../../src/catalog/index.js";
export class ClosureNow {
  readonly #ledger: DeclarationLedger;
  constructor({ ledger }: { readonly ledger: DeclarationLedger }) {
    this.#ledger = ledger;
  }
  levelsNow(units: readonly Unit[]): readonly string[] {
    const now: RecordHeight = height(Number.MAX_SAFE_INTEGER);
    return units.map((unit) => {
      const d = this.#ledger.declarationAt(unit, now);
      return "payload" in d ? d.payload.level : "none";
    });
  }
}
