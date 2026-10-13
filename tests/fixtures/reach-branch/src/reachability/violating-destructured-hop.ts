// DR-30: destructured from a const one hop from the order.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export function isFirst(order: CurrencyOrder, c: Currency): boolean {
  const all = order.currencies();
  const [first] = all;
  return c === first;
}
