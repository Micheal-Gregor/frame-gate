// WI-11: the least, destructured by a computed key that is a numeric CONST.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
const FIRST = 0;
export function isLeast(order: CurrencyOrder, c: Currency): boolean {
  const { [FIRST]: least } = order.currencies();
  return c === least;
}
