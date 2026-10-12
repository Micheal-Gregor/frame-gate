// K7 round 5 (DR-15): through Reflect.apply.
import * as cp from "node:child_process";
export const out = Reflect.apply(cp.execFileSync, undefined, ["npx.cmd", ["tsx", "x.ts"]]);
