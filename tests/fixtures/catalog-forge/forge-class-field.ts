// K7 round 7 (DR-24): a class whose instances carry the catalog kind, widened to
// unknown before the append so no argument type says so.
import type { SharedRecord, Unit } from "../../../src/catalog/index.js";
class Payload {
  readonly kind = "declaration";
  constructor(readonly unit: Unit, readonly level: string) {}
}
export const forge = (record: SharedRecord, unit: Unit) => {
  const entry: unknown = { author: "HUMAN", payload: new Payload(unit, "L1") };
  return record.append(entry);
};
