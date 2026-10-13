// A per-currency branch on an indexed member of the order.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export const isFirst = (order: CurrencyOrder, c: Currency) => c === order.currencies()[0];
