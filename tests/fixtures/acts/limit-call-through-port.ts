// LIMIT (R-15): a call through an interface is not followed. Whatever implements
// Committer is judged where it is declared; this function, which may reach an append
// through it, is not judged.
import type { RecordPort } from "../../../src/ports/index.js";
import type { RecordHeight } from "../../../src/kernel/index.js";
export type Entry = { readonly author: "HUMAN"; readonly note: string };
export interface Committer {
  commit(note: string): RecordHeight;
}
export function actThroughPort(committer: Committer, proposal: unknown): RecordHeight {
  return committer.commit(String(proposal));
}
