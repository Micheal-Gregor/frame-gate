// POSITIVE CONTROL: commits in a loop are APPENDS, not reads - commit takes no height, so this
// is no fold over the order (the height discriminator, pinned before battery 15).
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
export function seed(ledger: CommitmentLedger, u: Unit, cs: readonly Currency[]): void {
  for (const c of cs) ledger.commit(u, c, "HUMAN");
}
