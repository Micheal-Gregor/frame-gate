// K7 round 4 (CC-6): an element access has no callee NAME for a text scan to read.
import * as cp from "node:child_process";
export const out = cp["execFileSync"]("npx.cmd", ["tsx", "tools/checks/x.ts"], { encoding: "utf8" });
