// S-01 / R-31 (DR-29): a second candidate path through GENERIC relays - one level, and two.
// The relays' own appends carry no kind (`entry: T`); the callers' arguments do.
import type { RecordHeight } from "../../../../../src/kernel/index.js";
import type { RecordPort } from "../../../../../src/ports/index.js";
import type { CandidatePayload } from "../../../../../src/facts/index.js";
type Port = RecordPort<unknown, RecordHeight>;
function relay<T extends { readonly author: string }>(record: Port, entry: T): RecordHeight {
  return record.append(entry);
}
function outer<T extends { readonly author: string }>(record: Port, entry: T): RecordHeight {
  return relay(record, entry);
}
export class RelayBackfill {
  readonly #record: Port;
  constructor({ record }: { readonly record: Port }) {
    this.#record = record;
  }
  backfill(payload: CandidatePayload): RecordHeight {
    return relay(this.#record, { author: "ENGINE" as const, payload });
  }
  viaTwoRelays(payload: CandidatePayload): RecordHeight {
    return outer(this.#record, { author: "ENGINE" as const, payload });
  }
}
