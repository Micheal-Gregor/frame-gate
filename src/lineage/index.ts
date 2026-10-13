/**
 * MOD-12 `lineage/` - the module's public surface (OBJ-18, OBJ-28, OBJ-32).
 *
 * Binds a candidate to the commitment it derives from, so the binding is covered by the
 * signature (OBJ-32, HOOK-04) and walkable, so the consequences of un-approving a commitment are
 * derived and displayed before they are enacted (OBJ-28 -> OBJ-18, RC-4).
 *
 * Registration runs MOD-12 -> MOD-05: the SignatureGate is injected as MOD-05's signature check
 * and the InvalidationLedger as its invalidation reader. MOD-05 imports nothing from here (S3
 * section 7: "a registration is not an import").
 *
 * Deliberately NOT exported: any way to mint a LineageDigest, a DisplayedScope or an Invalidation
 * except through their owners, the digest function (MOD-02's, pinned externally), and any stored
 * scope.
 */
export { SIGNATURE_GATE, SignatureGate, type LineageDigest, type SignatureMaterial } from "./signature-gate.js";
export { InvalidationScope, type LineageWalk, type ScopeValue } from "./invalidation-scope.js";
export {
  InvalidationLedger,
  type DisplayedScope,
  type Invalidation,
  type InvalidationPayload,
  type ScopeSource,
} from "./invalidation-ledger.js";
