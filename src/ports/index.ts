/**
 * MOD-02 `ports/` - the single external boundary.
 *
 * OBJ-35 RecordPort - OBJ-36 RendererPort - OBJ-37 DispatchPort
 * OBJ-38 AuthorEnum - OBJ-39 DigestPort
 *
 * This is the only module in the codebase permitted to name an external. Every
 * external is CITED here and DEFINED nowhere: this system owns no storage engine,
 * no renderer, no dispatch mechanism, no identity source and no hash function.
 *
 * The arrow always points from a domain module INTO ports/, never out. MOD-02
 * depends on no domain module, which is what lets it be built first (S3 s10).
 *
 * Enforcement lives in `tools/checks/external-isolation.ts` (REF-02), not in the
 * type system - TypeScript has no notion of which module may name what.
 */

/**
 * IR-09. The port interfaces are parameterised over the kernel types they
 * transport rather than importing them.
 *
 * F1 records a hard MOD-02 -> MOD-01 dependency ("an append returns an OBJ-10
 * RecordHeight, and the facts it appends are OBJ-01 subclasses"), while the build
 * order puts ports/ first. Parameterising honours both: the binding between a
 * height and a fact is preserved AT THE USE SITE, where MOD-05 supplies the real
 * kernel types, and MOD-02 compiles alone.
 *
 * It is also the truer reading of this module's own boundary - F1: "a port
 * transports, it does not validate domain rules." A transport that named the fact
 * type would be asserting something about the cargo.
 */

/**
 * OBJ-35 RecordPort - the append primitive and the as-of read.
 *
 * The mechanical reason OBJ-01's append-only contract holds at runtime and not
 * only at parse: this surface exposes `append` and `readAsOf` and exposes no
 * mutator, so a correct-looking call to update or delete a fact has nothing to
 * call. Absence is the specification here.
 */
export interface RecordPort<TFact, THeight> {
  append(fact: TFact): THeight;
  readAsOf(height: THeight): readonly TFact[];
}

/**
 * OBJ-36 RendererPort - the outbound presentation boundary.
 *
 * Everything the system shows a human leaves through here: a derived invalidation
 * scope before an append, an authorization form, a withheld-axis report.
 *
 * `present` returns void deliberately. F1: the return value "must not be an input
 * to any domain decision", and the cheapest way to guarantee that is to have no
 * return value to be tempted by.
 *
 * This is the boundary at which PC-07 becomes possible - a faithful core defeated
 * by a surface that renders only the axes present. The withheld list is therefore
 * CONSTRUCTED in the core (MOD-10) and merely TRANSPORTED here.
 */
export interface RendererPort<TPayload> {
  present(payload: TPayload): void;
}

/**
 * OBJ-37 DispatchPort - the mechanism by which work is actually performed.
 *
 * Carries one semantic that is CITED VERBATIM from the external contract and is
 * not restated in our words:
 *
 *   "A scope is spent by dispatch, not by return."
 *
 * DG-F3. Without the citation an implementer invents whether a failed draw burns a
 * scope, and the two answers give different ceilings. MOD-11 `spend/` consumes
 * this; producing the citation is MOD-02's obligation, not MOD-11's.
 *
 * STATUS: the citation above is the S3's transcription of the external rule. The
 * external source itself is not yet bound in this repo (F1 open item OI-1). Until
 * it is, `DISPATCH_SEMANTICS` is the citation, not a paraphrase, and must not be
 * reworded.
 */
export const DISPATCH_SEMANTICS = "A scope is spent by dispatch, not by return." as const;

export interface DispatchPort<TWork> {
  dispatch(work: TWork): void;
}

/**
 * OBJ-38 AuthorEnum - the three author roles, sourced externally, minted nowhere.
 *
 * Load-bearing for INV-PROV: ENGINE and DIRECTOR may only PROPOSE; only HUMAN may
 * close a `closed_by: HUMAN_ACT` gate or author a Declaration.
 *
 * `mayDecide` is a type predicate rather than a boolean helper so the rule narrows
 * at the call site: after the guard, the caller holds `"HUMAN"` and not merely a
 * true answer it must remember the meaning of.
 *
 * What this does NOT do: establish that a caller genuinely IS the author it claims.
 * That is PC-02, a production concern, and it is not solved here.
 */
export const AUTHORS = ["ENGINE", "DIRECTOR", "HUMAN"] as const;

export type Author = (typeof AUTHORS)[number];

export function mayDecide(author: Author): author is "HUMAN" {
  return author === "HUMAN";
}

/**
 * OBJ-39 DigestPort - the digest used by the signature binding a derived candidate
 * to the commitment it derives from (OBJ-32, MOD-12).
 *
 * Pinned externally so that no local choice of hash can silently change what a
 * signature covers. This system chooses no hash.
 *
 * C4-F2 / IR-06: the S3 declares VEC-05's encoding as hex-sha256 while SEAM-26
 * says the function is externally pinned. Until the pin is confirmed, VEC-05
 * asserts that two digests DIFFER rather than asserting a literal.
 */
export interface DigestPort {
  digest(bytes: Uint8Array): string;
}
