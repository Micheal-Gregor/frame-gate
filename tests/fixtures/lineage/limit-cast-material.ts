// REGISTERED LIMIT (IR-85): a CAST forms the "without" material at parse - the constructed
// artefact VEC-05 uses. SignatureMaterial is not branded (a material is not an act), so no mint
// rule reaches it. At runtime its signature is refused: `check` recomputes (R-44).
import type { CandidateProposal } from "../../../src/facts/index.js";
import type { SignatureGate, SignatureMaterial } from "../../../src/lineage/index.js";
export const artefact = (gate: SignatureGate, p: CandidateProposal) => {
  const { lineage, ...rest } = gate.materialOf(p);
  void lineage;
  return gate.sign(rest as unknown as SignatureMaterial);
};
