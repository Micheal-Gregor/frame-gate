// LIMIT (R-15, R-39): a REST element of the order, read back by a literal index.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export function isLeast(order: CurrencyOrder, c: Currency): boolean {
  const [...all] = order.currencies();
  return c === all[0];
}
