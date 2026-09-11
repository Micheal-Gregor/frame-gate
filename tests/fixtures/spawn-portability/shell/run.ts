// Hands a command STRING to a shell. Parsed by cmd.exe here and sh there.
import { execSync } from "node:child_process";
export const out = execSync("node tools/checks/x.mjs", { encoding: "utf8" });
