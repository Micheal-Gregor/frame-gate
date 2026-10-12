// K7 round 5 (DR-15): the Node binary, handed to a shell anyway. `shell: true`
// makes any command a command string.
import { execFileSync } from "node:child_process";
export const out = execFileSync(process.execPath, ["tools/checks/x.mjs"], { encoding: "utf8", shell: true });
