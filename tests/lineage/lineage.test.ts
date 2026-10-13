/**
 * MOD-12 `lineage/` (BC-12-1..BC-12-12). Written before the classes and watched failing.
 *
 * Slices B and C are ONE rung (R-43..R-48): the S3 §5 test treats lineage/ as built once the
 * directory exists, and from then on REF-04 and REF-07 must each select exactly one case.
 * Every world here is MOD-05's real facts path with MOD-12 REGISTERED into it - its signature
 * gate as the candidate append's signature check, its invalidation ledger as the fold's
 * invalidation reader (S3 section 7: a registration is not an import).
 */
import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { height, isUnknown, noSubject, refuse, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { DigestPort, RendererPort } from "../../src/ports/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import { BOTTOM, CandidateLedger, LineageReader, type Candidate, type CandidateProposal, type Commitment } from "../../src/facts/index.js";
import { Reachability, ReachabilityGate } from "../../src/reachability/index.js";
import {
  InvalidationLedger,
  InvalidationScope,
  SIGNATURE_GATE,
  SignatureGate,
  type Invalidation,
  type ScopeValue,
  type SignatureMaterial,
} from "../../src/lineage/index.js";
import { inMemoryRecord, type TestRecord } from "../catalog/in-memory-record.js";
import { factWorld } from "../support/fact-world.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const u = "u1" as Unit;
const v = "u2" as Unit;
/** The test binding of OBJ-39: MOD-12 chooses no digest; the S3 declares hex-sha256 (IR-06). */
const sha256: DigestPort = { digest: (bytes) => createHash("sha256").update(bytes).digest("hex") };

type Out = { codes: number[]; messages: string[] };
const cache: { fixtures?: Record<string, Out> } = {};
/** Each parse-level fixture's diagnostic codes, compiled by the ledger checker (once per file). */
const fixtures = (): Record<string, Out> =>
  (cache.fixtures ??= (
    JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/ledger-checks.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as {
      fixtures: Record<string, Out>;
    }
  ).fixtures);

const nothingAppendedSince = (record: TestRecord, h: RecordHeight) =>
  expect(Number(record.noise()), "a refusal appended something").toBe(Number(h) + 1);
const candidate = (x: Candidate | UnknownValue): Candidate => {
  if (isUnknown(x)) throw new Error(`the candidate was refused: ${x.kind}`);
  return x;
};

/** MOD-05's real facts path with MOD-12 registered into it. */
function lineageWorld({ record = inMemoryRecord(), renderer }: { readonly record?: TestRecord; readonly renderer?: RendererPort<ScopeValue> } = {}) {
  const shown: ScopeValue[] = [];
  const scopes = new InvalidationScope({ lineage: new LineageReader({ record }) });
  const invalidations = new InvalidationLedger({ record, scopes, renderer: renderer ?? { present: (s) => void shown.push(s) } });
  const w = factWorld({ currencies: ["c0", "c1", "c2"], invalidations, record });
  const gate = new SignatureGate({ digests: sha256 });
  const signed = new CandidateLedger({
    record,
    commitments: w.commitments,
    currencies: w.order,
    independence: w.independence,
    admission: { admit: () => "ADMIT" },
    signatures: gate,
    ceiling: { admitsDraw: () => "WITHIN" },
  });
  const [c0, c1, c2] = w.order.currencies() as readonly [Currency, Currency, Currency];
  /** A proposal for (unit, currency) from `from`, under a draw recorded now. */
  const propose = (unit: Unit, currency: Currency, from: CandidateProposal["from"], condition = "cond"): CandidateProposal => {
    if (isUnknown(w.declarations.declarationAt(unit, record.noise()))) w.declarations.declare(unit, "easy", "HUMAN");
    const h = record.noise();
    const context = w.draws.recordDraw(unit, { k: "v" }, h, condition, h, "ENGINE");
    if (isUnknown(context)) throw new Error(`setup: the draw answered ${context.kind}`);
    return { context, unit, currency, condition, seed: "seed-1", from };
  };
  /** Appends `p` on the SIGNED path, signed over its own material. */
  const append = (p: CandidateProposal): Candidate => candidate(signed.appendCandidate(p, gate.sign(gate.materialOf(p)), record.noise(), "ENGINE"));
  /** Derive and display `k`'s scope now, then invalidate it now (R-47, R-48). */
  const invalidate = (k: Commitment): Invalidation => {
    const h = record.noise();
    const inv = invalidations.invalidate(invalidations.display(k, h), "HUMAN", h);
    if (isUnknown(inv)) throw new Error(`setup: the invalidation answered ${inv.kind}`);
    return inv;
  };
  return { ...w, record, gate, signed, scopes, invalidations, shown, c0, c1, c2, propose, append, invalidate };
}

describe("BC-12-1 - REF-04 (INV-SIG): a signature omitting the lineage digest is refused", () => {
  it("test_signature_without_lineage_digest_is_refused", () => {
    // At parse: the "without" material cannot be formed (TS2345 on the missing `lineage`).
    const without = fixtures()["tests/fixtures/lineage/signature-without-lineage.ts"];
    expect(without?.codes, "a material without its lineage was signed").toEqual([2345]);
    expect(without?.messages.join(" "), "the refusal at parse is not about the lineage").toContain("'lineage'");
    expect(fixtures()["tests/fixtures/lineage/sign-the-material.ts"]?.codes, "the positive control no longer compiles").toEqual([]);
    // Every SPELLING of the omission (MF-34, pinned before battery 19): left out (above), written
    // as undefined, spread out.
    expect(fixtures()["tests/fixtures/lineage/signature-with-undefined-lineage.ts"]?.codes, "an undefined lineage was signed").toEqual([2322]);
    expect(fixtures()["tests/fixtures/lineage/signature-spread-without-lineage.ts"]?.codes, "a material spread without its lineage was signed").toEqual([2345]);
    // REGISTERED LIMIT (IR-85): a cast forms it at parse - and it is refused at runtime, below.
    expect(fixtures()["tests/fixtures/lineage/limit-cast-material.ts"]?.codes, "the registered limit closed silently").toEqual([]);
    // At runtime: the constructed artefact (VEC-05's "without") is refused on MOD-05's append path.
    const w = lineageWorld();
    const k0 = w.commitAt(u, w.c0);
    const p = w.propose(u, w.c1, k0);
    const material = w.gate.materialOf(p);
    const { lineage, ...rest } = material;
    expect(lineage, "a derived candidate's lineage is not a digest").not.toEqual(noSubject());
    const artefact = w.gate.sign(rest as unknown as SignatureMaterial);
    const h = w.record.noise();
    expect(w.signed.appendCandidate(p, artefact, h, "ENGINE")).toEqual(refuse("malformed-signature"));
    nothingAppendedSince(w.record, h);
    // Positive (REF-04): a signature covering the lineage verifies, and the candidate is appended.
    expect(candidate(w.signed.appendCandidate(p, w.gate.sign(material), w.record.noise(), "ENGINE")).payload.signature).toBe(w.gate.sign(material));
  });
});

describe("BC-12-2 - a signature is the digest of its whole material (R-43)", () => {
  it("test_a_signature_is_the_digest_of_its_whole_material", () => {
    const w = lineageWorld();
    const k0 = w.commitAt(u, w.c0);
    const kv = w.commitAt(v, w.c0);
    const p = w.propose(u, w.c1, k0);
    const sig = w.gate.sign(w.gate.materialOf(p));
    expect(w.gate.sign(w.gate.materialOf(p)), "one material signed twice differs").toBe(sig);
    expect(w.gate.check(p, sig)).toBe("VERIFIED");
    // The digest is the PORT's (OBJ-39): nothing in MOD-12 chooses it.
    const other = new SignatureGate({ digests: { digest: (b) => `other:${sha256.digest(b)}` } });
    expect(other.sign(other.materialOf(p)), "the signature does not come from the injected digest").not.toBe(sig);
    // Sensitive to EVERY field the material carries: one variant per field, the set read off the
    // material itself (RD-12). `lineage` moves with `from` (BC-12-5, VEC-05).
    const variants: Readonly<Record<string, CandidateProposal>> = {
      context: { ...p, context: w.propose(u, w.c1, k0).context },
      unit: { ...p, unit: v },
      currency: { ...p, currency: w.c2 },
      condition: { ...p, condition: "elsewhere" },
      seed: { ...p, seed: "seed-2" },
      from: { ...p, from: kv },
    };
    expect(Object.keys(variants).sort(), "a field of the material has no variant").toEqual(
      Object.keys(w.gate.materialOf(p)).filter((k) => k !== "lineage").sort(),
    );
    for (const [field, q] of Object.entries(variants)) {
      expect(w.gate.check(q, sig), `a proposal differing in ${field} verified`).toEqual(refuse("malformed-signature"));
    }
  });
});

describe("BC-12-3 - a mismatch is malformed-signature, asked in MOD-05's order (R-44, R-31)", () => {
  it("test_a_mismatched_signature_is_refused_on_the_append_path", () => {
    const w = lineageWorld();
    const asked: string[] = [];
    const ledger = new CandidateLedger({
      record: w.record,
      commitments: w.commitments,
      currencies: w.order,
      independence: w.independence,
      admission: { admit: () => (asked.push("admission"), "ADMIT") },
      signatures: { check: (p, s) => (asked.push("signature"), w.gate.check(p, s)) },
      ceiling: { admitsDraw: () => (asked.push("ceiling"), "WITHIN") },
    });
    const k0 = w.commitAt(u, w.c0);
    const p = w.propose(u, w.c1, k0);
    const another = w.propose(u, w.c1, k0);
    const h = w.record.noise();
    expect(ledger.appendCandidate(p, w.gate.sign(w.gate.materialOf(another)), h, "ENGINE")).toEqual(refuse("malformed-signature"));
    nothingAppendedSince(w.record, h);
    expect(asked, "the ceiling was asked after a refused signature").toEqual(["admission", "signature"]);
  });
});

describe("BC-12-4 - a BOTTOM-from candidate's lineage is a typed marker (R-45)", () => {
  it("test_a_bottom_from_signature_covers_the_bottom_marker", () => {
    const w = lineageWorld();
    const kv = w.commitAt(v, w.c0);
    w.independence.declareIndependence(u, true, "HUMAN");
    const bottom = w.propose(u, w.c0, BOTTOM);
    const derived: CandidateProposal = { ...bottom, from: kv }; // the same draw, inheriting (R-40)
    const mb = w.gate.materialOf(bottom);
    expect(mb.lineage, "a BOTTOM-from material's lineage is not the BOTTOM marker").toEqual(noSubject());
    expect(mb.from).toEqual(noSubject());
    const sb = w.gate.sign(mb);
    const sd = w.gate.sign(w.gate.materialOf(derived));
    expect(sb).not.toBe(sd);
    expect(w.gate.check(derived, sb), "a BOTTOM-signed signature verified a derived proposal").toEqual(refuse("malformed-signature"));
    expect(w.gate.check(bottom, sd), "a derived signature verified a BOTTOM proposal").toEqual(refuse("malformed-signature"));
    expect(w.append(bottom).payload.signature).toBe(sb);
    // A fresh BOTTOM, never the caller's object (pinned before battery 19).
    const mine: { kind: "no-subject" } = { kind: "no-subject" };
    const material = w.gate.materialOf({ ...bottom, from: mine });
    (mine as { kind: string }).kind = "latent";
    expect([material.from, material.lineage], "the caller's later change reached the material").toEqual([noSubject(), noSubject()]);
  });
});

describe("BC-12-5 - the signature binds THE commitment it derives from (F2; VEC-05's rule)", () => {
  it("test_a_signature_binds_the_commitment_it_derives_from", () => {
    const w = lineageWorld();
    const k0 = w.commitAt(u, w.c0);
    const p = w.propose(u, w.c1, k0);
    const old = w.gate.sign(w.gate.materialOf(p));
    w.invalidate(k0);
    const again = w.commitAt(u, w.c0); // re-approved: a DIFFERENT commitment for (u, c0)
    const repointed: CandidateProposal = { ...p, from: again };
    expect(w.gate.check(repointed, old), "an old signature validated against a re-approved commitment").toEqual(refuse("malformed-signature"));
    // The lineage digest covers the WHOLE commitment: every field, read off the commitment (RD-12).
    const base = w.gate.materialOf(p).lineage;
    const changed: Readonly<Record<string, unknown>> = {
      at: { ...k0, at: height(Number(k0.at) + 1000) },
      author: { ...k0, author: "ENGINE" },
      kind: { ...k0, payload: { ...k0.payload, kind: "other" } },
      unit: { ...k0, payload: { ...k0.payload, unit: v } },
      currency: { ...k0, payload: { ...k0.payload, currency: w.c1 } },
      candidate: { ...k0, payload: { ...k0.payload, candidate: height(Number(k0.payload.candidate) + 1000) } },
    };
    expect(Object.keys(changed).sort(), "a field of the commitment has no variant").toEqual(
      [...Object.keys(k0).filter((k) => k !== "payload"), ...Object.keys(k0.payload)].sort(),
    );
    for (const [field, k] of Object.entries(changed)) {
      expect(w.gate.materialOf({ ...p, from: k as Commitment }).lineage, `the lineage digest ignores the commitment's ${field}`).not.toEqual(base);
    }
  });
});

describe("BC-12-6 - VEC-05, computed from MOD-12 and re-derived (R-36)", () => {
  type Vector = { id: string; module: string; input: string; output: string; state: string; impl_sha: string };
  it("test_vec_05_re_derives_from_the_signature_gate", () => {
    const v5 = JSON.parse(readFileSync(resolve(repo, "vectors/VEC-05.json"), "utf8")) as Vector;
    expect(v5.state).toBe("COMPUTED");
    expect(v5.module, "the vector is not bound to the gate's object-model row").toBe("MOD-12 · SignatureGate");
    const file = join(mkdtempSync(join(tmpdir(), "vec05-")), "in.json");
    writeFileSync(file, v5.input, "utf8");
    const r = spawnSync(process.execPath, ["--import", "tsx", "tools/vectors/run.ts", "VEC-05", "src/lineage/signature-gate.ts", file], { cwd: repo, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout), "VEC-05 does not re-derive from the current gate").toEqual(JSON.parse(v5.output));
    const sha = createHash("sha256").update(readFileSync(resolve(repo, "src/lineage/signature-gate.ts"))).digest("hex");
    expect(v5.impl_sha, "VEC-05's impl_sha does not pin the current gate").toBe(sha);
    const out = JSON.parse(v5.output) as { digest: string; with: string; without: string };
    expect(out.digest, "the vector does not name the pinned digest").toBe((JSON.parse(v5.input) as { digest: string }).digest);
    // IR-06: the two are asserted UNEQUAL, never compared by a distance.
    expect(out.with, "the signature does not depend on its lineage").not.toBe(out.without);
  });
});

/** Every file in `dir` (recursively), and what each of its imports RESOLVES to (RD-13). */
function resolvedImports(dir: string): string[] {
  const config = ts.readConfigFile(resolve(repo, "tsconfig.json"), ts.sys.readFile);
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, repo).options;
  const files: string[] = [];
  const go = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) go(full);
      else if (name.endsWith(".ts")) files.push(full);
    }
  };
  go(dir);
  return files.flatMap((f) =>
    ts.preProcessFile(readFileSync(f, "utf8"), true, true).importedFiles.map((i) => {
      const r = ts.resolveModuleName(i.fileName, f, options, ts.sys).resolvedModule?.resolvedFileName;
      return r === undefined ? `unresolved:${i.fileName}` : resolve(r);
    }),
  );
}

