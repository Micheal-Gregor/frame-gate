import { createHash } from "node:crypto";
export const bad = (b: string): string => createHash("sha256").update(b).digest("hex");
