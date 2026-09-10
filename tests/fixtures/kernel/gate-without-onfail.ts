import type { Gate } from "../../../src/kernel/index.js";
// A Gate declaration that omits onFail MUST be a compile error.
export const g: Gate<boolean, never, null> = {
  condition: true,
  closedBy: "DERIVATION",
  proposalsIn: [],
  records: null,
};
