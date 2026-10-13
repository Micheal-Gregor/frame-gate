// POSITIVE CONTROL (BC-12-1): the one way to form a signature - over the material MOD-12 builds.
import type { CandidateProposal } from "../../../src/facts/index.js";
import type { SignatureGate } from "../../../src/lineage/index.js";
export const signed = (gate: SignatureGate, p: CandidateProposal) => gate.sign(gate.materialOf(p));
