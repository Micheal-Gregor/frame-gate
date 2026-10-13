// WI-13: a reader handed through .bind.
import { isUnknown, type RecordHeight } from "../../../../../src/kernel/index.js";
import type { Currency, Unit } from "../../../../../src/catalog/index.js";
import type { CommitmentLedger } from "../../../../../src/facts/index.js";
type Ctx = { readonly fold: CommitmentLedger; readonly u: Unit; readonly at: RecordHeight };
function committed(this: Ctx, p: Currency): boolean {
  return !isUnknown(this.fold.effectiveCommitment(this.u, p, this.at));
}
export const all = (below: readonly Currency[], ctx: Ctx) => below.every(committed.bind(ctx));
