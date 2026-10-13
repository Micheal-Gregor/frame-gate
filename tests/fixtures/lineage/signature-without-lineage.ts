// REF-04 at parse (BC-12-1): a signature's material without the lineage digest cannot be formed.
import type { CandidateProposal } from "../../../src/facts/index.js";
import type { SignatureGate } from "../../../src/lineage/index.js";
export const unsigned = (gate: SignatureGate, p: CandidateProposal) =>
  gate.sign({ context: p.context.at, unit: p.unit, currency: p.currency, condition: p.condition, seed: p.seed, from: "payload" in p.from ? p.from.at : p.from });
