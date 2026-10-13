// ReachabilityGate — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-3  it IS a decider: MOD-05 receives it injected (R-18), never imports it.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The one admission decision on the reachability axis: ADMIT or Refuse(unreachable), with
// the attributable evaluation (OBJ-29; MOD-04; HOOK-01).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// One condition - reachable(u, c) = true - quantified over the currency order, with ON_FAIL
// Refuse(unreachable) and no other failure outcome (F2 OBJ-29; SEAM-03 "no third outcome").
// It COMPOSES OBJ-24 rather than inheriting from it (RFD-02): a Gate carries ON_FAIL, a
// Projection does not. Its refusal is terminal for that draw and precedes the append and the
// spend, so nothing is created and nothing costs (REF-03). It is the ONLY place reachability
// is decided; a second check anywhere is a removed duplicate growing back.
import { isUnknown, refuse, type Gate, type Projection, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { ReachabilityEvaluation } from "./reachability.js";

/** OBJ-29 as a value: the gate's descriptor (OBJ-03). */
export const REACHABILITY_GATE: Gate<"reachable(u, c) = true", never, "Candidate"> = Object.freeze({
  condition: "reachable(u, c) = true",
  closedBy: "DERIVATION",
  proposalsIn: Object.freeze([] as const),
  records: "Candidate",
  onFail: Object.freeze({ kind: "refuse", guard: "unreachable" } as const),
});

/** OBJ-24, as the gate composes it: the projection for a (unit, currency). */
export interface ReachabilityProjections {
  of(unit: Unit, currency: Currency): Projection<ReachabilityEvaluation>;
}

export class ReachabilityGate {
  readonly #reachability: ReachabilityProjections;

  constructor({ reachability }: { readonly reachability: ReachabilityProjections }) {
    if (reachability === undefined || reachability === null) throw new TypeError("ReachabilityGate requires reachability");
    if (typeof reachability.of !== "function") throw new TypeError("reachability must offer of (OBJ-24)");
    this.#reachability = reachability;
    Object.freeze(this);
  }

  /** The ONE evaluation: the verdict with its witnesses and, when refused, what it names (R-34). */
  evaluate(unit: Unit, currency: Currency, at: RecordHeight): ReachabilityEvaluation {
    return this.#reachability.of(unit, currency).compute(at);
  }

  /** MOD-05's injected admission (R-18, SEAM-03): ADMIT, or Refuse(unreachable), from that one evaluation. */
  admit(unit: Unit, currency: Currency, at: RecordHeight): "ADMIT" | UnknownValue {
    const evaluation = this.evaluate(unit, currency, at);
    if (isUnknown(evaluation)) return evaluation; // e.g. a currency outside the order: passed through
    // ON_FAIL, and no other failure outcome (SEAM-03); the naming lives in the evaluation (R-34).
    return evaluation.verdict === "reachable" ? "ADMIT" : refuse("unreachable");
  }
}
