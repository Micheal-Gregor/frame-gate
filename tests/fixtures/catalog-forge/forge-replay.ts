// A genuine act appended again: a re-declaration nobody made, at a new height.
import type { Declaration, SharedRecord } from "../../../src/catalog/index.js";
export const replay = (record: SharedRecord, d: Declaration) => record.append(d);
