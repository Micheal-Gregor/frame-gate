// LIMIT (R-15): a particular member reached through a collection's membership test.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export const isLeast = (order: CurrencyOrder, c: Currency) => new Set([order.least()]).has(c);
