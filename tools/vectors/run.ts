/**
 * The golden-vector harness (R-36). rederive.py runs it as the declared `rederive_invoke`:
 *
 *     node --import tsx tools/vectors/run.ts {vector_id} {entry} {input_file}
 *
 * Each vector has a handler that names the ONE implementing file it derives from. A run handed a
 * different `{entry}` refuses (exit 2): impl_sha pins `{entry}`, so the file pinned and the file
 * that computes must be the same. The handler reads the encoded input, builds its fixture record,
 * calls the REAL implementation, and prints only the encoded output. Nothing here decides a
 * value: the vector is computed, never written by hand (CC-5).
 *
 * It lives in tools/ because reading the input names an external (node:fs), which REF-02 allows
 * only outside src/ (outside ports/) - the reason R-36 exists. For the same reason it is where
 * OBJ-39 is BOUND for a vector: the system chooses no digest, and a vector names the one it used.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { height, isUnknown, type RecordHeight } from "../../src/kernel/index.js";
import type { RecordPort } from "../../src/ports/index.js";
import { CurrencyOrder, DeclarationLedger, IndependenceLedger, type Currency, type Unit } from "../../src/catalog/index.js";
import { BOTTOM, CandidateLedger, CommitmentLedger, DrawContextLog, type Commitment } from "../../src/facts/index.js";
import { Reachability, ReachabilityGate } from "../../src/reachability/index.js";
import { SignatureGate, type SignatureMaterial } from "../../src/lineage/index.js";
import { score } from "../../src/observation/index.js";
import { spread } from "../../src/statistics/index.js";

/** A record for a fixture: append-only, read as of a height (IR-31). */
function fixtureRecord(): RecordPort<unknown, RecordHeight> {
  const facts: unknown[] = [];
  return {
    append: (fact: unknown): RecordHeight => {
      facts.push(fact);
      return height(facts.length);
    },
    readAsOf: (at: RecordHeight): readonly unknown[] => facts.slice(0, at),
  };
}

type Handler = { readonly entry: string; readonly run: (input: string) => string };

