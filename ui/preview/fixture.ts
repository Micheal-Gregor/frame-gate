/**
 * PREVIEW ONLY (Phase 5, Simulate 1) - disposable, never shipped, never imported by product UI.
 *
 * The SEALED library composed over an invented fixture: Rosa's Story 1, Scene 3. Every value the
 * target page shows is the engine's own answer to a real call; nothing here decides anything. The
 * only stand-in is the digest port's binding (a non-cryptographic hash): the system chooses no
 * digest, and the preview has to bind one.
 */
import { height, isUnknown, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { RecordPort } from "../../src/ports/index.js";
import { CurrencyOrder, DeclarationLedger, IndependenceLedger, UnitRegistry, type Currency, type Unit } from "../../src/catalog/index.js";
import { BOTTOM, CandidateLedger, CommitmentLedger, DrawContextLog, LineageReader, type Candidate, type Commitment, type CandidateProposal } from "../../src/facts/index.js";
import { Reachability, ReachabilityGate, type ReachabilityEvaluation } from "../../src/reachability/index.js";
import { InvalidationLedger, InvalidationScope, SignatureGate } from "../../src/lineage/index.js";
import { RevisionLog, Samples, type SampleValue } from "../../src/condition/index.js";
import { ObservationLedger, dischargeable, score, type ComponentEntry, type ComponentValue, type Observation } from "../../src/observation/index.js";
import { Dispersion, Location } from "../../src/statistics/index.js";
import { AE5_OPEN, Bar, PopulationPartition } from "../../src/calibration/index.js";
import { Diagnostic, type DiagnosticValue } from "../../src/diagnostic/index.js";
import { AuthorizationForms, Ratio, ScopeGate, ScopeLedger, ScopeReader, type RatioValue, type ScopeRecord } from "../../src/spend/index.js";

/** The preview's binding of OBJ-39: FNV-1a, 64-bit, hex. A stand-in; the real app binds its own. */
const fnv = { digest: (bytes: Uint8Array): string => {
  let h = 0xcbf29ce484222325n;
  for (const b of bytes) h = BigInt.asUintN(64, (h ^ BigInt(b)) * 0x100000001b3n);
  return h.toString(16).padStart(16, "0");
} };

export interface TakeView {
  readonly n: number;
  readonly candidate: Candidate;
  readonly observation: Observation | UnknownValue;
}
export interface Scene {
  readonly unit: Unit;
  readonly level: string | UnknownValue;
  readonly condition: string;
  readonly takes: readonly TakeView[];
  readonly sample: SampleValue | undefined;
  readonly diagnostics: Readonly<Record<string, DiagnosticValue | UnknownValue>>;
  readonly governing: ScopeRecord | UnknownValue;
  readonly remaining: number | UnknownValue;
  readonly nextDraw: UnknownValue | "ADMITTED";
  readonly ratio: RatioValue | UnknownValue;
  readonly video: ReachabilityEvaluation;
  readonly components: readonly string[];
}

export function scene(): Scene {
  const facts: unknown[] = [];
  const record: RecordPort<unknown, RecordHeight> = {
    append: (fact: unknown): RecordHeight => {
      facts.push(fact);
      return height(facts.length);
    },
    readAsOf: (at: RecordHeight): readonly unknown[] => facts.slice(0, at),
  };
  const now = (): RecordHeight => height(facts.length);
  const tick = (): RecordHeight => record.append({ kind: "preview-height" });
  const components = ["identity", "composition"];

  // ---- the composition, cycle-free (R-41, R-78, R-84)
  const order = new CurrencyOrder({ currencies: ["still", "i2v"] });
  const [still, video] = order.currencies() as readonly [Currency, Currency];
  const registry = new UnitRegistry({ units: { "mara-pkg": { package: "Mara" }, "3.2": { shot: "close-up", speaking: true } } });
  const unit = (id: string): Unit => {
    const x = registry.unit(id);
    if (isUnknown(x)) throw new Error(`fixture: no unit ${id}`);
    return x;
  };
  const lineage = new LineageReader({ record });
  const invalidations = new InvalidationLedger({ record, scopes: new InvalidationScope({ lineage }), renderer: { present: () => undefined } });
  const commitments = new CommitmentLedger({ record, invalidations });
  const reach = new ReachabilityGate({ reachability: new Reachability({ currencies: order, commitments }) });
  const scopeReader = new ScopeReader({ record });
  const scopeGate = new ScopeGate({ scopes: scopeReader, charges: lineage });
  const declarations = new DeclarationLedger({ record, levels: ["easy", "hard"] });
  const draws = new DrawContextLog({ record, declarations, scopes: scopeGate, admission: reach });
  const independence = new IndependenceLedger({ record });
  const signatures = new SignatureGate({ digests: fnv });
  const candidates = new CandidateLedger({ record, commitments, currencies: order, independence, admission: reach, signatures, ceiling: scopeGate });
  const revisions = new RevisionLog({ record });
  const samples = new Samples({ candidates, draws, revisions, lineage });
  const observations = new ObservationLedger({ record, components });
  const partition = new PopulationPartition({ lineage, samples, draws, declarations, invalidations, observations });
  const bar = new Bar({ populations: partition, separation: AE5_OPEN });
  const diagnostic = new Diagnostic({ samples, dispersion: new Dispersion({ samples, observations }), location: new Location({ samples, observations }), observations, bar, declarations });
  const ratio = new Ratio({ candidates });
  const forms = new AuthorizationForms({ ratio });
  const scopes = new ScopeLedger({ record, bar, declarations });

  const authorize = (u: Unit, currency: Currency, ceiling: number, estimate: string) => {
    const h = now();
    const form = forms.build(u, currency, h);
    if (isUnknown(form)) throw new Error("fixture: no form");
    const s = scopes.authorize(form, ceiling, { kind: "none" }, estimate, "HUMAN", h);
    if (isUnknown(s)) throw new Error(`fixture: scope refused (${JSON.stringify(s)})`);
    return s;
  };
  let seeds = 0;
  const draw = (u: Unit, currency: Currency, under: RecordHeight, condition: string, from: CandidateProposal["from"]): Candidate => {
    const context = draws.recordDraw(u, { preview: true }, under, condition, tick(), "ENGINE");
    if (isUnknown(context)) throw new Error(`fixture: draw refused (${JSON.stringify(context)})`);
    seeds += 1;
    const proposal: CandidateProposal = { context, unit: u, currency, condition, seed: `seed-${seeds}`, from };
    const k = candidates.appendCandidate(proposal, signatures.sign(signatures.materialOf(proposal)), tick(), "ENGINE");
    if (isUnknown(k)) throw new Error(`fixture: candidate refused (${JSON.stringify(k)})`);
    return k;
  };
  const observe = (k: Candidate, values: Readonly<Record<string, number | "later">>): void => {
    const entries: Record<string, ComponentEntry> = {};
    for (const [name, x] of Object.entries(values)) {
      const value: ComponentValue | UnknownValue = x === "later" ? dischargeable("a later look") : score(x);
      if (isUnknown(value)) throw new Error("fixture: score");
      entries[name] = { value, author: "HUMAN" };
    }
    const o = observations.observe(k, entries, "HUMAN", tick());
    if (isUnknown(o)) throw new Error(`fixture: observe (${JSON.stringify(o)})`);
  };

  // ---- Mara's package: her identity still, approved
  const mara = unit("mara-pkg");
  declarations.declare(mara, "easy", "HUMAN");
  independence.declareIndependence(mara, true, "HUMAN");
  const pkgScope = authorize(mara, still, 3, "~$0.21 - 3 Imagine stills");
  draw(mara, still, pkgScope.at, "mara-identity-v1", BOTTOM);
  const maraStill: Commitment = commitments.commit(draw(mara, still, pkgScope.at, "mara-identity-v1", BOTTOM), "HUMAN");

  // ---- Cell 3.2: Mara speaking, close-up - six stills from her package still, five reviewed
  const cell = unit("3.2");
  declarations.declare(cell, "hard", "HUMAN");
  const cellScope = authorize(cell, still, 6, "~$0.42 - 6 Imagine stills (vendor quote)");
  const condition = "3.2 spec v1 - Mara, close-up, kitchen, @mara";
  const takes = [0, 1, 2, 3, 4, 5].map(() => draw(cell, still, cellScope.at, condition, maraStill));
  const looks: readonly Readonly<Record<string, number | "later">>[] = [
    { identity: 0.71, composition: 0.6 },
    { identity: 0.64, composition: "later" },
    { identity: 0.82, composition: 0.74 },
    { identity: 0.77, composition: 0.58 },
    { identity: 0.69, composition: 0.66 },
  ];
  looks.forEach((values, i) => observe(takes[i] as Candidate, values));
  // A seventh draw, asked of the real gate: what the budget panel shows as the next draw's answer.
  const seventh = draws.recordDraw(cell, { preview: true }, cellScope.at, condition, now(), "ENGINE");

  const h = now();
  const sample = (() => {
    const all = samples.samplesFor(cell, still, h);
    return isUnknown(all) ? undefined : all.find((s) => s.condition === condition);
  })();
  return {
    unit: cell,
    level: (() => {
      const d = declarations.declarationAt(cell, h);
      return isUnknown(d) ? d : d.payload.level;
    })(),
    condition,
    takes: takes.map((candidate, i) => ({ n: i + 1, candidate, observation: observations.observationOf(candidate, h) })),
    sample,
    diagnostics: Object.fromEntries(components.map((c) => [c, diagnostic.of(cell, still, c).compute(h)])),
    governing: scopeReader.governing(cell, still, h),
    remaining: scopeGate.remaining(cell, still, h),
    nextDraw: isUnknown(seventh) ? seventh : "ADMITTED",
    ratio: ratio.of(cell).compute(h),
    video: reach.evaluate(cell, video, h),
    components,
  };
}
