// SignatureGate — Object Writing Standard
// OS-1  every dependency arrives at construction (below). Nothing is reached for.
// OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
// OS-4  the constructor validates and refuses; no half-built instance exists.
// OS-5  state is private; expose commands, not setters.
// OS-6  every refusal is typed and named in the interface contract.
// The signature covers the lineage digest: a signature is the digest of the candidate's material, its from commitment's digest included (R-43).
//
// Scaffolded by tools/new-object.py, then hand-fixed for strict TypeScript (MF-21).
//
// OBJ-32 SignatureGate (HOOK-04). The system owns no credential and no signer port, so a
// signature IS the digest, through the pinned OBJ-39 DigestPort, of the candidate's MATERIAL:
// the whole proposal plus its LINEAGE, the digest of the commitment it derives from (R-27,
// R-43). What is unforgeable is the binding: a signature formed over one lineage cannot verify
// a proposal re-pointed at another (VEC-05; F2's "re-approving a different commitment").
//   - Omitting the lineage is malformed AT PARSE: `SignatureMaterial` requires it (REF-04).
//   - A mismatch is `Refuse(malformed-signature)` at runtime, the same guard (R-44).
//   - A BOTTOM-from candidate's lineage is the typed BOTTOM marker, not invented bytes (R-45).
// The encoding is MOD-12's own (R-27): every field, in one fixed order, tagged with what it is.
import { refuse, type Gate, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { DigestPort } from "../ports/index.js";
import type { Currency, Unit } from "../catalog/index.js";
import type { Bottom, CandidateProposal, Commitment } from "../facts/index.js";

declare const LINEAGE: unique symbol;

/** The digest of the commitment a candidate derives from - minted only here (R-27, R-45). */
export type LineageDigest = { readonly kind: "lineage-digest"; readonly digest: string } & { readonly [LINEAGE]: true };

/** What a signature covers (R-43). `lineage` is REQUIRED: a material omitting it does not compile (REF-04). */
export interface SignatureMaterial {
  readonly context: RecordHeight;
  readonly unit: Unit;
  readonly currency: Currency;
  readonly condition: string;
  readonly seed: string;
  readonly from: RecordHeight | Bottom;
  readonly lineage: LineageDigest | Bottom;
}

/**
 * OBJ-32 SignatureGate, as a Gate descriptor (OBJ-03). One of the two gates a DERIVATION closes
 * (F1): the signature is recomputed, never judged. It takes no proposals, it guards the
 * Candidate append, and it fails in exactly one way.
 */
export const SIGNATURE_GATE: Gate<
  "the candidate's signature covers the digest of the commitment it derives from",
  never,
  "Candidate"
> = Object.freeze({
  condition: "the candidate's signature covers the digest of the commitment it derives from",
  closedBy: "DERIVATION",
  proposalsIn: Object.freeze([] as const),
  records: "Candidate",
  onFail: Object.freeze({ kind: "refuse", guard: "malformed-signature" } as const),
});

export class SignatureGate {
  readonly #digests: DigestPort;

  constructor({ digests }: { readonly digests: DigestPort }) {
    if (digests === undefined || digests === null) throw new TypeError("SignatureGate requires digests");
    // OS-1: a declared slot - the one operation called on it is named and checked here.
    if (typeof digests.digest !== "function") throw new TypeError("digests must offer digest (DigestPort, OBJ-39)");
    this.#digests = digests;
    Object.freeze(this);
  }

  /** The material a signature over `proposal` covers: the proposal and its lineage (R-43, R-45). */
  materialOf(proposal: CandidateProposal): SignatureMaterial {
    return Object.freeze({
      context: proposal.context.at,
      unit: proposal.unit,
      currency: proposal.currency,
      condition: proposal.condition,
      seed: proposal.seed,
      // By height (IR-43); BOTTOM as a fresh frozen member, never the caller's object.
      from: "payload" in proposal.from ? proposal.from.at : Object.freeze({ kind: "no-subject" } as const),
      lineage: this.#lineageOf(proposal.from),
    });
  }

  /** The signature over `material`: its digest through the pinned DigestPort (R-43). */
  sign(material: SignatureMaterial): string {
    return this.#digests.digest(
      this.#bytes({
        kind: "candidate-material",
        context: material.context,
        unit: material.unit,
        currency: material.currency,
        condition: material.condition,
        seed: material.seed,
        from: material.from,
        lineage: material.lineage,
      }),
    );
  }

  /** HOOK-04: VERIFIED iff `signature` is the signature over the proposal's material; else malformed-signature (R-44). */
  check(proposal: CandidateProposal, signature: string): "VERIFIED" | UnknownValue {
    return signature === this.sign(this.materialOf(proposal)) ? "VERIFIED" : refuse("malformed-signature");
  }

  /** The lineage of `from`: the digest of the WHOLE commitment, or the BOTTOM marker (R-45). */
  #lineageOf(from: Commitment | Bottom): LineageDigest | Bottom {
    if (!("payload" in from)) return Object.freeze({ kind: "no-subject" } as const);
    // Its height, its author, and every payload field - its accepted candidate included (R-41) -
    // POSITIONALLY: an encoding, never an entry shaped like a commitment (the forge rule).
    const digest = this.#digests.digest(
      this.#bytes(["commitment-lineage", from.at, from.author, from.payload.kind, from.payload.unit, from.payload.currency, from.payload.candidate]),
    );
    // The one place a LineageDigest is minted.
    return Object.freeze({ kind: "lineage-digest", digest }) as LineageDigest;
  }

  /** MOD-12's encoding (R-27): the value as JSON - keys or positions in the order written above - as UTF-8 (IR-80). */
  #bytes(value: unknown): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(value));
  }
}
