// LIMIT (R-15, R-38): a class FIELD holding the least currency - set in the constructor, not a
// const - is not followed.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export class LeastHolder {
  readonly #least: Currency;
  constructor({ order }: { readonly order: CurrencyOrder }) {
    this.#least = order.least();
  }
  is(c: Currency): boolean {
    return c === this.#least;
  }
}
