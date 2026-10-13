// RevisionLog — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Appends HUMAN prompt revisions; reads the condition in force as of a height.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-17: the ONLY way a condition changes (RFD-03): a HUMAN append (IR-88) naming the condition
// in force from then on. The condition it ends is the one in force before it, read from the record;
// it deletes, alters and rescores nothing. Read as of a height, never stored.
import { height, noSubject, type AppendedFact, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { FactRecord } from "../facts/index.js";
import type { ConditionIdentity } from "./condition-identities.js";

declare const REVISED: unique symbol;

export interface RevisionPayload {
  readonly kind: "prompt-revision";
  readonly unit: Unit;
  readonly currency: Currency;
  /** The condition in force from this revision on; the one it ends is read from the record (IR-88). */
  readonly condition: ConditionIdentity;
}

/** OBJ-17 — nominal: only `RevisionLog.revise` and its reads mint one. */
export type PromptRevision = AppendedFact<"HUMAN", RevisionPayload> & { readonly [REVISED]: true };

export class RevisionLog {
  readonly #record: FactRecord;

  constructor({ record }: { readonly record: FactRecord }) {
    if (record === undefined || record === null) throw new TypeError("RevisionLog requires record");
    if (typeof record.append !== "function" || typeof record.readAsOf !== "function") {
      throw new TypeError("record must offer append and readAsOf (RecordPort, MOD-02)");
    }
    this.#record = record;
    Object.freeze(this);
  }

  /** Appends the HUMAN revision of (unit, currency) to `condition` (IR-88). */
  revise(unit: Unit, currency: Currency, condition: ConditionIdentity, author: "HUMAN"): PromptRevision {
    const payload: RevisionPayload = Object.freeze({ kind: "prompt-revision", unit, currency, condition });
    // What the record holds carries no height: the record assigns it (IR-31).
    const at = this.#record.append(Object.freeze({ author, payload }));
    // The one place a PromptRevision is minted on append.
    return Object.freeze({ author, at, payload }) as PromptRevision;
  }

  /** The revisions of (unit, currency) at or below `at`, in record order. */
  revisions(unit: Unit, currency: Currency, at: RecordHeight): readonly PromptRevision[] {
    const out: PromptRevision[] = [];
    this.#record.readAsOf(at).forEach((fact, position) => {
      if (!this.#isRevision(fact) || fact.payload.unit !== unit || fact.payload.currency !== currency) return;
      // The one place a PromptRevision is minted on read.
      out.push(Object.freeze({ author: fact.author, at: height(position + 1), payload: fact.payload }) as PromptRevision);
    });
    return Object.freeze(out);
  }

  /** The condition in force for (unit, currency) as of `at`, or NoSubject when none was ever set. */
  conditionInForce(unit: Unit, currency: Currency, at: RecordHeight): ConditionIdentity | UnknownValue {
    const last = this.revisions(unit, currency, at).at(-1);
    return last === undefined ? noSubject() : last.payload.condition;
  }

  /** A revision, recognised by kind among every module's facts: HUMAN, naming a unit, a currency and a condition. */
  #isRevision(fact: unknown): fact is { author: "HUMAN"; payload: RevisionPayload } {
    if (typeof fact !== "object" || fact === null || !("payload" in fact) || !("author" in fact)) return false;
    const payload = (fact as { payload: unknown }).payload;
    if (typeof payload !== "object" || payload === null) return false;
    const p = payload as { kind?: unknown; unit?: unknown; currency?: unknown; condition?: unknown };
    return (fact as { author: unknown }).author === "HUMAN" && p.kind === "prompt-revision" && typeof p.unit === "string" && typeof p.currency === "string" && typeof p.condition === "string";
  }
}
