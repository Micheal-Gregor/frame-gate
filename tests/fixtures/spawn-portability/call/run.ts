// K7 round 5 (DR-15): through Function.prototype.call.
import { execFileSync } from "node:child_process";
export const out = execFileSync.call(null, "npx.cmd", ["tsx", "x.ts"]);
