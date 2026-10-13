// WI-11: one const re-binding of a destructured pick - the destructuring is the pick, the const the hop.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export function isLeast(order: CurrencyOrder, c: Currency): boolean {
  const [least] = order.currencies();
  const l = least;
  return c === l;
}
