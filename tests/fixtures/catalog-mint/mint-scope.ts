// REF-17 / S-01: a Scope minted outside MOD-11 is permission no one authorized.
import type { Scope } from "../../../src/spend/index.js";
export const forged = (raw: object): Scope => raw as unknown as Scope;
