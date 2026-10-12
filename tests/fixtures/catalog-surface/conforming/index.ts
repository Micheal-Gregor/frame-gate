// MUST NOT be flagged: an as-of read whose height is the caller's, passed straight on or
// captured by an inline closure (IR-49), and a frozen configuration field.
import type { RecordHeight } from "../../../../src/kernel/index.js";
import type { DeclarationLedger, Unit } from "../../../../src/catalog/index.js";
export class AsOf {
  readonly #ledger: DeclarationLedger;
  readonly #levels: readonly string[];
  constructor({ ledger, levels }: { readonly ledger: DeclarationLedger; readonly levels: readonly string[] }) {
    this.#ledger = ledger;
    this.#levels = levels;
  }
  levelAt(unit: Unit, at: RecordHeight): string {
    const d = this.#ledger.declarationAt(unit, at);
    return "payload" in d && this.#levels.includes(d.payload.level) ? d.payload.level : "none";
  }
  levelsAt(units: readonly Unit[], at: RecordHeight): readonly string[] {
    return units.map((unit) => {
      const d = this.#ledger.declarationAt(unit, at);
      return "payload" in d ? d.payload.level : "none";
    });
  }
}
