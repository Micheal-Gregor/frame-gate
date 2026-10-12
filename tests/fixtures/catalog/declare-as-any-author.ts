// HOOK-07, author half: an UN-narrowed author is not a HUMAN author. A caller must
// pass through ports' mayDecide, which is where "who may act as HUMAN" is decided.
import type { Author } from "../../../src/ports/index.js";
import type { DeclarationLedger, Unit } from "../../../src/catalog/index.js";
export const anyAuthorDeclares = (ledger: DeclarationLedger, unit: Unit, author: Author) =>
  ledger.declare(unit, "L1", author);
