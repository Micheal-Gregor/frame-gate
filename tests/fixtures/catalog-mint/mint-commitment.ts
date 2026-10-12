// BC-05-6: a Commitment minted outside its ledger, by double assertion.
import type { Commitment } from "../../../src/facts/index.js";
export const fake = (raw: object): Commitment => raw as unknown as Commitment;
