// HOOK-09 / R-81: an AuthorizationForm minted outside MOD-11 need not carry the ratio it shows.
import type { AuthorizationForm } from "../../../src/spend/index.js";
export const forged = (raw: object): AuthorizationForm => raw as unknown as AuthorizationForm;
