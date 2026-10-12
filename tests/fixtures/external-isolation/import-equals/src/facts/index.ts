// The TypeScript-only import form K7 round 4 found the sweep could not see.
import fs = require("node:fs");
export const exists = (p: string): boolean => fs.existsSync(p);
