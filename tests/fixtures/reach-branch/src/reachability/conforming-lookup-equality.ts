// POSITIVE CONTROL: two currencies that are both DATA - a lookup, not a branch.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export const pick = (xs: readonly { readonly currency: Currency; readonly n: number }[], c: Currency) => xs.find((x) => x.currency === c);
