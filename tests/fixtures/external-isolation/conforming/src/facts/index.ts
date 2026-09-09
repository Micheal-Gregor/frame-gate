import { digest } from "../ports/index.js";
export const ok = (b: string): string => digest(b);
