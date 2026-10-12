// A non-.ts source under src/. The runtime loads it; the sweep must read it.
import { createHash } from "node:crypto";
export const digest = (s) => createHash("sha256").update(s).digest("hex");
