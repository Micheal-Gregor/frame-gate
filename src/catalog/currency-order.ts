// CurrencyOrder — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The total order of draw classes, loaded once and read-only (OBJ-05, MOD-03).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (trial
// finding MF-21: the generator's TypeScript output does not compile here).
//
// The order is CONFIGURATION, not a record fact (RFD-04): it has no author, no
// height and no lineage, so it is loaded once and never appended to or re-sorted.
// The set is data indexing a total order (SC-3, SC-5): nothing here, or anywhere,
// may know how many currencies there are.
import { refuse, type UnknownValue } from "../kernel/index.js";

declare const CURRENCY: unique symbol;

/** OBJ-05 — a draw class. Only a CurrencyOrder names one. */
export type Currency = string & { readonly [CURRENCY]: true };

export class CurrencyOrder {
  readonly #order: readonly Currency[];

  /** @param currencies cheapest first. */
  constructor({ currencies }: { readonly currencies: readonly string[] }) {
    if (currencies === undefined || currencies === null) {
      throw new TypeError("CurrencyOrder requires currencies");
    }
    if (currencies.length === 0) {
      throw new RangeError("a currency order must have a least element: the list is empty");
    }
    if (new Set(currencies).size !== currencies.length) {
      throw new RangeError("currencies must be distinct: a total order has no ties");
    }
    // The one place a Currency is minted: every Currency is a member of a loaded order.
    this.#order = Object.freeze([...currencies]) as readonly Currency[];
    Object.freeze(this);
  }

  /** The currency set, cheapest first. Indexes the ratio vector (MOD-11); never counted. */
  currencies(): readonly Currency[] {
    return this.#order;
  }

  /** The least element. Guaranteed to exist: construction refuses an empty order. */
  least(): Currency {
    return this.#order[0]!; // non-empty by construction
  }

  /** Every currency strictly cheaper than `currency` - the set MOD-04 quantifies over. */
  predecessors(currency: Currency): readonly Currency[] | UnknownValue {
    const position = this.#order.indexOf(currency);
    if (position < 0) return refuse("currency-not-in-this-order");
    return this.#order.slice(0, position);
  }
}
