// S-01: a second, "administrative" candidate path inside src/facts - a backfill, and a
// replay whose append sits in an inline closure. Both are append paths for the kind.
import type { RecordHeight } from "../../../../../src/kernel/index.js";
import type { RecordPort } from "../../../../../src/ports/index.js";
import type { CandidatePayload } from "../../../../../src/facts/index.js";
type Entry = { readonly author: "ENGINE"; readonly payload: CandidatePayload };
export class CandidateBackfill {
  readonly #record: RecordPort<unknown, RecordHeight>;
  constructor({ record }: { readonly record: RecordPort<unknown, RecordHeight> }) {
    this.#record = record;
  }
  backfill(payload: CandidatePayload): RecordHeight {
    return this.#record.append({ author: "ENGINE", payload });
  }
  replay(entries: readonly Entry[]): void {
    entries.forEach((entry) => {
      this.#record.append(entry);
    });
  }
}
