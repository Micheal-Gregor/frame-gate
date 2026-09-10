import type { AppendedFact } from "../../../src/kernel/index.js";
type Note = AppendedFact<string, { readonly text: string }>;
export function corrupt(f: Note): void {
  // NOTE: no ts-directive of any kind here. An error-suppressing comment would
  // silence the very diagnostic this fixture exists to produce.
  f.payload = { text: "corrected" };
}