describe("BC-12-7 - OBJ-32 as a value; HOOK-04 registered at MOD-12", () => {
  it("test_signature_gate_states_obj_32", () => {
    expect(SIGNATURE_GATE).toEqual({
      condition: "the candidate's signature covers the digest of the commitment it derives from",
      closedBy: "DERIVATION",
      proposalsIn: [],
      records: "Candidate",
      onFail: { kind: "refuse", guard: "malformed-signature" },
    });
    expect(Object.isFrozen(SIGNATURE_GATE) && Object.isFrozen(SIGNATURE_GATE.proposalsIn) && Object.isFrozen(SIGNATURE_GATE.onFail), "OBJ-32's descriptor can be edited").toBe(true);
  });

  it("test_the_candidate_append_asks_the_signature_gate_hook_04", () => {
    const w = lineageWorld(); // w.signed's signature check IS the gate
    const k0 = w.commitAt(u, w.c0);
    const p = w.propose(u, w.c1, k0);
    const h = w.record.noise();
    expect(w.signed.appendCandidate(p, "unsigned", h, "ENGINE")).toEqual(refuse("malformed-signature"));
    nothingAppendedSince(w.record, h);
    expect(w.append(p).payload.from).toBe(k0.at);
    // A registration, not an import (S3 section 7): the append site, MOD-05, imports none of the
    // modules whose hooks fire @before-candidate-append - read from the S3's own hook table, and
    // every import RESOLVED, never string-matched.
    const s3 = readFileSync(resolve(repo, "governance/S3/CLAUDE_FrameGate_Phase3.md"), "utf8");
    const dirs = new Map([...s3.matchAll(/^\| (MOD-\d\d) \| [a-z]+ \| `([a-z]+)\/` \|/gm)].map((m) => [m[1] ?? "", m[2] ?? ""]));
    const hooked = [...s3.matchAll(/^\| HOOK-\d\d \| (MOD-\d\d) \| before-candidate-append \|/gm)].map((m) => resolve(repo, "src", dirs.get(m[1] ?? "") ?? "?"));
    expect(hooked, "the hook table names no module at the candidate append").toEqual(expect.arrayContaining([resolve(repo, "src/lineage"), resolve(repo, "src/reachability")]));
    const imports = resolvedImports(resolve(repo, "src/facts"));
    expect(imports, "the resolution sees nothing (positive control)").toContain(resolve(repo, "src/kernel/index.ts"));
    expect(imports.filter((f) => f.startsWith("unresolved:"))).toEqual([]);
    expect(imports.filter((f) => hooked.some((d) => f.startsWith(d + sep))), "MOD-05 imports a module that registers at its append").toEqual([]);
  });
});

