// A per-currency branch on a member picked by .at(literal).
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export const isLast = (order: CurrencyOrder, c: Currency) => c === order.currencies().at(-1);
