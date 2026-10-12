// REGISTERED LIMIT (IR-39 / IR-41), not a conforming example: asking whether a
// SECOND currency exists, by index rather than by length. Not a comparison of a
// length or size to a literal, so the check does NOT see it; K7 reads for it (OI-4).
import type { CurrencyOrder } from "../../../src/catalog/index.js";
export const hasSecond = (order: CurrencyOrder): boolean => order.currencies().at(1) !== undefined;
