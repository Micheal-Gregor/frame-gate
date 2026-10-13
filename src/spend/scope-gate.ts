// ScopeGate — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The gate before a draw: the governing scope's remaining ceiling, charged by dispatch; and the scope match at the candidate append.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-30 (a Gate, HOOK-05 @before-draw). MOD-05's draw asks it before anything is recorded (R-78), so
// an (N+1)th draw is refused with no context, no candidate and no cost. A draw is charged when it is
// RECORDED - spent by dispatch, not by return (DG-F3, cited) - whether or not a candidate returns.
// The governing scope is the latest for its (unit, currency) (R-77): a superseded one admits nothing,
// and its remainder is not carried. One code path over the currency order; no branch on a currency.
import { isUnknown, refuse, type Gate, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { ScopeRecord } from "./scope-reader.js";

/** OBJ-30 as a value: the gate's descriptor (OBJ-03). HOOK-05 @before-draw. */
export const SCOPE_GATE: Gate<"an unexpired scope exists with remaining > 0", never, "DrawContext"> = Object.freeze({
  condition: "an unexpired scope exists with remaining > 0",
  closedBy: "DERIVATION",
  proposalsIn: Object.freeze([] as const),
  records: "DrawContext",
  onFail: Object.freeze({ kind: "refuse", guard: "scope-exceeded" } as const),
});

/** The scope reads the gate makes (ScopeReader). */
export interface ScopeReads {
  governing(unit: Unit, currency: Currency, at: RecordHeight): ScopeRecord | UnknownValue;
  scopeAt(scope: RecordHeight, at: RecordHeight): ScopeRecord | UnknownValue;
}
/** MOD-05's record-only read of the draws recorded under a scope (R-78: charged by dispatch). */
export interface DrawCharges {
  drawsUnder(scope: RecordHeight, at: RecordHeight): readonly RecordHeight[];
}

export class ScopeGate {
  readonly #scopes: ScopeReads;
  readonly #charges: DrawCharges;

  constructor({ scopes, charges }: { readonly scopes: ScopeReads; readonly charges: DrawCharges }) {
    // OS-1: every object input is a declared slot - the operations called on it are named and checked here.
    const slot = (name: string, value: object | undefined | null, operations: readonly string[]): void => {
      if (value === undefined || value === null) throw new TypeError(`ScopeGate requires ${name}`);
      for (const operation of operations) {
        if (typeof (value as Readonly<Record<string, unknown>>)[operation] !== "function") throw new TypeError(`${name} must offer ${operations.join(" and ")}`);
      }
    };
    slot("scopes", scopes, ["governing", "scopeAt"]);
    slot("charges", charges, ["drawsUnder"]);
    this.#scopes = scopes;
    this.#charges = charges;
    Object.freeze(this);
  }

  /** I-3: the governing scope's ceiling less the draws charged against it, as of `at`; NoSubject with no scope. */
  remaining(unit: Unit, currency: Currency, at: RecordHeight): number | UnknownValue {
    const scope = this.#scopes.governing(unit, currency, at);
    return isUnknown(scope) ? scope : this.#left(scope, at);
  }

  /** HOOK-05 @before-draw (R-78): MOD-05's draw asks this before anything is recorded. */
  admitsDraw(unit: Unit, scope: RecordHeight, at: RecordHeight): "WITHIN" | UnknownValue {
    // HOOK-05: the named scope governs THIS unit at its currency, and something remains. The governing
    // read is by the drawing unit, so another unit's scope never matches it. Every failure of that
    // condition is the hook's one refusal.
    const named = this.#scopes.scopeAt(scope, at);
    if (isUnknown(named)) return refuse("scope-exceeded");
    const governing = this.#scopes.governing(unit, named.payload.currency, at);
    if (isUnknown(governing) || governing.at !== named.at) return refuse("scope-exceeded");
    return this.#left(named, at) > 0 ? "WITHIN" : refuse("scope-exceeded");
  }

  /** R-78 (R-25 amended): a candidate's unit and currency are its draw's scope's. */
  admitsCandidate(unit: Unit, currency: Currency, scope: RecordHeight, at: RecordHeight): "WITHIN" | UnknownValue {
    // The draw was charged when it was recorded; the ceiling is not counted again on return.
    const named = this.#scopes.scopeAt(scope, at);
    return !isUnknown(named) && named.payload.unit === unit && named.payload.currency === currency ? "WITHIN" : refuse("scope-mismatch");
  }

  /** The scope's ceiling less the draws recorded under it as of `at` (R-78). */
  #left(scope: ScopeRecord, at: RecordHeight): number {
    return scope.payload.ceiling - this.#charges.drawsUnder(scope.at, at).length;
  }
}