describe("BC-12-8 - OBJ-28: the closure over from, through acceptances (R-42)", () => {
  it("test_the_scope_is_the_closure_over_from_through_acceptances", () => {
    const w = lineageWorld();
    const k0 = w.commitAt(u, w.c0);
    const a = w.append(w.propose(u, w.c1, k0));
    const b = w.append(w.propose(u, w.c1, k0));
    const k1 = w.commitments.commit(a, "HUMAN");
    const beforeC = w.record.noise();
    const c = w.append(w.propose(u, w.c2, k1)); // two steps down: through k1's acceptance of a
    const i = w.append(w.propose(v, w.c0, k0)); // inheritance (R-40): v derives from k0
    const outside = w.commitAt(v, w.c0); // v's own lineage, from BOTTOM: not k0's
    const h = w.record.noise();
    const s = w.scopes.of(k0.at).compute(h);
    expect([s.commitment, s.at]).toEqual([k0.at, h]);
    expect(s.candidates.map((x) => x.at), "the closure over from").toEqual([a.at, b.at, c.at, i.at]);
    expect(s.commitments.map((x) => x.at), "the commitments in the closure").toEqual([k1.at]);
    expect(s.count).toBe(s.candidates.length);
    expect(s.candidates.map((x) => x.at)).not.toContain(outside.payload.candidate);
    // As of a height: nothing appended above it.
    expect(w.scopes.of(k0.at).compute(beforeC).candidates.map((x) => x.at)).toEqual([a.at, b.at]);
    // A Projection: joined once, through the kernel, in MOD-12 (R-35, the S3 partition) ...
    const joins = JSON.parse(execFileSync(process.execPath, [resolve(repo, "tools/checks/projection-joins.mjs")], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })) as { joins: string[] };
    expect(joins.joins.filter((j) => j.startsWith("InvalidationScope "))).toEqual(["InvalidationScope src/lineage/invalidation-scope.ts"]);
    // ... recomputed per call, and nothing is kept.
    const scope = w.scopes.of(k0.at);
    expect(scope.compute(h)).toEqual(s);
    w.append(w.propose(u, w.c1, k0));
    expect(scope.compute(w.record.noise()).count).toBe(s.count + 1);
  });
});

