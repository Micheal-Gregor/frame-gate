// REGISTERED LIMIT: a require made by createRequire is not read.
import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
export const advisory = load("../advisory/index.js");
