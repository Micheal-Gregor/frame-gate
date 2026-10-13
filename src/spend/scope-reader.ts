// ScopeReader — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Record-only reads of Scopes as of a height: the governing one (the latest, R-77), one by its height, and whether it carries a stop condition.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// It reads the record and nothing else, so the ScopeGate can be built before the ledgers whose
// draws it gates (R-78), as MOD-05's LineageReader is for MOD-12 (R-41): no construction cycle.
import { height, noSubject, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { FactRecord } from "../facts/index.js";
import { isScopeEntry, type ScopePayload } from "./scope-ledger.js";

/** A Scope as the record holds it - unbranded, because only `ScopeLedger.authorize` mints a Scope (the mint rule). */
export interface ScopeRecord {
  readonly author: "HUMAN";
  readonly at: RecordHeight;
  readonly payload: ScopePayload;
}

export class ScopeReader {
  readonly #record: FactRecord;

  constructor({ record }: { readonly record: FactRecord }) {
    if (record === undefined || record === null) throw new TypeError("ScopeReader requires record");
    // OS-1: a declared slot - the one operation called on it is named and checked here.
    if (typeof record.readAsOf !== "function") throw new TypeError("record must offer readAsOf (RecordPort, MOD-02)");
    this.#record = record;
    Object.freeze(this);
  }

  /** I-2: the Scope in force for (unit, currency) as of `at` - the latest appended (R-77) - or NoSubject. */
  governing(unit: Unit, currency: Currency, at: RecordHeight): ScopeRecord | UnknownValue {
    return this.#scopesAsOf(at).filter((s) => s.payload.unit === unit && s.payload.currency === currency).at(-1) ?? noSubject();
  }

  /** The Scope appended at `scope`, as of `at`, or NoSubject when none is there. */
  scopeAt(scope: RecordHeight, at: RecordHeight): ScopeRecord | UnknownValue {
    return this.#scopesAsOf(at).find((s) => s.at === scope) ?? noSubject();
  }

  /** I-5: whether the conditionally existing member is present (R-79). */
  hasStopCondition(scope: { readonly payload: ScopePayload }): boolean {
    return "stop" in scope.payload;
  }

  /** The scopes at or below `at`, in append order, by height (IR-31). */
  #scopesAsOf(at: RecordHeight): readonly ScopeRecord[] {
    const out: ScopeRecord[] = [];
    this.#record.readAsOf(at).forEach((fact, position) => {
      if (isScopeEntry(fact)) out.push(Object.freeze({ author: fact.author, at: height(position + 1), payload: fact.payload }));
    });
    return Object.freeze(out);
  }
}