describe("BC-12-9 - REF-07 (RC-4): no invalidation before its scope is derived and displayed", () => {
  it("test_append_before_scope_derivation_is_refused", () => {
    // At parse: only `display` mints what `invalidate` takes (R-48).
    expect(fixtures()["tests/fixtures/lineage/invalidate-without-display.ts"]?.codes, "an undisplayed scope was invalidated").toEqual([2345]);
    expect(fixtures()["tests/fixtures/lineage/invalidate-after-display.ts"]?.codes, "the positive control no longer compiles").toEqual([]);
    // At runtime: a display derived at another height than the act's is refused (R-47).
    const w = lineageWorld();
    const k0 = w.commitAt(u, w.c0);
    const shownAt = w.record.noise();
    const shown = w.invalidations.display(k0, shownAt);
    const h = w.record.noise();
    expect(w.invalidations.invalidate(shown, "HUMAN", h)).toEqual(refuse("scope-before-act"));
    nothingAppendedSince(w.record, h);
    expect(w.invalidations.isInvalidated(k0, w.record.noise()), "a refused invalidation took effect").toBe(false);
    // The SAME height, in both directions (MF-34, pinned before battery 19): a display derived
    // ABOVE the act's asserted height is refused too.
    const early = w.record.noise();
    const later = w.record.noise();
    expect(w.invalidations.invalidate(w.invalidations.display(k0, later), "HUMAN", early)).toEqual(refuse("scope-before-act"));
    nothingAppendedSince(w.record, later);
    // Positive (REF-07): derive and display at h, then invalidate at h.
    const now = w.record.noise();
    const inv = w.invalidations.invalidate(w.invalidations.display(k0, now), "HUMAN", now);
    if (isUnknown(inv)) throw new Error(`the invalidation was refused: ${inv.kind}`);
    expect(Number(inv.at)).toBe(Number(now) + 1);
  });
});

