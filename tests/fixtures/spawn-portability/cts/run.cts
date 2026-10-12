// K7 round 7 (WI-04): a CommonJS-TypeScript file the sweep's extension list skipped.
import { execFileSync } from "node:child_process";
export const out = execFileSync("npx.cmd", ["tsx", "x.ts"], { encoding: "utf8" });
