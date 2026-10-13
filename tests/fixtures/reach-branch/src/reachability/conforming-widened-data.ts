// POSITIVE CONTROL (WI-11): a widened currency compared to DATA is a lookup, not a branch.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export const named = (c: Currency, name: string) => String(c) === name;
export const same = (a: Currency, b: Currency) => `${a}` === `${b}`;
