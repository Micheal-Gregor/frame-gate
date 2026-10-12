// IndependenceLedger — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Appends HUMAN independence acts; reads the one in force at a height
// (ODG-FG-06, resolved by owner ruling R-10; MOD-03).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-11 permits `from = BOTTOM` only for the least currency of an INDEPENDENT unit
// (F2 O-8). R-10: independence is declared by a HUMAN, appended, and read as of a
// height - never derived, never inferred, never a field. No act in force means
// NoSubject, which means NOT licensed. These two operations are not in the frozen
// S3's MOD-03 interface; they are IR-29, linked to ODG-FG-06, and proposed upstream
// as SP-2.
import { height, noSubject, type AppendedFact, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { SharedRecord } from "./declaration-ledger.js";
import type { Unit } from "./unit-registry.js";

declare const INDEPENDENCE: unique symbol;

export interface IndependencePayload {
  readonly kind: "independence";
  readonly unit: Unit;
  readonly independent: boolean;
}

/** A HUMAN act licensing (or withdrawing) a unit's independence. Nominal, like a Declaration. */
export type IndependenceAct = AppendedFact<"HUMAN", IndependencePayload> & {
  readonly [INDEPENDENCE]: true;
};

export class IndependenceLedger {
  readonly #record: SharedRecord;

  constructor({ record }: { readonly record: SharedRecord }) {
    if (record === undefined || record === null) throw new TypeError("IndependenceLedger requires record");
    if (typeof record.append !== "function" || typeof record.readAsOf !== "function") {
      throw new TypeError("record must offer append and readAsOf (RecordPort, MOD-02)");
    }
    this.#record = record;
    Object.freeze(this);
  }

  /** Appends a HUMAN act asserting (`true`) or withdrawing (`false`) a unit's independence. */
  declareIndependence(unit: Unit, independent: boolean, author: "HUMAN"): IndependenceAct {
    const payload: IndependencePayload = Object.freeze({ kind: "independence", unit, independent });
    const at = this.#record.append(Object.freeze({ author, payload }));
    return Object.freeze({ author, at, payload }) as IndependenceAct;
  }

  /** The independence act in force for `unit` as of `at`, or NoSubject when none had been made. */
  independenceAt(unit: Unit, at: RecordHeight): IndependenceAct | UnknownValue {
    const facts = this.#record.readAsOf(at);
    for (let position = facts.length - 1; position >= 0; position -= 1) {
      const fact = facts[position];
      if (this.#isActOf(fact, unit)) {
        return Object.freeze({ author: fact.author, at: height(position + 1), payload: fact.payload }) as IndependenceAct;
      }
    }
    return noSubject(); // no act in force: NOT licensed (R-10)
  }

  /** This ledger's own entries, recognised by kind among every module's facts. */
  #isActOf(fact: unknown, unit: Unit): fact is { author: "HUMAN"; payload: IndependencePayload } {
    if (typeof fact !== "object" || fact === null || !("payload" in fact) || !("author" in fact)) return false;
    const payload = (fact as { payload: unknown }).payload;
    return (
      (fact as { author: unknown }).author === "HUMAN" &&
      typeof payload === "object" && payload !== null &&
      (payload as { kind?: unknown }).kind === "independence" &&
      (payload as { unit?: unknown }).unit === unit
    );
  }
}
