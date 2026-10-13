// A per-currency branch as a switch.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export function cost(order: CurrencyOrder, c: Currency): string {
  switch (c) {
    case order.least():
      return "cheap";
    default:
      return "dear";
  }
}
