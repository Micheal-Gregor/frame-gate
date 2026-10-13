// ObservationLedger — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Appends observation vectors over a configured component list; reads the one in force as of a height.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-15: a VECTOR about one candidate, every configured component stated (R-59) - a Score or
// ABSENT - each with its OWN author. Observations are proposals (OBJ-31 takes them, never
// requires them), so any author may make one. The latest at or below a height is in force (R-60);
// the earlier stay in the record. An Undischargeable component is permanent: no later vector may
// score it. An all-ABSENT vector is legal and stored; an unobserved candidate is NoSubject.
import { height, noSubject, refuse, type AppendedFact, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Author } from "../ports/index.js";
import type { Candidate, FactRecord } from "../facts/index.js";
import { isAbsent, type ComponentValue } from "./values.js";

declare const OBSERVED: unique symbol;

/** One component as given: its value and its OWN author (per-component provenance). */
export interface ComponentEntry {
  readonly value: ComponentValue;
  readonly author: Author;
}

/** One component as recorded. */
export interface ObservedComponent {
  readonly name: string;
  readonly value: ComponentValue;
  readonly author: Author;
}

export interface ObservationPayload {
  readonly kind: "observation";
  /** The candidate observed, by its height (IR-43). */
  readonly candidate: RecordHeight;
  /** Every configured component, in the configured order (R-59). */
  readonly components: readonly ObservedComponent[];
}

/** OBJ-15 — nominal: only `ObservationLedger.observe` and its reads mint one. */
export type Observation = AppendedFact<Author, ObservationPayload> & { readonly [OBSERVED]: true };

export class ObservationLedger {
  readonly #record: FactRecord;
  readonly #components: readonly string[];

  constructor({ record, components }: { readonly record: FactRecord; readonly components: readonly string[] }) {
    if (record === undefined || record === null) throw new TypeError("ObservationLedger requires record");
    if (typeof record.append !== "function" || typeof record.readAsOf !== "function") {
      throw new TypeError("record must offer append and readAsOf (RecordPort, MOD-02)");
    }
    // R-59: the configured components, loaded once - at least one, each a distinct name.
    if (!Array.isArray(components) || components[0] === undefined) throw new TypeError("ObservationLedger requires at least one component");
    if (new Set(components).size !== components.length || components.some((c) => typeof c !== "string" || c === "")) {
      throw new TypeError("components must be distinct, non-empty names");
    }
    this.#record = record;
    this.#components = Object.freeze([...components]);
    Object.freeze(this);
  }

  /** Appends one observation of `candidate`: every configured component, each with its author (R-59, R-60). */
  observe(candidate: Candidate, values: Readonly<Record<string, ComponentEntry>>, author: Author, at: RecordHeight): Observation | UnknownValue {
    // R-59: every configured component, and only those.
    const given = Object.keys(values);
    if (given.some((name) => !this.#components.includes(name))) return refuse("unknown-component");
    if (this.#components.some((name) => !given.includes(name))) return refuse("missing-component");
    // R-60: an Undischargeable component, in any earlier observation as of `at`, stays ABSENT.
    const permanent = new Set(
      this.#observationsOf(candidate.at, at).flatMap((o) => o.payload.components.filter((c) => isAbsent(c.value) && c.value.discharge.kind === "undischargeable").map((c) => c.name)),
    );
    if (this.#components.some((name) => permanent.has(name) && !isAbsent((values[name] as ComponentEntry).value))) return refuse("undischargeable");
    const components = Object.freeze(
      this.#components.map((name) => {
        const { value, author: by } = values[name] as ComponentEntry;
        // ABSENT copied fresh and frozen, never the caller's object.
        const kept: ComponentValue = isAbsent(value) ? Object.freeze({ kind: "absent", discharge: Object.freeze({ ...value.discharge }) } as const) : value;
        return Object.freeze({ name, value: kept, author: by });
      }),
    );
    const payload: ObservationPayload = Object.freeze({ kind: "observation", candidate: candidate.at, components });
    // What the record holds carries no height: the record assigns it (IR-31).
    const recordedAt = this.#record.append(Object.freeze({ author, payload }));
    // The one place an Observation is minted on append.
    return Object.freeze({ author, at: recordedAt, payload }) as Observation;
  }

  /** The observation in force for `candidate` as of `at`: the latest (R-60), or NoSubject. */
  observationOf(candidate: Candidate, at: RecordHeight): Observation | UnknownValue {
    const latest = this.#observationsOf(candidate.at, at).at(-1);
    return latest === undefined ? noSubject() : latest;
  }

  /** This ledger's observations of the candidate at `candidate`, at or below `at`, in append order. */
  #observationsOf(candidate: RecordHeight, at: RecordHeight): readonly Observation[] {
    const out: Observation[] = [];
    this.#record.readAsOf(at).forEach((fact, position) => {
      if (!this.#isObservation(fact) || fact.payload.candidate !== candidate) return;
      // The one place an Observation is minted on read.
      out.push(Object.freeze({ author: fact.author, at: height(position + 1), payload: fact.payload }) as Observation);
    });
    return Object.freeze(out);
  }

  /** An observation, recognised by kind among every module's facts: a candidate, and a list of named, authored components. */
  #isObservation(fact: unknown): fact is { author: Author; payload: ObservationPayload } {
    if (typeof fact !== "object" || fact === null || !("payload" in fact) || !("author" in fact)) return false;
    const payload = (fact as { payload: unknown }).payload;
    if (typeof payload !== "object" || payload === null) return false;
    const p = payload as { kind?: unknown; candidate?: unknown; components?: unknown };
    return p.kind === "observation" && typeof p.candidate === "number" && Array.isArray(p.components) && p.components.every((c: unknown) => typeof c === "object" && c !== null && typeof (c as { name?: unknown }).name === "string" && typeof (c as { author?: unknown }).author === "string" && "value" in c);
  }
}
