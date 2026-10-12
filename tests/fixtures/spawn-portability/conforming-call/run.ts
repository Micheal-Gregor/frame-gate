// The Node binary through .call, and an explicit `shell: false`. Both portable;
// refusing them would make the rule pass by refusing every indirection.
import { execFileSync } from "node:child_process";
export const a = execFileSync.call(null, process.execPath, ["tools/checks/x.mjs"]);
export const b = execFileSync(process.execPath, ["tools/checks/y.mjs"], { shell: false });