describe("BC-12-10 - OBJ-18: one HUMAN append, after the renderer saw its scope", () => {
  it("test_an_invalidation_is_one_human_append_after_its_display", () => {
    expect(fixtures()["tests/fixtures/lineage/invalidate-as-engine.ts"]?.codes, "a non-HUMAN author invalidated").toEqual([2345]);
    const events: string[] = [];
    const inner = inMemoryRecord();
    const record: TestRecord = { ...inner, append: (fact: unknown) => (events.push("append"), inner.append(fact)) };
    // The renderer's answer is never read (OBJ-36): this one answers something, to no effect.
    const renderer: RendererPort<ScopeValue> = {
      present: (s) => {
        events.push(`present ${s.count}`);
        return "an answer" as unknown as void;
      },
    };
    const w = lineageWorld({ record, renderer });
    const k0 = w.commitAt(u, w.c0);
    w.append(w.propose(u, w.c1, k0));
    const h = w.record.noise();
    events.length = 0;
    const inv = w.invalidations.invalidate(w.invalidations.display(k0, h), "HUMAN", h);
    expect(events, "the scope was not shown before the one append").toEqual(["present 1", "append"]);
    expect(inv).toEqual({ author: "HUMAN", at: height(Number(h) + 1), payload: { kind: "invalidation", commitment: k0.at, scopeAt: h } });
  });
});

