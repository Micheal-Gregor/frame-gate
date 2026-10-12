// POSITIVE CONTROL: a caller narrowed through mayDecide commits.
import { mayDecide, type Author } from "../../../src/ports/index.js";
import type { Currency, Unit } from "../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../src/facts/index.js";
export function humanCommits(ledger: CommitmentLedger, unit: Unit, currency: Currency, author: Author) {
  return mayDecide(author) ? ledger.commit(unit, currency, author) : null;
}
