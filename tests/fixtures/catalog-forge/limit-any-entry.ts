// REGISTERED LIMIT (IR-41): an entry that arrives as `any` carries no type to say it
// is a catalog kind. The check does NOT flag it; at runtime the guarantee rests on
// PC-02 (R-12).
import type { SharedRecord } from "../../../src/catalog/index.js";
export const replayed = (record: SharedRecord, raw: string) => record.append(JSON.parse(raw));
