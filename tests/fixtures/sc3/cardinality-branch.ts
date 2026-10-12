// "if cheap ... else expensive" in its cardinality form: asking how MANY currencies.
import type { CurrencyOrder } from "../../../src/catalog/index.js";
export const tiers = (order: CurrencyOrder): string => (order.currencies().length > 1 ? "split" : "single");
