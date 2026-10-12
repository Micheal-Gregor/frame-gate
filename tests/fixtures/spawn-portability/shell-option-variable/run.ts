// The same, with the options held in a variable.
import { spawnSync } from "node:child_process";
const options = { encoding: "utf8", shell: true } as const;
export const out = spawnSync(process.execPath, ["tools/checks/x.mjs"], options);
