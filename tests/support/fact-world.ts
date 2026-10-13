/**
 * A test world over the REAL facts path (R-41). A commitment accepts a candidate, and a
 * candidate needs a declared unit, a recorded draw, and a `from` the from-check accepts: BOTTOM
 * at the least currency (licensed independent, R-10), or the commitment in force immediately
 * below. So no test can commit what the system could never commit. The setup deciders always
 * admit, verify and stay within the ceiling: they are setup, never the subject of a test.
 */
import { isUnknown, type RecordHeight } from "../../src/kernel/index.js";
import { CurrencyOrder, DeclarationLedger, IndependenceLedger, type Currency, type Unit } from "../../src/catalog/index.js";
import {
  BOTTOM,
  CandidateLedger,
  CommitmentLedger,
  DrawContextLog,
  type Candidate,
  type Commitment,
  type DrawScopeGate,
  type InvalidationReader,
  type ScopeCeiling,
} from "../../src/facts/index.js";
import { inMemoryRecord, type TestRecord } from "../catalog/in-memory-record.js";

export const never: InvalidationReader = { isInvalidated: () => false };

export interface FactWorld {
  readonly record: TestRecord;
  readonly order: CurrencyOrder;
  readonly declarations: DeclarationLedger;
  readonly draws: DrawContextLog;
  readonly independence: IndependenceLedger;
  readonly commitments: CommitmentLedger;
  readonly candidates: CandidateLedger;
  /** A candidate for (unit, currency), drawn through the real path under `condition` (default `setup`), charged to `scope`. */
  drawAt(unit: Unit, currency: Currency, condition?: string, scope?: RecordHeight): Candidate;
  /** A commitment for (unit, currency), accepting a candidate drawn through the real path. */
  commitAt(unit: Unit, currency: Currency): Commitment;
}

/** Setup stand-ins for MOD-11's gate (R-78): every draw and every candidate is within scope. */
const anyScope: DrawScopeGate & ScopeCeiling = { admitsDraw: () => "WITHIN", admitsCandidate: () => "WITHIN" };

/**
 * `record`, when given, is the one the world appends to - so an invalidation reader built over it
 * (MOD-12's ledger) can be handed in before the fold that reads it. `scopes` and `ceiling`, when
 * given, are MOD-11's real gate (R-78); otherwise every draw is within scope.
 */
export function factWorld({
  currencies,
  invalidations,
  record = inMemoryRecord(),
  scopes = anyScope,
  ceiling = anyScope,
}: {
  readonly currencies: readonly string[];
  readonly invalidations: InvalidationReader;
  readonly record?: TestRecord;
  readonly scopes?: DrawScopeGate;
  readonly ceiling?: ScopeCeiling;
}): FactWorld {
  const order = new CurrencyOrder({ currencies: [...currencies] });
  const declarations = new DeclarationLedger({ record, levels: ["easy", "hard"] });
  const draws = new DrawContextLog({ record, declarations, scopes });
  const independence = new IndependenceLedger({ record });
  const commitments = new CommitmentLedger({ record, invalidations });
  const candidates = new CandidateLedger({
    record,
    commitments,
    currencies: order,
    independence,
    admission: { admit: () => "ADMIT" },
    signatures: { check: () => "VERIFIED" },
    ceiling,
  });
  const now = (): RecordHeight => record.noise();
  const drawAt = (unit: Unit, currency: Currency, condition = "setup", scope?: RecordHeight): Candidate => {
    if (isUnknown(declarations.declarationAt(unit, now()))) declarations.declare(unit, "easy", "HUMAN");
    const below = order.predecessors(currency);
    if (isUnknown(below)) throw new Error(`setup: ${currency} is not in the order`);
    const immediate = below.at(-1);
    let from: Commitment | typeof BOTTOM = BOTTOM;
    if (immediate === undefined) {
      const license = independence.independenceAt(unit, now());
      if (isUnknown(license) || !license.payload.independent) independence.declareIndependence(unit, true, "HUMAN");
    } else {
      const k = commitments.effectiveCommitment(unit, immediate, now());
      if (isUnknown(k)) throw new Error(`setup: nothing committed for ${unit} at ${immediate}`);
      from = k;
    }
    const h = now();
    const context = draws.recordDraw(unit, { setup: true }, scope ?? h, condition, h, "ENGINE");
    if (isUnknown(context)) throw new Error(`setup: the draw answered ${context.kind}`);
    const k = candidates.appendCandidate({ context, unit, currency, condition, seed: "setup", from }, "sig", now(), "ENGINE");
    if (isUnknown(k)) throw new Error(`setup: the candidate answered ${k.kind}`);
    return k;
  };
  return { record, order, declarations, draws, independence, commitments, candidates, drawAt, commitAt: (unit, currency) => commitments.commit(drawAt(unit, currency), "HUMAN") };
}
