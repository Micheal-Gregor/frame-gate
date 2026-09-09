import { digest } from "../ports/index.js";
export const a = (b: string): string => digest(b);
