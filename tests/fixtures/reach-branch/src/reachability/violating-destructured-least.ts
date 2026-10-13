// DR-30: the least currency, destructured from the loaded order - the idiomatic spelling.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export function isLeast(order: CurrencyOrder, c: Currency): boolean {
  const [least] = order.currencies();
  return c === least;
}
