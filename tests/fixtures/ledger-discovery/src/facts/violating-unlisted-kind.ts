// IR-50: a ledger fact whose kind no list carries - every forge, mint and surface rule
// would pass over it. Discovery must report it unlisted (and unbranded).
import type { AppendedFact } from "../../../../../src/kernel/index.js";
declare const GHOST: unique symbol;
export interface GhostPayload { readonly kind: "ghost"; readonly note: string }
export type Ghost = AppendedFact<"HUMAN", GhostPayload> & { readonly [GHOST]: true };
