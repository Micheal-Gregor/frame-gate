// REGISTERED LIMIT (IR-41): a module loaded through createRequire is `any`, so no
// call on it resolves to a declaration in child_process. The resolver does NOT flag it.
import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
export const out = load("child_process").execSync("npx tsx x.ts");
