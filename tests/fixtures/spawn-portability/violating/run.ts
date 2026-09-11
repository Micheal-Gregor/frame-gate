// Spawns a command NAME. The host resolves it, and the hosts disagree.
import { execFileSync } from "node:child_process";
export const out = execFileSync("npx.cmd", ["tsx", "tools/checks/x.ts"], { encoding: "utf8" });
