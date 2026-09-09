import { digest } from "./../ports/index.js";
export const b = (s: string): string => digest(s);
