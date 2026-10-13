// S-01 / R-32 (WI-07): a WRAPPED relay - the helper builds the entry from its own parameter
// (`payload: T`), so its append carries no kind; the callers' payloads do. Plain and frozen.
import type { RecordHeight } from "../../../../../src/kernel/index.js";
import type { RecordPort } from "../../../../../src/ports/index.js";
import type { CandidatePayload } from "../../../../../src/facts/index.js";
type Port = RecordPort<unknown, RecordHeight>;
function wrap<T extends object>(record: Port, payload: T): RecordHeight {
  return record.append({ author: "ENGINE" as const, payload });
}
function wrapFrozen<T extends object>(record: Port, payload: T): RecordHeight {
  return record.append(Object.freeze({ author: "ENGINE" as const, payload: payload }));
}
export class WrappedBackfill {
  readonly #record: Port;
  constructor({ record }: { readonly record: Port }) {
    this.#record = record;
  }
  backfill(payload: CandidatePayload): RecordHeight {
    return wrap(this.#record, payload);
  }
  frozen(payload: CandidatePayload): RecordHeight {
    return wrapFrozen(this.#record, payload);
  }
}
