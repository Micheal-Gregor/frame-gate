// WI-11: the least, destructured by a numeric-STRING key.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export function isLeast(order: CurrencyOrder, c: Currency): boolean {
  const { "0": least } = order.currencies();
  return c === least;
}
