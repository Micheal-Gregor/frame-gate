// A per-currency branch through one const hop.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export function special(order: CurrencyOrder, c: Currency): boolean {
  const least = order.least();
  return c === least;
}
