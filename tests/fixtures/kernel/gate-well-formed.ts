import type { Gate } from "../../../src/kernel/index.js";
export const g: Gate<boolean, never, null> = {
  condition: true,
  closedBy: "DERIVATION",
  proposalsIn: [],
  records: null,
  onFail: { kind: "refuse", guard: "unreachable" },
};