describe("BC-12-11 - what is invalidated, as of a height (R-42, R-46, S-07)", () => {
  it("test_what_is_invalidated_as_of_a_height", () => {
    const w = lineageWorld();
    const k0 = w.commitAt(u, w.c0);
    const a = w.append(w.propose(u, w.c1, k0));
    const k1 = w.commitments.commit(a, "HUMAN");
    const b = w.append(w.propose(u, w.c1, k0)); // in the scope, not (yet) accepted
    const kv = w.commitAt(v, w.c0); // outside the scope
    const before = w.record.noise();
    const inv = w.invalidate(k0);
    expect(w.invalidations.invalidatedAsOf(before), "invalidated before the act").toEqual([]);
    expect(w.invalidations.invalidatedAsOf(inv.at)).toEqual([k0.at, k1.at]);
    expect([w.invalidations.isInvalidated(k0, inv.at), w.invalidations.isInvalidated(k1, inv.at)]).toEqual([true, true]);
    expect(w.invalidations.isInvalidated(k1, before), "the past was rewritten").toBe(false);
    expect(w.invalidations.isInvalidated(kv, inv.at), "a commitment outside the scope").toBe(false);
    // Born superseded (R-46): b, of the frozen scope, accepted AFTER the invalidation.
    const kb = w.commitments.commit(b, "HUMAN");
    expect(w.invalidations.isInvalidated(kb, kb.at)).toBe(true);
    expect(w.invalidations.invalidatedAsOf(kb.at)).toEqual([k0.at, k1.at, kb.at]);
  });

  it("test_every_invalidation_counts_and_only_an_invalidation_is_read", () => {
    // Pinned before battery 19. A LATER invalidation of an EARLIER commitment: both count, and the
    // set is in height order.
    const w = lineageWorld();
    const kv = w.commitAt(v, w.c0);
    const k0 = w.commitAt(u, w.c0);
    w.invalidate(k0);
    const second = w.invalidate(kv);
    expect(w.invalidations.invalidatedAsOf(second.at), "an invalidation was not counted, or the set is out of order").toEqual([kv.at, k0.at]);
    // Only the ledger's own entries are read: HUMAN, naming a commitment and its scope height.
    const x = lineageWorld();
    const k = x.commitAt(u, x.c0);
    const h = x.record.noise();
    const forged = x.record.append({ author: "ENGINE", payload: { kind: "invalidation", commitment: k.at, scopeAt: h } });
    expect(x.invalidations.isInvalidated(k, forged), "a non-HUMAN invalidation was read").toBe(false);
    const noScope = x.record.append({ author: "HUMAN", payload: { kind: "invalidation", commitment: k.at } });
    expect(x.invalidations.isInvalidated(k, noScope), "an invalidation naming no scope height was read").toBe(false);
    const noCommitment = x.record.append({ author: "HUMAN", payload: { kind: "invalidation", scopeAt: h } });
    expect(x.invalidations.invalidatedAsOf(noCommitment), "an invalidation naming no commitment was read").toEqual([]);
  });

  it("test_the_scope_is_frozen_where_it_was_displayed", () => {
    // R-46, R-47: the scope is the one derived at `scopeAt`. A candidate drawn from K after the
    // display - possible only when the caller's `at` is stale, R-47's registered single-writer
    // residue - is not in it, and neither is the commitment that accepts it.
    const w = lineageWorld();
    const k0 = w.commitAt(u, w.c0);
    const at = w.record.noise();
    const shown = w.invalidations.display(k0, at);
    const late = w.append(w.propose(u, w.c1, k0));
    const inv = w.invalidations.invalidate(shown, "HUMAN", at); // the port cannot see the head
    if (isUnknown(inv)) throw new Error(`setup: the invalidation answered ${inv.kind}`);
    expect(inv.payload.scopeAt).toBe(at);
    const kLate = w.commitments.commit(late, "HUMAN");
    expect(w.invalidations.isInvalidated(kLate, kLate.at), "the frozen scope grew past its display").toBe(false);
    expect(w.invalidations.invalidatedAsOf(kLate.at)).toEqual([k0.at]);
  });
});

