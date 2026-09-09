import { createHash } from "node:crypto";
export const digest = (b: string): string => createHash("sha256").update(b).digest("hex");
