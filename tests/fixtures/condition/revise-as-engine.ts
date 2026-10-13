// OBJ-17 (BC-06-2, IR-88): a prompt revision is the operator's act - the ENGINE does not compile.
import type { Currency, Unit } from "../../../src/catalog/index.js";
import type { ConditionIdentity, RevisionLog } from "../../../src/condition/index.js";
export const engineRevises = (log: RevisionLog, unit: Unit, currency: Currency, c: ConditionIdentity) => log.revise(unit, currency, c, "ENGINE");
