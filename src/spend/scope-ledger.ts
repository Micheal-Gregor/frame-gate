// ScopeLedger — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Appends Scopes - authorized from a form, with the stop condition only where θ exists.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-14 (an AppendedFact) and OBJ-33. A Scope is a bounded permission for one (unit, currency),
// appended before the draws it governs and spent by dispatch (R-78), never edited (REF-17). It is
// authorized FROM a form built at the same height (R-81), so the ratio was in front of the author.
// The stop condition is a conditionally existing member: it exists only where θ exists at the unit's
// level in force (REF-15, R-79), and records a component, never a θ. The estimate is kept as given (R-80).
import { isUnknown, refuse, type AppendedFact, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Declaration, Unit } from "../catalog/index.js";
import type { FactRecord } from "../facts/index.js";
import type { BarValue } from "../calibration/index.js";
import type { AuthorizationForm } from "./authorization.js";

declare const SCOPED: unique symbol;

/** OBJ-33 (R-79): the component whose location the runner judges against the bar. MOD-11 never evaluates it. */
export interface StopCondition {
  readonly kind: "stop-at-bar";
  readonly component: string;
}
/** What the author asks for: no stop condition, or one at the bar for a component. */
export type StopRequest = { readonly kind: "none" } | StopCondition;

interface ScopeFields {
  readonly kind: "scope";
  readonly unit: Unit;
  readonly currency: Currency;
  /** The most draws the Scope admits: a positive integer. */
  readonly ceiling: number;
  /** The external estimate, as given (R-80). */
  readonly estimate: string;
}
/** OBJ-14's payload. The stop condition is a conditionally existing member, not a nullable field (AE-05). */
export type ScopePayload = ScopeFields | (ScopeFields & { readonly stop: StopCondition });

/** OBJ-14 - nominal: only `ScopeLedger.authorize` and the reads mint one. */
export type Scope = AppendedFact<"HUMAN", ScopePayload> & { readonly [SCOPED]: true };

/** MOD-09's bar: whether θ exists is all MOD-11 asks of it (SEAM-15). */
export interface ThresholdSource {
  of(level: string, component: string): Projection<BarValue | UnknownValue>;
}
/** MOD-03's declaration in force, for the level the bar is read at. */
export interface LevelSource {
  declarationAt(unit: Unit, at: RecordHeight): Declaration | UnknownValue;
}

export class ScopeLedger {
  readonly #record: FactRecord;
  readonly #bar: ThresholdSource;
  readonly #declarations: LevelSource;

  constructor({ record, bar, declarations }: { readonly record: FactRecord; readonly bar: ThresholdSource; readonly declarations: LevelSource }) {
    // OS-1: every object input is a declared slot - the operations called on it are named and checked here.
    const slot = (name: string, value: object | undefined | null, operations: readonly string[]): void => {
      if (value === undefined || value === null) throw new TypeError(`ScopeLedger requires ${name}`);
      for (const operation of operations) {
        if (typeof (value as Readonly<Record<string, unknown>>)[operation] !== "function") throw new TypeError(`${name} must offer ${operations.join(" and ")}`);
      }
    };
    slot("record", record, ["append", "readAsOf"]);
    slot("bar", bar, ["of"]);
    slot("declarations", declarations, ["declarationAt"]);
    this.#record = record;
    this.#bar = bar;
    this.#declarations = declarations;
    Object.freeze(this);
  }

  /** Appends a Scope authorized from `form`, built at `at` (R-81); REF-15 refuses a stop condition while θ = ⊥. */
  authorize(form: AuthorizationForm, ceiling: number, stop: StopRequest, estimate: string, author: "HUMAN", at: RecordHeight): Scope | UnknownValue {
    // R-81: display before act - the form acted on is the form of this height.
    if (form.at !== at) return refuse("form-before-act");
    if (!Number.isInteger(ceiling) || ceiling < 1) return refuse("malformed-ceiling");
    const fields: ScopeFields = { kind: "scope", unit: form.unit, currency: form.currency, ceiling, estimate };
    let payload: ScopePayload = Object.freeze(fields);
    if (stop.kind === "stop-at-bar") {
      // REF-15 / AE-05: the member exists only where θ exists, at the unit's level in force - derived, never chosen.
      const declaration = this.#declarations.declarationAt(form.unit, at);
      if (isUnknown(declaration)) return declaration;
      const bar = this.#bar.of(declaration.payload.level, stop.component).compute(at);
      if (isUnknown(bar)) return bar;
      if (bar.kind === "no-bar") return refuse("no-bar");
      payload = Object.freeze({ ...fields, stop: Object.freeze({ kind: "stop-at-bar", component: stop.component }) });
    }
    const recordedAt = this.#record.append(Object.freeze({ author, payload }));
    // The one place a Scope is minted.
    return Object.freeze({ author, at: recordedAt, payload }) as Scope;
  }
}

/**
 * A scope entry, recognised by kind among every module's facts - the ONE rule, shared by this
 * ledger and the scope reader. Provenance rests on the static guards (no scope-kind entry is built
 * outside src/spend; only `authorize` appends one) and at runtime on PC-02. Not re-exported.
 */
export function isScopeEntry(fact: unknown): fact is { author: "HUMAN"; payload: ScopePayload } {
  if (typeof fact !== "object" || fact === null || !("payload" in fact) || !("author" in fact)) return false;
  if ((fact as { author: unknown }).author !== "HUMAN") return false;
  const payload = (fact as { payload: unknown }).payload;
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Readonly<Record<string, unknown>>;
  const ceiling = p["ceiling"];
  if (p["kind"] !== "scope" || typeof p["unit"] !== "string" || typeof p["currency"] !== "string" || typeof p["estimate"] !== "string") return false;
  if (typeof ceiling !== "number" || !Number.isInteger(ceiling) || ceiling < 1) return false;
  if (!("stop" in p)) return true;
  const stop = p["stop"];
  return typeof stop === "object" && stop !== null && (stop as Readonly<Record<string, unknown>>)["kind"] === "stop-at-bar" && typeof (stop as Readonly<Record<string, unknown>>)["component"] === "string";
}
