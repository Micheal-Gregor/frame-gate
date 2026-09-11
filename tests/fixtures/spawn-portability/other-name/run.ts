// A command NAME that is not npx. Kills the mutation that scans for the one
// spelling the original defect happened to use.
import { spawnSync } from "node:child_process";
export const out = spawnSync("python3", ["tools/checks/x.py"], { encoding: "utf8" });
