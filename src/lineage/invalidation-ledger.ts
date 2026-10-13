// InvalidationLedger — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// Derive, display, then append the HUMAN invalidation; answer which commitments are invalidated as of a height.
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-18 Invalidation, appended only after OBJ-28's scope was derived and displayed (RC-4):
//   display    derives the scope at a height, hands it to the renderer (OBJ-36, outbound; its
//              answer is never read), and returns a DisplayedScope - minted only here (R-48);
//   invalidate takes only that token: without a display it does not compile (REF-07 at parse),
//              and a token derived at another height than the act's is refused (R-47);
//   reads      K, and every commitment that accepted a candidate of K's FROZEN scope - the
//              closure as of `scopeAt` - whenever it was made (R-42, R-46). Supersession is
//              DERIVED from the one invalidation, never appended commitment by commitment.
// MOD-05 asks `isInvalidated` (R-19) and MOD-09 reads `invalidatedAsOf` (S-07); both answer
// from ONE derivation. Nothing derived is kept: every answer is recomputed from the record.
import { height, refuse, succeeds, type AppendedFact, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { RendererPort } from "../ports/index.js";
import type { Commitment, FactRecord } from "../facts/index.js";
import type { ScopeValue } from "./invalidation-scope.js";

declare const INVALIDATED: unique symbol;
declare const DISPLAYED: unique symbol;

export interface InvalidationPayload {
  readonly kind: "invalidation";
  /** The superseded commitment, by its height (IR-43). */
  readonly commitment: RecordHeight;
  /** The height its scope was derived and displayed at (R-47): the scope is FROZEN there (R-46). */
  readonly scopeAt: RecordHeight;
}

/** OBJ-18 — nominal: only `InvalidationLedger.invalidate` and its reads mint one. */
export type Invalidation = AppendedFact<"HUMAN", InvalidationPayload> & { readonly [INVALIDATED]: true };

/** R-48: proof that a derived scope was handed to the renderer - minted only by `display`. */
export type DisplayedScope = { readonly scope: ScopeValue } & { readonly [DISPLAYED]: true };

/** MOD-12's own scope derivation (OBJ-28), injected (OS-3). */
export interface ScopeSource {
  of(commitment: RecordHeight): Projection<ScopeValue>;
}

export class InvalidationLedger {
  readonly #record: FactRecord;
  readonly #scopes: ScopeSource;
  readonly #renderer: RendererPort<ScopeValue>;

  constructor({ record, scopes, renderer }: { readonly record: FactRecord; readonly scopes: ScopeSource; readonly renderer: RendererPort<ScopeValue> }) {
    // OS-1: every object input is a declared slot - the operations called on it are named and
    // checked here, never discovered inside a method.
    if (record === undefined || record === null) throw new TypeError("InvalidationLedger requires record");
    if (typeof record.append !== "function" || typeof record.readAsOf !== "function") {
      throw new TypeError("record must offer append and readAsOf (RecordPort, MOD-02)");
    }
    if (scopes === undefined || scopes === null) throw new TypeError("InvalidationLedger requires scopes");
    if (typeof scopes.of !== "function") throw new TypeError("scopes must offer of (InvalidationScope, OBJ-28)");
    if (renderer === undefined || renderer === null) throw new TypeError("InvalidationLedger requires renderer");
    if (typeof renderer.present !== "function") throw new TypeError("renderer must offer present (RendererPort, OBJ-36)");
    this.#record = record;
    this.#scopes = scopes;
    this.#renderer = renderer;
    Object.freeze(this);
  }

  /** Derives `commitment`'s scope as of `at`, hands it to the renderer, and returns the proof (R-48). */
  display(commitment: Commitment, at: RecordHeight): DisplayedScope {
    // S-06: what is shown and what is appended are the same derivation at the same height.
    const scope = this.#scopes.of(commitment.at).compute(at);
    this.#renderer.present(scope); // outbound only: its answer is never an input (OBJ-36)
    // The one place a DisplayedScope is minted.
    return Object.freeze({ scope }) as DisplayedScope;
  }

  /** Appends the HUMAN invalidation of a displayed scope derived at `at` (REF-07, R-47). */
  invalidate(displayed: DisplayedScope, author: "HUMAN", at: RecordHeight): Invalidation | UnknownValue {
    // R-47: the derivation the human was shown must be the one at the act's height. The port has
    // no head read, so `at` is the caller's assertion - the single-writer production concern.
    if (displayed.scope.at !== at) return refuse("scope-before-act");
    const payload: InvalidationPayload = Object.freeze({ kind: "invalidation", commitment: displayed.scope.commitment, scopeAt: at });
    // What the record holds carries no height: the record assigns it (IR-31).
    const recordedAt = this.#record.append(Object.freeze({ author, payload }));
    // The one place an Invalidation is minted on append.
    return Object.freeze({ author, at: recordedAt, payload }) as Invalidation;
  }

  /** R-19, MOD-05's question: is `commitment` invalidated as of `at` (R-42, R-46)? */
  isInvalidated(commitment: Commitment, at: RecordHeight): boolean {
    return this.invalidatedAsOf(at).includes(commitment.at);
  }

  /** S-07, MOD-09's read: the invalidated commitments as of `at`, by height, in append order. */
  invalidatedAsOf(at: RecordHeight): readonly RecordHeight[] {
    const invalidated = new Set<RecordHeight>();
    for (const invalidation of this.#invalidationsAsOf(at)) {
      const { commitment, scopeAt } = invalidation.payload;
      invalidated.add(commitment);
      // K's FROZEN scope is its closure as of `scopeAt` (R-46). It is read as of `at` - the
      // caller's height, never one made up here - and bounded by `scopeAt`: lineage points only
      // backwards, so a candidate at or below `scopeAt` is in the closure as of `at` exactly
      // when it is in the closure as of `scopeAt` (IR-78).
      const scope = this.#scopes.of(commitment).compute(at);
      const frozen = new Set(scope.candidates.filter((c) => !succeeds(c.at, scopeAt)).map((c) => c.at));
      // Every commitment that accepted a frozen candidate - before the invalidation or after it,
      // born superseded (R-46).
      for (const accepting of scope.commitments) if (frozen.has(accepting.candidate)) invalidated.add(accepting.at);
    }
    return Object.freeze([...invalidated].sort((a, b) => a - b));
  }

  /** This ledger's invalidations at or below `at`, minted by position (IR-31). */
  #invalidationsAsOf(at: RecordHeight): readonly Invalidation[] {
    const out: Invalidation[] = [];
    this.#record.readAsOf(at).forEach((fact, position) => {
      if (!this.#isInvalidation(fact)) return;
      // The one place an Invalidation is minted on read.
      out.push(Object.freeze({ author: fact.author, at: height(position + 1), payload: fact.payload }) as Invalidation);
    });
    return Object.freeze(out);
  }

  /**
   * An invalidation, recognised by kind among every module's facts: HUMAN-authored, naming a
   * commitment and the height its scope was derived at. Provenance beyond this rests on the
   * static guards - no invalidation-kind entry is built outside src/lineage, and only
   * `invalidate` appends one (the paths map) - and at runtime on PC-02.
   */
  #isInvalidation(fact: unknown): fact is { author: "HUMAN"; payload: InvalidationPayload } {
    if (typeof fact !== "object" || fact === null || !("payload" in fact) || !("author" in fact)) return false;
    const payload = (fact as { payload: unknown }).payload;
    if (typeof payload !== "object" || payload === null) return false;
    return (
      (fact as { author: unknown }).author === "HUMAN" &&
      (payload as { kind?: unknown }).kind === "invalidation" &&
      typeof (payload as { commitment?: unknown }).commitment === "number" &&
      typeof (payload as { scopeAt?: unknown }).scopeAt === "number"
    );
  }
}
