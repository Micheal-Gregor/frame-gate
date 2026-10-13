// WI-11: the currency WIDENED before the comparison - the simplest spellings of the forbidden branch.
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export const asString = (c: Currency) => (c as string) === "c1";
export const angle = (c: Currency) => <string>c === "c1";
export const viaString = (c: Currency) => String(c) === "c1";
export const viaTemplate = (c: Currency) => `${c}` === "c1";
export const viaToString = (c: Currency) => c.toString() === "c1";
export const viaValueOf = (c: Currency) => c.valueOf() === "c1";
export const viaSatisfies = (c: Currency) => (c satisfies string) === "c1";
export function viaSwitch(c: Currency): number {
  switch (String(c)) {
    case "c1":
      return 1;
    default:
      return 0;
  }
}
