// A per-currency branch: the least currency special-cased (F2 OBJ-24 forbids it).
import type { Currency, CurrencyOrder } from "../../../../../src/catalog/index.js";
export const reachableAtLeast = (order: CurrencyOrder, c: Currency) => {
  if (c === order.least()) return true;
  return false;
};
