// The node binary, at an absolute script path, plus a fork. Both portable.
import { execFileSync, fork } from "node:child_process";
import { resolve } from "node:path";
export const out = execFileSync(process.execPath, [resolve("tools/checks/x.mjs")], {
  encoding: "utf8",
});
export const child = fork(resolve("tools/checks/y.mjs"));