describe("BC-12-12 - MOD-05 reads the invalidations (R-19)", () => {
  it("test_the_fold_reads_the_invalidations", () => {
    const w = lineageWorld();
    const k0 = w.commitAt(u, w.c0);
    const k1 = w.commitments.commit(w.append(w.propose(u, w.c1, k0)), "HUMAN");
    const gate = new ReachabilityGate({ reachability: new Reachability({ currencies: w.order, commitments: w.commitments }) });
    expect(gate.admit(u, w.c2, w.record.noise())).toBe("ADMIT");
    w.invalidate(k0);
    const h = w.record.noise();
    expect(w.commitments.effectiveCommitment(u, w.c0, h)).toEqual(noSubject());
    expect(w.commitments.effectiveCommitment(u, w.c1, h), "a downstream commitment stayed in force").toEqual(noSubject());
    expect(gate.admit(u, w.c2, h)).toEqual(refuse("unreachable"));
    expect(w.signed.appendCandidate(w.propose(u, w.c1, k0), "sig", w.record.noise(), "ENGINE"), "a candidate derived from an invalidated commitment").toEqual(refuse("malformed-from"));
    expect(w.commitments.effectiveCommitment(u, w.c1, k1.at), "the past was rewritten").toEqual(k1);
    // A re-commitment at K's currency is the one in force.
    const again = w.commitAt(u, w.c0);
    expect(w.commitments.effectiveCommitment(u, w.c0, w.record.noise())).toEqual(again);
  });
});
