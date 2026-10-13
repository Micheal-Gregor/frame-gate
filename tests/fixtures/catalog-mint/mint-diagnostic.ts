// REF-06 / PC-07 (R-76): a DiagnosticValue minted outside MOD-10 could drop its withheld entries.
import type { DiagnosticValue } from "../../../src/diagnostic/index.js";
export const forged = (raw: object): DiagnosticValue => raw as unknown as DiagnosticValue;
