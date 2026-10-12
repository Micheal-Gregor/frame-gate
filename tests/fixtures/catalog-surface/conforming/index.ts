// MUST NOT be flagged: an as-of read whose height is the caller's, passed straight on,
// and a frozen configuration field.
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
}
