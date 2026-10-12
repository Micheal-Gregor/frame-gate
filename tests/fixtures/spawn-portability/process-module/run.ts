// Conforming spellings of the Node binary: the named import from node:process, and
// a const bound to process.execPath. Both resolve to the same symbol.
import { execFileSync } from "node:child_process";
import { execPath } from "node:process";
const node = process.execPath;
export const a = execFileSync(execPath, ["tools/checks/x.mjs"], { encoding: "utf8" });
export const b = execFileSync(node, ["tools/checks/y.mjs"], { encoding: "utf8" });
