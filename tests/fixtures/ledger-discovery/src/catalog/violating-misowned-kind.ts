// IR-50: the COMMITMENT kind declared as a fact in the catalog - a kind owned by
// src/facts, so discovery must report it misowned (and its brand unknown).
import type { AppendedFact } from "../../../../../src/kernel/index.js";
import type { CommitmentPayload } from "../../../../../src/facts/index.js";
declare const SHADOW: unique symbol;
export type ShadowCommitment = AppendedFact<"HUMAN", CommitmentPayload> & { readonly [SHADOW]: true };
