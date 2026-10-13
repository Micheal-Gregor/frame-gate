// LIMIT (R-15; found before battery 13): a TYPED helper - its parameter already carries the
// candidate kind - is itself the append path, so its two callers are not counted separately:
// the residue is ONE path, the helper. In src/ the exact per-kind map still turns red when a
// path moves into a helper like this.
import type { RecordHeight } from "../../../../../src/kernel/index.js";
import type { RecordPort } from "../../../../../src/ports/index.js";
import type { CandidatePayload } from "../../../../../src/facts/index.js";
type Entry = { readonly author: "ENGINE"; readonly payload: CandidatePayload };
export class TypedHelper {
  readonly #record: RecordPort<unknown, RecordHeight>;
  constructor({ record }: { readonly record: RecordPort<unknown, RecordHeight> }) {
    this.#record = record;
  }
  guarded(payload: CandidatePayload): RecordHeight {
    return this.#write({ author: "ENGINE", payload });
  }
  backfill(payload: CandidatePayload): RecordHeight {
    return this.#write({ author: "ENGINE", payload });
  }
  #write(entry: Entry): RecordHeight {
    return this.#record.append(entry);
  }
}
