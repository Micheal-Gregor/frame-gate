// POSITIVE CONTROL (DR-30): two currencies destructured from DATA are compared as data.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export function same(pair: readonly [Currency, Currency]): boolean {
  const [a, b] = pair;
  return a === b;
}
