// DrawContextLog — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Appends draw contexts (declaration read at the draw height, REF-05) and their later
// resolution labels; reads draws and resolutions as of a height (OBJ-16; MOD-05).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// A draw context records, at the moment of a draw (F2, OBJ-16):
//   - the draw-time FEATURES, given by the caller (R-22) - never read from the catalog,
//     whose features(unit) belongs to MOD-13 alone (F1, SEAM-27);
//   - the DECLARATION in force at the draw height, READ through the declared reader and
//     recorded by its height (R-21) - so a re-declaration cannot rewrite history (S-08);
//   - the governing SCOPE by its record height, and the CONDITION as an identity string,
//     both carried and never interpreted (R-23; O-4 held, owned by MOD-11).
// A RESOLUTION LABEL (`DRAW` / `REVISION`) is attached later, as a further append; it is
// not known at draw time and is not a precondition of the draw. Two labels on one draw
// answer `uncomputable` (R-24), as two commitments do (R-20).
import {
  height,
  isUnknown,
  noSubject,
  refuse,
  uncomputable,
  type AppendedFact,
  type RecordHeight,
  type UnknownValue,
} from "../kernel/index.js";
import type { Author } from "../ports/index.js";
import type { Declaration, Features, Unit } from "../catalog/index.js";
import type { FactRecord } from "./commitment-ledger.js";

declare const DRAWN: unique symbol;
declare const LABELLED: unique symbol;

export interface DrawContextPayload {
  readonly kind: "draw-context";
  readonly unit: Unit;
  readonly features: Features;
  /** The height of the declaration in force at the draw height (R-21, IR-43). */
  readonly declaration: RecordHeight;
  /** The governing scope, by its record height (R-23). */
  readonly scope: RecordHeight;
  /** The condition's identity, uninterpreted here (R-23; MOD-06 defines it). */
  readonly condition: string;
}

export type Resolution = "DRAW" | "REVISION";

export interface ResolutionLabelPayload {
  readonly kind: "resolution-label";
  /** The draw context labelled, by its height (IR-43). */
  readonly context: RecordHeight;
  readonly resolution: Resolution;
}

/** OBJ-16 — nominal: only `DrawContextLog.recordDraw` and its reads mint one. */
export type DrawContext = AppendedFact<Author, DrawContextPayload> & { readonly [DRAWN]: true };

/** A resolution label on a draw context — nominal: only `DrawContextLog.label` mints one. */
export type ResolutionLabel = AppendedFact<Author, ResolutionLabelPayload> & { readonly [LABELLED]: true };

/**
 * R-21 / SEAM-05: the one question the draw context asks of MOD-03. Declared by the
 * operation called on it (OS-1); satisfied by `DeclarationLedger`.
 */
export interface DeclarationReader {
  declarationAt(unit: Unit, at: RecordHeight): Declaration | UnknownValue;
}

/**
 * R-78 / HOOK-05 @before-draw: MOD-11's ScopeGate, asked before a draw is recorded - a scope is
 * spent by dispatch, not by return (DG-F3, cited). Declared by the operation called on it (OS-1).
 */
export interface DrawScopeGate {
  admitsDraw(unit: Unit, scope: RecordHeight, at: RecordHeight): "WITHIN" | UnknownValue;
}

export class DrawContextLog {
  readonly #record: FactRecord;
  readonly #declarations: DeclarationReader;
  readonly #scopes: DrawScopeGate;

  constructor({ record, declarations, scopes }: { readonly record: FactRecord; readonly declarations: DeclarationReader; readonly scopes: DrawScopeGate }) {
    if (record === undefined || record === null) throw new TypeError("DrawContextLog requires record");
    // OS-1: an object input is a declared slot - the operations called on it are named
    // and checked here, never discovered inside a method.
    if (typeof record.append !== "function" || typeof record.readAsOf !== "function") {
      throw new TypeError("record must offer append and readAsOf (RecordPort, MOD-02)");
    }
    if (declarations === undefined || declarations === null) throw new TypeError("DrawContextLog requires declarations");
    if (typeof declarations.declarationAt !== "function") {
      throw new TypeError("declarations must offer declarationAt (SEAM-05, R-21)");
    }
    if (scopes === undefined || scopes === null) throw new TypeError("DrawContextLog requires scopes");
    if (typeof scopes.admitsDraw !== "function") throw new TypeError("scopes must offer admitsDraw (MOD-11 ScopeGate, R-78)");
    this.#record = record;
    this.#declarations = declarations;
    this.#scopes = scopes;
    Object.freeze(this);
  }