const HANDLERS: Readonly<Record<string, Handler>> = {
  /** VEC-01 (MOD-04): the reachability truth table over a three-currency order. */
  "VEC-01": {
    entry: "src/reachability/reachability.ts",
    run: (input) => {
      const spec = JSON.parse(input) as {
        readonly currencies: readonly string[];
        readonly commitmentSets: readonly (readonly string[])[];
        readonly requested: readonly string[];
      };
      const order = new CurrencyOrder({ currencies: [...spec.currencies] });
      const unit = "u" as Unit;
      const table: Record<string, Record<string, string>> = {};
      for (const set of spec.commitmentSets) {
        const row: Record<string, string> = {};
        for (const requested of spec.requested) {
          const record = fixtureRecord();
          const commitments = new CommitmentLedger({ record, invalidations: { isInvalidated: () => false } });
          // R-41: each commitment in the cell's set accepts a real candidate, drawn in cost order -
          // BOTTOM (licensed) at the least currency, then the commitment below.
          const declarations = new DeclarationLedger({ record, levels: ["fixture"] });
          const independence = new IndependenceLedger({ record });
          const draws = new DrawContextLog({ record, declarations });
          const setup = new CandidateLedger({
            record,
            commitments,
            currencies: order,
            independence,
            admission: { admit: () => "ADMIT" },
            signatures: { check: () => "VERIFIED" },
            ceiling: { admitsDraw: () => "WITHIN" },
          });
          declarations.declare(unit, "fixture", "HUMAN");
          independence.declareIndependence(unit, true, "HUMAN");
          let below: Commitment | typeof BOTTOM = BOTTOM;
          for (const c of set) {
            const h = record.append({ kind: "fixture-height" });
            const context = draws.recordDraw(unit, {}, h, "fixture", h, "ENGINE");
            if (isUnknown(context)) throw new Error(`VEC-01 fixture: draw refused (${context.kind})`);
            const candidate = setup.appendCandidate({ context, unit, currency: c as Currency, condition: "fixture", seed: "fixture", from: below }, "fixture", record.append({ kind: "fixture-height" }), "ENGINE");
            if (isUnknown(candidate)) throw new Error(`VEC-01 fixture: candidate refused (${candidate.kind})`);
            below = commitments.commit(candidate, "HUMAN");
          }
          const gate = new ReachabilityGate({ reachability: new Reachability({ currencies: order, commitments }) });
          const at = record.append({ kind: "fixture-height" });
          const answer = gate.admit(unit, requested as Currency, at);
          row[requested] = isUnknown(answer) ? (answer.kind === "refuse" ? `Refuse(${answer.guard})` : answer.kind) : answer;
        }
        table[`{${set.join(",")}}`] = row;
      }
      return JSON.stringify(table);
    },
  },
  /**
   * VEC-03 (MOD-08): one fixed score set read at nested cardinalities. Below the floor the row
   * carries the unknown's token and NO number; at or above it, the statistic's value at full
   * emitted precision. The statistic's identity rides in the input (R-63).
   */
  "VEC-03": {
    entry: "src/statistics/scores.ts",
    run: (input) => {
      const spec = JSON.parse(input) as { readonly statistic: string; readonly scores: readonly number[]; readonly cardinalities: readonly number[] };
      if (spec.statistic !== "sample-sd") throw new Error(`VEC-03: no statistic '${spec.statistic}' (R-63)`);
      const scores = spec.scores.map((n) => {
        const v = score(n);
        if (isUnknown(v)) throw new Error(`VEC-03 fixture: ${n} is not a Score`);
        return v;
      });
      return JSON.stringify(
        spec.cardinalities.map((n) => {
          const r = spread(scores.slice(0, n));
          return { n, scores: spec.scores.slice(0, n), expect: isUnknown(r) ? (r.kind === "undetermined" ? `UNDETERMINED(${r.ae})` : r.kind) : r };
        }),
      );
    },
  },
  /**
   * VEC-05 (MOD-12): one candidate's material, held fixed, signed WITH the digest of the
   * commitment it derives from and WITHOUT it. The "without" form cannot be emitted (REF-04: the
   * material requires its lineage), so it is constructed here, as an artefact, from the same
   * material with the lineage removed. The digest is bound from the input's identifier (IR-06).
   */
  "VEC-05": {
    entry: "src/lineage/signature-gate.ts",
    run: (input) => {
      const spec = JSON.parse(input) as { readonly digest: string; readonly currencies: readonly string[]; readonly condition: string; readonly seed: string };
      if (spec.digest !== "sha256-hex") throw new Error(`VEC-05: no binding for the digest '${spec.digest}'`);
      const gate = new SignatureGate({ digests: { digest: (bytes) => createHash("sha256").update(bytes).digest("hex") } });
      const record = fixtureRecord();
      const order = new CurrencyOrder({ currencies: [...spec.currencies] });
      const [least, next] = order.currencies() as readonly [Currency, Currency];
      const unit = "u" as Unit;
      const commitments = new CommitmentLedger({ record, invalidations: { isInvalidated: () => false } });
      const declarations = new DeclarationLedger({ record, levels: ["fixture"] });
      const independence = new IndependenceLedger({ record });
      const draws = new DrawContextLog({ record, declarations });
      const setup = new CandidateLedger({
        record,
        commitments,
        currencies: order,
        independence,
        admission: { admit: () => "ADMIT" },
        signatures: gate,
        ceiling: { admitsDraw: () => "WITHIN" },
      });
      declarations.declare(unit, "fixture", "HUMAN");
      independence.declareIndependence(unit, true, "HUMAN");
      const drawn = (at: RecordHeight) => {
        const context = draws.recordDraw(unit, {}, at, spec.condition, at, "ENGINE");
        if (isUnknown(context)) throw new Error(`VEC-05 fixture: draw refused (${context.kind})`);
        return context;
      };
      // The commitment the candidate derives from: u at the least currency, from BOTTOM.
      const h0 = record.append({ kind: "fixture-height" });
      const first = { context: drawn(h0), unit, currency: least, condition: spec.condition, seed: spec.seed, from: BOTTOM };
      const accepted = setup.appendCandidate(first, gate.sign(gate.materialOf(first)), record.append({ kind: "fixture-height" }), "ENGINE");
      if (isUnknown(accepted)) throw new Error(`VEC-05 fixture: candidate refused (${accepted.kind})`);
      const k: Commitment = commitments.commit(accepted, "HUMAN");
      // The candidate whose signature the vector pins: at the next currency, from k.
      const h1 = record.append({ kind: "fixture-height" });
      const material = gate.materialOf({ context: drawn(h1), unit, currency: next, condition: spec.condition, seed: spec.seed, from: k });
      const { lineage, ...without } = material;
      void lineage;
      return JSON.stringify({ digest: spec.digest, with: gate.sign(material), without: gate.sign(without as unknown as SignatureMaterial) });
    },
  },
};

const [vectorId, entry, inputFile] = process.argv.slice(2);
const handler = vectorId === undefined ? undefined : HANDLERS[vectorId];
if (handler === undefined || entry === undefined || inputFile === undefined) {
  process.stderr.write(`run.ts: no handler for ${String(vectorId)} (usage: run.ts <VEC-ID> <entry> <input_file>)\n`);
  process.exit(2);
}
if (resolve(entry) !== resolve(handler.entry)) {
  process.stderr.write(`run.ts: ${vectorId} derives from ${handler.entry}, but was handed ${entry}; impl_sha would pin the wrong file\n`);
  process.exit(2);
}
process.stdout.write(handler.run(readFileSync(inputFile, "utf8")));
