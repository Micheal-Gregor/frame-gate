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
  type InvalidationReader,
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
  /** A candidate for (unit, currency), drawn through the real path under condition `setup`. */
  drawAt(unit: Unit, currency: Currency): Candidate;
  /** A commitment for (unit, currency), accepting a candidate drawn through the real path. */
  commitAt(unit: Unit, currency: Currency): Commitment;
}

export function factWorld({ currencies, invalidations }: { readonly currencies: readonly string[]; readonly invalidations: InvalidationReader }): FactWorld {
  const record = inMemoryRecord();
  const order = new CurrencyOrder({ currencies: [...currencies] });
  const declarations = new DeclarationLedger({ record, levels: ["easy", "hard"] });
  const draws = new DrawContextLog({ record, declarations });
  const independence = new IndependenceLedger({ record });
  const commitments = new CommitmentLedger({ record, invalidations });
  const candidates = new CandidateLedger({
    record,
    commitments,
    currencies: order,
    independence,
    admission: { admit: () => "ADMIT" },
    signatures: { check: () => "VERIFIED" },
    ceiling: { admitsDraw: () => "WITHIN" },
  });
  const now = (): RecordHeight => record.noise();
  const drawAt = (unit: Unit, currency: Currency): Candidate => {
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
    const context = draws.recordDraw(unit, { setup: true }, h, "setup", h, "ENGINE");
    if (isUnknown(context)) throw new Error(`setup: the draw answered ${context.kind}`);
    const k = candidates.appendCandidate({ context, unit, currency, condition: "setup", seed: "setup", from }, "sig", now(), "ENGINE");
    if (isUnknown(k)) throw new Error(`setup: the candidate answered ${k.kind}`);
    return k;
  };
  return { record, order, declarations, draws, independence, commitments, candidates, drawAt, commitAt: (unit, currency) => commitments.commit(drawAt(unit, currency), "HUMAN") };
}
