// AuthorizationForms — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Builds the authorization form a Scope is authorized from, carrying its ratio, or builds nothing.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-40 - a domain object built by the core, not a screen the core hopes about (ODG-FG-02). Every
// form carries the ratio, at every currency (R-81), so there is no branch on "the least". With no
// vector there is no form (HOOK-09): the guarantee is in construction, not in display. The form
// constrains no decision - approving and declining both remain the human's.
import { isUnknown, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { RatioValue } from "./ratio.js";

declare const FORMED: unique symbol;

/**
 * OBJ-40 - a domain object, not a view (ODG-FG-02). It carries the ratio or it does not exist
 * (HOOK-09); nominal, so only `AuthorizationForms.build` makes one (R-81).
 */
export type AuthorizationForm = {
  readonly unit: Unit;
  readonly currency: Currency;
  /** The height it was built at: a Scope is authorized from it at that height (R-81). */
  readonly at: RecordHeight;
  readonly ratio: RatioValue;
} & { readonly [FORMED]: true };

/** OBJ-26, as the form reads it. */
export interface RatioSource {
  of(unit: Unit): Projection<RatioValue | UnknownValue>;
}

export class AuthorizationForms {
  readonly #ratio: RatioSource;

  constructor({ ratio }: { readonly ratio: RatioSource }) {
    if (ratio === undefined || ratio === null) throw new TypeError("AuthorizationForms requires ratio");
    if (typeof ratio.of !== "function") throw new TypeError("ratio must offer of (OBJ-26)");
    this.#ratio = ratio;
    Object.freeze(this);
  }

  /** OBJ-40 for a spend of `unit` at `currency`, as of `at`: with its ratio, or no form at all (HOOK-09). */
  build(unit: Unit, currency: Currency, at: RecordHeight): AuthorizationForm | UnknownValue {
    const ratio = this.#ratio.of(unit).compute(at);
    if (isUnknown(ratio)) return ratio; // HOOK-09: no vector, no form
    // The one place an AuthorizationForm is minted.
    return Object.freeze({ unit, currency, at, ratio }) as AuthorizationForm;
  }
}
