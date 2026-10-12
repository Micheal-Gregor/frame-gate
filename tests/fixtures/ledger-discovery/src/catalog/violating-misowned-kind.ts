// IR-50: the COMMITMENT kind declared as a fact in the catalog - a kind owned by
// src/facts, so discovery must report it misowned - and, though the alias is NAMED
// Commitment, unbranded: a brand is its name AND its owner.
import type { AppendedFact } from "../../../../../src/kernel/index.js";
import type { CommitmentPayload } from "../../../../../src/facts/index.js";
declare const SHADOW: unique symbol;
export type Commitment = AppendedFact<"HUMAN", CommitmentPayload> & { readonly [SHADOW]: true };
