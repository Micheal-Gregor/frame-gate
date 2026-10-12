// DeclarationLedger — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Appends HUMAN classification declarations; reads the one in force at a height
// (OBJ-13, MOD-03; hosts HOOK-07).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// Two prohibitions, opposite directions, both INV-PROV: a declared classification
// is never produced by a derivation, and an inferred one is never written.
//   - REF-01 at parse (R-11): `Declaration` is NOMINAL. Its brand has no runtime
//     value, so no definition outside this class can build one; a derivation
//     returning a classification as a Declaration does not compile.
//   - HOOK-07, author half, at parse (R-11): `declare` takes only the narrowed
//     "HUMAN" member of OBJ-38. "No derivation in the call chain" beyond that is a
//     registered limit (IR-30): it rests on PC-02 and on K7.
// It is an APPENDED ACT, not a field: there is `declarationAt(unit, height)` and no
// "current declaration" - the convenient read is the one that rewrites history.
import { height, noSubject, refuse, type AppendedFact, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { RecordPort } from "../ports/index.js";
import type { Unit } from "./unit-registry.js";

declare const DECLARED: unique symbol;

export interface DeclarationPayload {
  readonly kind: "declaration";
  readonly unit: Unit;
  readonly level: string;
}

/** OBJ-13 — nominal (R-11): only `DeclarationLedger.declare` and its as-of read mint one. */
export type Declaration = AppendedFact<"HUMAN", DeclarationPayload> & { readonly [DECLARED]: true };

/**
 * The shared record as this ledger sees it: every module's facts, in append order.
 * Its facts are typed `unknown` because they ARE of every kind; the ledger
 * recognises its own entries by their `kind`.
 */
export type SharedRecord = RecordPort<unknown, RecordHeight>;

export class DeclarationLedger {
  readonly #record: SharedRecord;
  readonly #levels: readonly string[];

  constructor({ record, levels }: { readonly record: SharedRecord; readonly levels: readonly string[] }) {
    if (record === undefined || record === null) throw new TypeError("DeclarationLedger requires record");
    // OS-1: an object input is a declared slot - the operations called on it are named
    // and checked here, never discovered inside a method.
    if (typeof record.append !== "function" || typeof record.readAsOf !== "function") {
      throw new TypeError("record must offer append and readAsOf (RecordPort, MOD-02)");
    }
    if (levels === undefined || levels === null) throw new TypeError("DeclarationLedger requires levels");
    this.#record = record;
    this.#levels = Object.freeze([...levels]);
    Object.freeze(this);
  }

  /** The configured classification levels. One bar per level; levels are never merged (MOD-09). */
  levels(): readonly string[] {
    return this.#levels;
  }

  /** Appends a HUMAN declaration that `unit` belongs to `level`. HOOK-07 guards the author. */
  declare(unit: Unit, level: string, author: "HUMAN"): Declaration | UnknownValue {
    if (!this.#levels.includes(level)) return refuse("level-not-configured");
    const payload: DeclarationPayload = Object.freeze({ kind: "declaration", unit, level });
    // What the record holds carries no height: the record assigns it (IR-31).
    const at = this.#record.append(Object.freeze({ author, payload }));
    // The one place a Declaration is minted on append (R-11).
    return Object.freeze({ author, at, payload }) as Declaration;
  }

  /** The declaration in force for `unit` as of `at`, or NoSubject when none had been made. */
  declarationAt(unit: Unit, at: RecordHeight): Declaration | UnknownValue {
    const facts = this.#record.readAsOf(at);
    for (let position = facts.length - 1; position >= 0; position -= 1) {
      const fact = facts[position];
      if (this.#isDeclarationOf(fact, unit)) {
        // A fact's height is its 1-based position: a RecordHeight is a count of
        // appends (OBJ-10; IR-31). The one place a Declaration is minted on read.
        return Object.freeze({ author: fact.author, at: height(position + 1), payload: fact.payload }) as Declaration;
      }
    }
    return noSubject();
  }

  /** This ledger's own entries, recognised by kind among every module's facts. */
  #isDeclarationOf(fact: unknown, unit: Unit): fact is { author: "HUMAN"; payload: DeclarationPayload } {
    if (typeof fact !== "object" || fact === null || !("payload" in fact) || !("author" in fact)) return false;
    const payload = (fact as { payload: unknown }).payload;
    return (
      (fact as { author: unknown }).author === "HUMAN" &&
      typeof payload === "object" && payload !== null &&
      (payload as { kind?: unknown }).kind === "declaration" &&
      (payload as { unit?: unknown }).unit === unit
    );
  }
}
