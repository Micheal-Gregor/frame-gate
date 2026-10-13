// REF-04 at parse, another spelling (MF-34): the material spread with its lineage taken out.
import type { CandidateProposal } from "../../../src/facts/index.js";
import type { SignatureGate } from "../../../src/lineage/index.js";
export const unsigned = (gate: SignatureGate, p: CandidateProposal) => {
  const { lineage, ...rest } = gate.materialOf(p);
  void lineage;
  return gate.sign(rest);
};
