import { createHash } from "node:crypto";
export const sneaky = (b: string): string => createHash("sha256").update(b).digest("hex");
