// REF-04 at parse, another spelling (MF-34): a lineage written as `undefined` is no lineage.
import type { CandidateProposal } from "../../../src/facts/index.js";
import type { SignatureGate } from "../../../src/lineage/index.js";
export const unsigned = (gate: SignatureGate, p: CandidateProposal) => gate.sign({ ...gate.materialOf(p), lineage: undefined });
