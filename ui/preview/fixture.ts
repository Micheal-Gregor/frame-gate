/**
 * PREVIEW ONLY (Phase 5, Simulate 2) - disposable, never shipped, never imported by product UI.
 *
 * The SEALED library composed over an invented fixture: Rosa's Story 1, Scene 3, a night further on.
 * Every value the target shows is the engine's own answer to a real call. Two things are the app's,
 * not the engine's, and are invented here: the prompt text behind each condition identity (checked
 * against the identity the engine holds), and the image behind each take (a stand-in drawing).
 */
import { height, isUnknown, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { RecordPort } from "../../src/ports/index.js";
import { CurrencyOrder, DeclarationLedger, IndependenceLedger, UnitRegistry, type Currency, type Unit } from "../../src/catalog/index.js";
import { BOTTOM, CandidateLedger, CommitmentLedger, DrawContextLog, LineageReader, type Candidate, type CandidateProposal, type Commitment } from "../../src/facts/index.js";
import { Reachability, ReachabilityGate, type ReachabilityEvaluation } from "../../src/reachability/index.js";
import { InvalidationLedger, InvalidationScope, SignatureGate } from "../../src/lineage/index.js";
import { ConditionIdentities, RevisionLog, Samples, type ConditionIdentity, type DrawInputs, type SampleValue } from "../../src/condition/index.js";
import { ObservationLedger, dischargeable, score, type ComponentEntry, type ComponentValue, type Observation } from "../../src/observation/index.js";
import { Dispersion, Location } from "../../src/statistics/index.js";
import { AE5_OPEN, Bar, PopulationPartition } from "../../src/calibration/index.js";
import { Diagnostic, type DiagnosticValue } from "../../src/diagnostic/index.js";
import { AuthorizationForms, Ratio, ScopeGate, ScopeLedger, ScopeReader, type RatioValue, type ScopeRecord } from "../../src/spend/index.js";
import { SHA256_HEX } from "../app/sha256.js";
import { still as drawing, type Look } from "./stills.js";

/** One currency's budget for a cell: the scope in force, how many draws it has charged, what remains, and its answer to the next draw. */
export interface BudgetRead {
  readonly scope: ScopeRecord | UnknownValue;
  readonly used: number | undefined;
  readonly remaining: number | UnknownValue;
  readonly next: "WITHIN" | UnknownValue | undefined;
}
export interface TakeRead {
  readonly n: number;
  readonly candidate: Candidate;
  readonly image: string;
  readonly brought: string | undefined;
  readonly observation: Observation | UnknownValue;
  readonly approved: boolean;
}
export interface CellRead {
  readonly id: string;
  readonly label: string;
  readonly kind: "package" | "shot";
  readonly level: string | UnknownValue;
  /** The prompt in force: the engine's identity, and the app's text for it, verified by identityOf. */
  readonly prompt: { readonly identity: ConditionIdentity; readonly text: string; readonly verified: boolean; readonly version: number } | UnknownValue;
  readonly takes: readonly TakeRead[];
  readonly sample: SampleValue | undefined;
  readonly approvedTake: number | undefined;
  readonly reference: { readonly label: string; readonly image: string } | undefined;
  readonly stills: BudgetRead;
  readonly clips: BudgetRead;
  readonly clip: ReachabilityEvaluation;
  readonly ratio: RatioValue | UnknownValue;
  readonly diagnostics: Readonly<Record<string, DiagnosticValue | UnknownValue>>;
}
export interface Scene2 {
  readonly title: string;
  readonly cells: readonly CellRead[];
  readonly components: readonly string[];
  readonly scale: string;
}

export function scene(): Scene2 {
  const facts: unknown[] = [];
  const record: RecordPort<unknown, RecordHeight> = {
    append: (fact: unknown): RecordHeight => {
      facts.push(fact);
      return height(facts.length);
    },
    readAsOf: (at: RecordHeight): readonly unknown[] => facts.slice(0, at),
  };
  const now = (): RecordHeight => height(facts.length);
  const components = ["identity", "composition"];

  // ---- the composition, as the app wires it (R-41, R-78, R-84), over an in-memory record
  const order = new CurrencyOrder({ currencies: ["still", "i2v"] });
  const [still, clip] = order.currencies() as readonly [Currency, Currency];
  const registry = new UnitRegistry({
    units: { "mara-pkg": { package: "Mara" }, "3.1": { shot: "wide" }, "3.2": { shot: "close-up", speaking: true }, "3.3": { shot: "reaction" } },
  });
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
  const signatures = new SignatureGate({ digests: SHA256_HEX });
  const candidates = new CandidateLedger({ record, commitments, currencies: order, independence, admission: reach, signatures, ceiling: scopeGate });
  const identities = new ConditionIdentities({ digests: SHA256_HEX });
  const revisions = new RevisionLog({ record });
  const samples = new Samples({ candidates, draws, revisions, lineage });
  const observations = new ObservationLedger({ record, components });
  const partition = new PopulationPartition({ lineage, samples, draws, declarations, invalidations, observations });
  const bar = new Bar({ populations: partition, separation: AE5_OPEN });
  const diagnostic = new Diagnostic({ samples, dispersion: new Dispersion({ samples, observations }), location: new Location({ samples, observations }), observations, bar, declarations });
  const ratio = new Ratio({ candidates });
  const forms = new AuthorizationForms({ ratio });
  const scopes = new ScopeLedger({ record, bar, declarations });

  // ---- the app's two stores: prompt text by identity, images by take (invented content)
  const prompts = new Map<string, DrawInputs>();
  const media = new Map<RecordHeight, { image: string; brought: string | undefined }>();

  const write = (u: Unit, inputs: DrawInputs): void => {
    const identity = identities.identityOf(inputs);
    prompts.set(identity, inputs);
    revisions.revise(u, still, identity, "HUMAN");
  };
  const authorize = (u: Unit, currency: Currency, ceiling: number, estimate: string) => {
    const h = now();
    const form = forms.build(u, currency, h);
    if (isUnknown(form)) throw new Error("fixture: no form");
    const s = scopes.authorize(form, ceiling, { kind: "none" }, estimate, "HUMAN", h);
    if (isUnknown(s)) throw new Error(`fixture: scope refused (${JSON.stringify(s)})`);
    return s;
  };
  let seeds = 0;
  /** Bring in one image as a take: a draw under the scope and the prompt in force, then the take (C5). */
  const bringIn = (u: Unit, scope: RecordHeight, from: CandidateProposal["from"], look: Look, file: string | undefined, author: "HUMAN" | "ENGINE"): Candidate => {
    const condition = revisions.conditionInForce(u, still, now());
    if (isUnknown(condition)) throw new Error("fixture: no prompt in force");
    const context = draws.recordDraw(u, file === undefined ? { source: "runner" } : { source: "brought in", file }, scope, condition, now(), author);
    if (isUnknown(context)) throw new Error(`fixture: draw refused (${JSON.stringify(context)})`);
    seeds += 1;
    const proposal: CandidateProposal = { context, unit: u, currency: still, condition, seed: `seed-${seeds}`, from };
    const k = candidates.appendCandidate(proposal, signatures.sign(signatures.materialOf(proposal)), now(), author);
    if (isUnknown(k)) throw new Error(`fixture: candidate refused (${JSON.stringify(k)})`);
    media.set(k.at, { image: drawing(look, seeds), brought: file });
    return k;
  };
  const observe = (k: Candidate, values: Readonly<Record<string, number | "later">>): void => {
    const entries: Record<string, ComponentEntry> = {};
    for (const [name, x] of Object.entries(values)) {
      const value: ComponentValue | UnknownValue = x === "later" ? dischargeable("a later look") : score(x);
      if (isUnknown(value)) throw new Error("fixture: score");
      entries[name] = { value, author: "HUMAN" };
    }
    const o = observations.observe(k, entries, "HUMAN", now());
    if (isUnknown(o)) throw new Error(`fixture: observe (${JSON.stringify(o)})`);
  };

  // ---- Mara's package: two looks brought in, the second approved as her reference
  const mara = unit("mara-pkg");
  declarations.declare(mara, "easy", "HUMAN");
  independence.declareIndependence(mara, true, "HUMAN");
  write(mara, { prompt: "Mara, early 30s, dark curly hair, green cardigan; even light; front and three-quarter", characters: [] });
  const pkg = authorize(mara, still, 3, "~$0.21 - 3 Imagine stills");
  bringIn(mara, pkg.at, BOTTOM, "mara", "mara-look-1.png", "HUMAN");
  const maraStill: Commitment = commitments.commit(bringIn(mara, pkg.at, BOTTOM, "mara", "mara-look-2.png", "HUMAN"), "HUMAN");

  // ---- 3.1, the wide: written and declared, nothing authorized yet
  const wide = unit("3.1");
  declarations.declare(wide, "easy", "HUMAN");
  write(wide, { prompt: "Wide: the kitchen at night, Mara at the sink, back to camera", characters: ["@mara"] });

  // ---- 3.2, the close-up: six stills, five scored, take 3 approved; two clips authorized
  const close = unit("3.2");
  declarations.declare(close, "hard", "HUMAN");
  write(close, { prompt: "Close-up: Mara mid-sentence, kitchen light from the left", characters: ["@mara"] });
  const closeScope = authorize(close, still, 6, "~$0.42 - 6 Imagine stills (vendor quote)");
  const looks: readonly Look[] = ["mara", "mara-off", "mara", "mara", "mara", "mara"];
  const closeTakes = looks.map((look) => bringIn(close, closeScope.at, maraStill, look, undefined, "ENGINE"));
  const scores: readonly Readonly<Record<string, number | "later">>[] = [
    { identity: 0.71, composition: 0.6 },
    { identity: 0.64, composition: "later" },
    { identity: 0.82, composition: 0.74 },
    { identity: 0.77, composition: 0.58 },
    { identity: 0.69, composition: 0.66 },
  ];
  scores.forEach((values, i) => observe(closeTakes[i] as Candidate, values));
  commitments.commit(closeTakes[2] as Candidate, "HUMAN");
  authorize(close, clip, 2, "~$0.60 - 2 Imagine clips (vendor quote)");

  // ---- 3.3, the reaction: four stills authorized, three brought in from Rosa's Grok session, two scored
  const reaction = unit("3.3");
  declarations.declare(reaction, "hard", "HUMAN");
  write(reaction, { prompt: "Reaction: Mara listening, jaw set, kitchen window behind her", characters: ["@mara"] });
  const reactionScope = authorize(reaction, still, 4, "~$0.28 - 4 Imagine stills");
  const brought = ["IMG_0412.png", "IMG_0413.png", "IMG_0415.png"].map((file) => bringIn(reaction, reactionScope.at, maraStill, "reaction", file, "HUMAN"));
  observe(brought[0] as Candidate, { identity: 0.74, composition: 0.69 });
  observe(brought[1] as Candidate, { identity: 0.58, composition: "later" });

  // ---- the reads, all at one height
  const h = now();
  const budget = (u: Unit, currency: Currency): BudgetRead => {
    const scope = scopeReader.governing(u, currency, h);
    return {
      scope,
      used: isUnknown(scope) ? undefined : lineage.drawsUnder(scope.at, h).length,
      remaining: scopeGate.remaining(u, currency, h),
      next: isUnknown(scope) ? undefined : scopeGate.admitsDraw(u, scope.at, h),
    };
  };
  const read = (id: string, label: string, kind: CellRead["kind"]): CellRead => {
    const u = unit(id);
    const identity = revisions.conditionInForce(u, still, h);
    const prompt = isUnknown(identity)
      ? identity
      : (() => {
          const inputs = prompts.get(identity) as DrawInputs;
          return { identity, text: String(inputs["prompt"]), verified: identities.identityOf(inputs) === identity, version: revisions.revisions(u, still, h).length };
        })();
    const sample = isUnknown(identity) ? undefined : (() => {
      const s = samples.of(u, still, identity).compute(h);
      return isUnknown(s) ? undefined : s;
    })();
    const members: readonly Candidate[] = sample?.members ?? [];
    const approved = commitments.effectiveCommitment(u, still, h);
    const approvedAt = isUnknown(approved) ? undefined : approved.payload.candidate;
    // The reference: the commitment these takes were drawn from (`from`), and the image of the take it accepted.
    const reference = (() => {
      const from = members[0]?.payload.from;
      if (from === undefined || isUnknown(from)) return undefined;
      const k = lineage.commitmentsAsOf(h).find((c) => c.at === from);
      const look = k === undefined ? undefined : media.get(k.candidate);
      return look === undefined ? undefined : { label: "Mara - approved look (identity package, take 2)", image: look.image };
    })();
    return {
      id,
      label,
      kind,
      level: (() => {
        const d = declarations.declarationAt(u, h);
        return isUnknown(d) ? d : d.payload.level;
      })(),
      prompt,
      takes: members.map((k, i) => ({
        n: i + 1,
        candidate: k,
        image: media.get(k.at)?.image ?? "",
        brought: media.get(k.at)?.brought,
        observation: observations.observationOf(k, h),
        approved: k.at === approvedAt,
      })),
      sample,
      approvedTake: approvedAt === undefined ? undefined : members.findIndex((k) => k.at === approvedAt) + 1,
      reference,
      stills: budget(u, still),
      clips: budget(u, clip),
      clip: reach.evaluate(u, clip, h),
      ratio: ratio.of(u).compute(h),
      diagnostics: Object.fromEntries(components.map((c) => [c, diagnostic.of(u, still, c).compute(h)])),
    };
  };
  return {
    title: "Story 1 · Scene 3 - the kitchen argument",
    cells: [read("mara-pkg", "Mara - identity package", "package"), read("3.1", "3.1 - wide", "shot"), read("3.2", "3.2 - Mara, close-up", "shot"), read("3.3", "3.3 - Mara, reaction", "shot")],
    components,
    scale: "0 to 1",
  };
}
