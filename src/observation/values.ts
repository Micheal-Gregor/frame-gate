/**
 * MOD-07 `observation/` - OBJ-08 Score and OBJ-09 Absent, and the reads over an observation's
 * vector. Value types and pure functions: nothing is handed in, so nothing here is an object.
 *
 * HOOK-02 is the TYPE system's: a Score is a branded number and ABSENT a tagged object, so an
 * arithmetic or relational expression over `Score | Absent` does not compile, and `??` / `||` are
 * inert on it. Known limits (IR-94): an explicit coercion - `Number(x)`, unary `+` or `-`, a template -
 * compiles; it is a deliberate conversion, not an arithmetic combination.
 */
import { noSubject, refuse, type UnknownValue } from "../kernel/index.js";
import type { Author } from "../ports/index.js";
import type { Observation } from "./observation-ledger.js";

declare const SCORE: unique symbol;

/** OBJ-08: a finite number (R-58), minted only by `score`. The only operand arithmetic admits. */
export type Score = number & { readonly [SCORE]: true };

/** OBJ-09's discharge condition: "not yet" (a task) or "not here" (a permanent bound). */
export type Discharge =
  | { readonly kind: "dischargeable"; readonly task: string }
  | { readonly kind: "undischargeable"; readonly reason: string };

/** OBJ-09: an in-band NON-value - not a number, not null, not a sentinel (AE-04). */
export interface Absent {
  readonly kind: "absent";
  readonly discharge: Discharge;
}

/** One component's value: a Score or ABSENT - an expression over this union does not compile (HOOK-02). */
export type ComponentValue = Score | Absent;

/** A Score, or `refuse("not-finite")` for NaN and the infinities (R-58). */
export function score(n: number): Score | UnknownValue {
  // The one place a Score is minted.
  return Number.isFinite(n) ? (n as Score) : refuse("not-finite");
}

/** ABSENT, not yet observed: `task` names what would supply it. */
export function dischargeable(task: string): Absent {
  return Object.freeze({ kind: "absent", discharge: Object.freeze({ kind: "dischargeable", task }) } as const);
}

/** ABSENT, not observable in this currency at all: `reason` is the permanent bound. */
export function undischargeable(reason: string): Absent {
  return Object.freeze({ kind: "absent", discharge: Object.freeze({ kind: "undischargeable", reason }) } as const);
}

/** The only legal inspection of an ABSENT sibling. */
export function isAbsent(value: ComponentValue): value is Absent {
  return typeof value === "object" && value !== null && value.kind === "absent";
}

export function dischargeCondition(absent: Absent): Discharge {
  return absent.discharge;
}

/** A component's value, or NoSubject for a name the observation does not state. */
export function component(observation: Observation, name: string): ComponentValue | UnknownValue {
  const found = observation.payload.components.find((c) => c.name === name);
  return found === undefined ? noSubject() : found.value;
}

/** The author of one component, or NoSubject for a name the observation does not state. */
export function authorOf(observation: Observation, name: string): Author | UnknownValue {
  const found = observation.payload.components.find((c) => c.name === name);
  return found === undefined ? noSubject() : found.author;
}

/** Whether every component is ABSENT - legal, and useless. */
export function isAllAbsent(observation: Observation): boolean {
  return observation.payload.components.every((c) => isAbsent(c.value));
}

/** Only the components carrying a Score, in order: ABSENT ones are omitted, never zeroed. */
export function scoredComponents(observation: Observation): readonly { readonly name: string; readonly score: Score }[] {
  const out: { readonly name: string; readonly score: Score }[] = [];
  for (const c of observation.payload.components) if (!isAbsent(c.value)) out.push(Object.freeze({ name: c.name, score: c.value }));
  return Object.freeze(out);
}
