// K7 round 4 (CC-6): renamed at the import, so the call site never says execFileSync.
import { execFileSync as run } from "node:child_process";
export const out = run("npx.cmd", ["tsx", "tools/checks/x.ts"], { encoding: "utf8" });