  /** Appends the context of a draw of `unit` at height `at`; refuses when no declaration is in force (REF-05). */
  recordDraw(unit: Unit, features: Features, scope: RecordHeight, condition: string, at: RecordHeight, author: Author): DrawContext | UnknownValue {
    // R-21: READ the declaration in force at the draw height - never take one from the
    // caller, which could be stale, and never read a "current" one (S-08).
    const declaration = this.#declarations.declarationAt(unit, at);
    if (isUnknown(declaration)) {
      // "None in force" is REF-05's refusal. Any other Unknown is the reader's own answer,
      // passed through unchanged: collapsing it into the refusal would lose which it was.
      return declaration.kind === "no-subject" ? refuse("no-declaration") : declaration;
    }
    // HOOK-05 @before-draw (R-78): MOD-11 is asked before anything is recorded, so a refused draw
    // leaves no context, no candidate and no cost.
    const within = this.#scopes.admitsDraw(unit, scope, at);
    if (within !== "WITHIN") return within;
    const payload: DrawContextPayload = Object.freeze({
      kind: "draw-context",
      unit,
      features: Object.freeze({ ...features }), // R-22: as given, then out of the caller's reach
      declaration: declaration.at,
      scope,
      condition,
    });
    const recordedAt = this.#record.append(Object.freeze({ author, payload }));
    // The one place a DrawContext is minted on append.
    return Object.freeze({ author, at: recordedAt, payload }) as DrawContext;
  }

  /** Appends a resolution label to a draw context, after the fact. */
  label(context: DrawContext, resolution: Resolution, author: Author): ResolutionLabel {
    // No "already labelled?" check: that is a read, and this append has no height. A
    // second label is appended and the read answers `uncomputable` for it (R-24).
    const payload: ResolutionLabelPayload = Object.freeze({ kind: "resolution-label", context: context.at, resolution });
    const at = this.#record.append(Object.freeze({ author, payload }));
    // The one place a ResolutionLabel is minted.
    return Object.freeze({ author, at, payload }) as ResolutionLabel;
  }

  /** The draw contexts for `unit` appended at or below `at`, in append order. */
  drawsAsOf(unit: Unit, at: RecordHeight): readonly DrawContext[] {
    const out: DrawContext[] = [];
    this.#record.readAsOf(at).forEach((fact, position) => {
      if (!this.#isDrawOf(fact, unit)) return;
      // A fact's height is its 1-based position (OBJ-10; IR-31). The one place a
      // DrawContext is minted on read.
      out.push(Object.freeze({ author: fact.author, at: height(position + 1), payload: fact.payload }) as DrawContext);
    });
    return Object.freeze(out);
  }

  /** A draw context's resolution as of `at`: the label, NoSubject when none yet, uncomputable when two. */
  resolutionAt(context: DrawContext, at: RecordHeight): Resolution | UnknownValue {
    const labels: ResolutionLabelPayload[] = [];
    this.#record.readAsOf(at).forEach((fact) => {
      if (this.#isLabelOf(fact, context.at)) labels.push(fact.payload);
    });
    // None, one, or more than one - asked by position, as the commitment fold does.
    const [first, second] = labels;
    if (first === undefined) return noSubject(); // not known yet; absence is not a refusal
    if (second !== undefined) return uncomputable("two-resolution-labels");
    return first.resolution;
  }

  /**
   * A draw context for `unit`, recognised by kind among every module's facts. A draw context
   * is not a HUMAN act (its author is recorded as given, IR-47), so provenance rests
   * on the static forge guard - no draw-context-kind entry is built or appended outside
   * src/facts (BC-05-6) - and, at runtime, on PC-02's identity binding.
   */
  #isDrawOf(fact: unknown, unit: Unit): fact is { author: Author; payload: DrawContextPayload } {
    return isDrawContextEntry(fact) && fact.payload.unit === unit;
  }

  /** A resolution label on the draw context at `context`. */
  #isLabelOf(fact: unknown, context: RecordHeight): fact is { author: Author; payload: ResolutionLabelPayload } {
    const payload = this.#payloadOf(fact);
    return (
      payload !== undefined &&
      payload["kind"] === "resolution-label" &&
      payload["context"] === context &&
      (payload["resolution"] === "DRAW" || payload["resolution"] === "REVISION")
    );
  }

  #payloadOf(fact: unknown): Readonly<Record<string, unknown>> | undefined {
    if (typeof fact !== "object" || fact === null || !("payload" in fact) || !("author" in fact)) return undefined;
    const payload = (fact as { payload: unknown }).payload;
    return typeof payload === "object" && payload !== null ? (payload as Readonly<Record<string, unknown>>) : undefined;
  }
}

/**
 * A draw context, recognised by kind among every module's facts - the ONE rule, shared by this log
 * and the lineage reader (R-78's charges). Provenance rests on the static forge guard and PC-02.
 * MOD-05-internal: not re-exported from facts/index.ts.
 */
export function isDrawContextEntry(fact: unknown): fact is { author: Author; payload: DrawContextPayload } {
  if (typeof fact !== "object" || fact === null || !("payload" in fact) || !("author" in fact)) return false;
  const payload = (fact as { payload: unknown }).payload;
  return typeof payload === "object" && payload !== null && (payload as Readonly<Record<string, unknown>>)["kind"] === "draw-context";
}
