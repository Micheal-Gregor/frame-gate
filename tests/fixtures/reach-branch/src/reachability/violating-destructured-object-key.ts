// R-38: the least currency picked by a numeric-keyed OBJECT destructuring of the loaded order.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export function isLeast(order: CurrencyOrder, c: Currency): boolean {
  const { 0: least } = order.currencies();
  return c === least;
}
