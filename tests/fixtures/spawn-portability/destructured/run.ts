// Renamed by destructuring the namespace, then called through the new local.
import * as cp from "node:child_process";
const { spawnSync: launch } = cp;
export const out = launch("python3", ["tools/checks/x.py"], { encoding: "utf8" });
