// K7 round 7 (WI-04): a .tsx file - the same unportable spawn in another extension.
import { spawnSync } from "node:child_process";
export const out = spawnSync("python3", ["x.py"], { encoding: "utf8" });
