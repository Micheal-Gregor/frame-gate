// LIMIT (R-15): an entry typed `unknown` carries no kind the checker can read, so this
// second path is not seen. Forge registers the same residue (limit-any-entry.ts); the
// runtime half is PC-02's.
import type { RecordHeight } from "../../../../../src/kernel/index.js";
import type { RecordPort } from "../../../../../src/ports/index.js";
export const smuggle = (record: RecordPort<unknown, RecordHeight>, entry: unknown) => record.append(entry);
