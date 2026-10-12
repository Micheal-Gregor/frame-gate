// REGISTERED LIMIT (R-12, IR-38), not a conforming example. A kind computed at
// runtime has type `string`, so no type says it is a catalog kind. This fixture pins
// the limit: the check does NOT flag it, and if a future check does, this goes red
// and the limit is re-registered as covered. The guarantee here rests on PC-02.
import type { SharedRecord, Unit } from "../../../src/catalog/index.js";
export const forge = (record: SharedRecord, unit: Unit, k: string) =>
  record.append({ author: "HUMAN", payload: { kind: k, unit, level: "L1" } });
