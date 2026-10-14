/**
 * PREVIEW ONLY (Phase 5, Simulate 3) - disposable, never shipped, never imported by product UI.
 *
 * The SEALED library composed over an invented fixture: Rosa's Scene 3, two nights on. Every value
 * the target shows is the engine's answer to a real call, except three invented things the target
 * labels as such: the images and the clip (stand-in drawings), and the record's status line (which
 * devices hold it, "as of" - no route exists until the shared record is built).
 */
import { height, isUnknown, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { RecordPort } from "../../src/ports/index.js";
import { CurrencyOrder, DeclarationLedger, IndependenceLedger, UnitRegistry, type Currency, type Unit } from "../../src/catalog/index.js";
import { BOTTOM, CandidateLedger, CommitmentLedger, DrawContextLog, LineageReader, type Candidate, type CandidateProposal, type DrawContext } from "../../src/facts/index.js";
import { Reachability, ReachabilityGate, type ReachabilityEvaluation } from "../../src/reachability/index.js";
import { InvalidationLedger, InvalidationScope, SignatureGate } from "../../src/lineage/index.js";
import { ConditionIdentities, RevisionLog, Samples, type DrawInputs } from "../../src/condition/index.js";
import { ObservationLedger, dischargeable, score, type ComponentEntry, type ComponentValue, type Observation } from "../../src/observation/index.js";
import { Dispersion, Location } from "../../src/statistics/index.js";
import { AE5_OPEN, Bar, PopulationPartition } from "../../src/calibration/index.js";
import { Diagnostic } from "../../src/diagnostic/index.js";
import { AuthorizationForms, Ratio, ScopeGate, ScopeLedger, ScopeReader, type RatioValue, type ScopeRecord } from "../../src/spend/index.js";
import { SHA256_HEX } from "../app/sha256.js";
import { clip as clipArt, still as stillArt, type Look } from "./art.js";

/** One authorization as the money history shows it: the scope, how many draws were charged to it, and whether it is in force. */
export interface Authorization { readonly scope: ScopeRecord; readonly drawn: number; readonly inForce: boolean }
/** One currency's money for a cell (B). */
export interface MoneyRead {
  readonly governing: ScopeRecord | UnknownValue;
  readonly remaining: number | UnknownValue;
  readonly next: "WITHIN" | UnknownValue | undefined;
  readonly history: readonly Authorization[];
  /** Draws charged but not yet bound to a take: reserved before the image or clip was made. */
  readonly held: readonly DrawContext[];
}
export interface TakeRead {
  readonly n: number;
  readonly candidate: Candidate;
  readonly image: string;
  readonly file: string | undefined;
  /** The author kind (OBJ-38): ENGINE and DIRECTOR propose; HUMAN decides. */
  readonly by: "HUMAN" | "ENGINE" | "DIRECTOR";
  readonly observation: Observation | UnknownValue;
  readonly approved: boolean;
}
export interface CellRead {
  readonly id: string;
  readonly label: string;
  readonly kind: "package" | "shot";
  readonly level: string | UnknownValue;
  readonly prompt: { readonly text: string; readonly version: number } | UnknownValue;
  readonly clipPrompt: { readonly text: string; readonly version: number } | UnknownValue;
  readonly takes: readonly TakeRead[];
  readonly clips: readonly TakeRead[];
  readonly approvedTake: number | undefined;
  readonly approvedClip: number | undefined;
  readonly stills: MoneyRead;
  readonly clipMoney: MoneyRead;
  readonly clipReach: ReachabilityEvaluation;
  readonly ratio: RatioValue | UnknownValue;
  readonly reference: string | undefined;
}
export interface Scene3 {
  readonly title: string;
  readonly cells: readonly CellRead[];
  /** INVENTED - no route until the shared record (A) is built. */
  readonly record: { readonly owner: string; readonly devices: readonly string[]; readonly asOf: string; readonly facts: number };
}

export function scene(): Scene3 {
  const facts: unknown[] = [];
  const record: RecordPort<unknown, RecordHeight> = {
    append: (fact: unknown): RecordHeight => {
      facts.push(fact);
      return height(facts.length);
    },
    readAsOf: (at: RecordHeight): readonly unknown[] => facts.slice(0, at),
  };
  const now = (): RecordHeight => height(facts.length);

  // ---- the composition, as the app wires it, over an in-memory record
  const order = new CurrencyOrder({ currencies: ["still", "i2v"] });
  const [still, clip] = order.currencies() as readonly [Currency, Currency];
  const registry = new UnitRegistry({ units: { "mara-pkg": { package: "Mara" }, "3.1": { shot: "wide" }, "3.2": { shot: "close-up", speaking: true }, "3.3": { shot: "reaction" } } });
  const unit = (id: string): Unit => registry.unit(id) as Unit;
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
  const observations = new ObservationLedger({ record, components: ["identity", "composition"] });
  const partition = new PopulationPartition({ lineage, samples, draws, declarations, invalidations, observations });
  const bar = new Bar({ populations: partition, separation: AE5_OPEN });
  void new Diagnostic({ samples, dispersion: new Dispersion({ samples, observations }), location: new Location({ samples, observations }), observations, bar, declarations });
  const ratio = new Ratio({ candidates });
  const forms = new AuthorizationForms({ ratio });
  const scopes = new ScopeLedger({ record, bar, declarations });

  // ---- the app's stores (invented content): prompt inputs by identity; media by take
  const prompts = new Map<string, DrawInputs>();
  const media = new Map<RecordHeight, string>();
  const write = (u: Unit, currency: Currency, inputs: DrawInputs): void => {
    const identity = identities.identityOf(inputs);
    prompts.set(identity, inputs);
    revisions.revise(u, currency, identity, "HUMAN");
  };
  const authorize = (u: Unit, currency: Currency, ceiling: number, estimate: string): void => {
    const h = now();
    const form = forms.build(u, currency, h);
    if (isUnknown(form)) throw new Error("fixture: no form");
    const s = scopes.authorize(form, ceiling, { kind: "none" }, estimate, "HUMAN", h);
    if (isUnknown(s)) throw new Error(`fixture: scope refused (${JSON.stringify(s)})`);
  };
  /** B: reserve - record the draw now, under the scope and prompt in force, before the file exists. */
  const reserve = (u: Unit, currency: Currency, author: "HUMAN" | "ENGINE"): DrawContext => {
    const governing = scopeReader.governing(u, currency, now());
    const condition = revisions.conditionInForce(u, currency, now());
    if (isUnknown(governing) || isUnknown(condition)) throw new Error("fixture: nothing to reserve under");
    const d = draws.recordDraw(u, { source: author === "HUMAN" ? "reserved" : "runner" }, governing.at, condition, now(), author);
    if (isUnknown(d)) throw new Error(`fixture: reserve refused (${JSON.stringify(d)})`);
    return d;
  };
  let seeds = 0;
  /** Bind a file to a held draw: the take, drawn from `from`. */
  const fill = (d: DrawContext, currency: Currency, from: CandidateProposal["from"], picture: string, file: string, author: "HUMAN" | "ENGINE"): Candidate => {
    seeds += 1;
    const proposal: CandidateProposal = { context: d, unit: d.payload.unit, currency, condition: d.payload.condition, seed: `seed-${seeds}`, from };
    const k = candidates.appendCandidate(proposal, signatures.sign(signatures.materialOf(proposal)), now(), author);
    if (isUnknown(k)) throw new Error(`fixture: take refused (${JSON.stringify(k)})`);
    media.set(k.at, picture);
    files.set(k.at, file);
    return k;
  };
  const files = new Map<RecordHeight, string>();
  const take = (u: Unit, from: CandidateProposal["from"], look: Look, file: string, author: "HUMAN" | "ENGINE"): Candidate =>
    fill(reserve(u, still, author), still, from, stillArt(look, seeds + 1), file, author);
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

  // ---- Mara's package
  const mara = unit("mara-pkg");
  declarations.declare(mara, "easy", "HUMAN");
  independence.declareIndependence(mara, true, "HUMAN");
  write(mara, still, { prompt: "Mara, early 30s, dark curly hair, green cardigan; even light; front and three-quarter", characters: [] });
  authorize(mara, still, 3, "~$0.21 - 3 Imagine stills");
  take(mara, BOTTOM, "mara", "mara-look-1.png", "HUMAN");
  const maraLook = commitments.commit(take(mara, BOTTOM, "mara", "mara-look-2.png", "HUMAN"), "HUMAN");

  // ---- 3.1: three stills authorized; two reserved before Rosa made them in Grok (B)
  const wide = unit("3.1");
  declarations.declare(wide, "easy", "HUMAN");
  write(wide, still, { prompt: "Wide: the kitchen at night, Mara at the sink, back to camera", characters: ["@mara"] });
  authorize(wide, still, 3, "~$0.21 - 3 Imagine stills");
  reserve(wide, still, "HUMAN");
  reserve(wide, still, "HUMAN");

  // ---- 3.2: six overnight stills, take 3 approved; a clip prompt; two clips authorized - one brought in, one reserved (C)
  const close = unit("3.2");
  declarations.declare(close, "hard", "HUMAN");
  write(close, still, { prompt: "Close-up: Mara mid-sentence, kitchen light from the left", characters: ["@mara"] });
  authorize(close, still, 6, "~$0.42 - 6 Imagine stills (vendor quote)");
  const looks: readonly Look[] = ["mara", "mara-off", "mara", "mara", "mara", "mara"];
  const closeTakes = looks.map((look, i) => take(close, maraLook, look, `runner-3.2-${i + 1}.png`, "ENGINE"));
  [{ identity: 0.71, composition: 0.6 }, { identity: 0.64, composition: "later" }, { identity: 0.82, composition: 0.74 }, { identity: 0.77, composition: 0.58 }, { identity: 0.69, composition: 0.66 }]
    .forEach((v, i) => observe(closeTakes[i] as Candidate, v as Record<string, number | "later">));
  const approvedStill = commitments.commit(closeTakes[2] as Candidate, "HUMAN");
  write(close, clip, { prompt: "Mara turns toward the window, slow push-in, 4 seconds", characters: ["@mara"] });
  authorize(close, clip, 2, "~$0.60 - 2 Imagine clips (vendor quote)");
  const clip1 = reserve(close, clip, "HUMAN");
  reserve(close, clip, "HUMAN");
  const firstClip = fill(clip1, clip, approvedStill, clipArt(3), "3.2-clip-1.mp4", "HUMAN");
  observe(firstClip, { identity: 0.78, composition: 0.7 });

  // ---- 3.3: four stills, three brought in; then re-authorized three, one brought in (B's history)
  const reaction = unit("3.3");
  declarations.declare(reaction, "hard", "HUMAN");
  write(reaction, still, { prompt: "Reaction: Mara listening, jaw set, kitchen window behind her", characters: ["@mara"] });
  authorize(reaction, still, 4, "~$0.28 - 4 Imagine stills");
  const brought = ["IMG_0412.png", "IMG_0413.png", "IMG_0415.png"].map((f) => take(reaction, maraLook, "reaction", f, "HUMAN"));
  observe(brought[0] as Candidate, { identity: 0.74, composition: 0.69 });
  observe(brought[1] as Candidate, { identity: 0.58, composition: "later" });
  authorize(reaction, still, 3, "~$0.21 - 3 Imagine stills");
  take(reaction, maraLook, "reaction", "IMG_0431.png", "HUMAN");

  // ---- the reads, at one height
  const h = now();
  const money = (u: Unit, currency: Currency): MoneyRead => {
    const governing = scopeReader.governing(u, currency, h);
    const myDraws = draws.drawsAsOf(u, h).filter((d) => { const c = scopeGate.currencyOf(d.payload.scope, h); return !isUnknown(c) && c === currency; });
    const scopeHeights = [...new Set([...myDraws.map((d) => d.payload.scope), ...(isUnknown(governing) ? [] : [governing.at])])].sort((a, b) => a - b);
    const history = scopeHeights.flatMap((sh) => {
      const s = scopeReader.scopeAt(sh, h);
      return isUnknown(s) ? [] : [{ scope: s, drawn: lineage.drawsUnder(sh, h).length, inForce: !isUnknown(governing) && governing.at === sh }];
    });
    const all = samples.samplesFor(u, currency, h);
    const bound = new Set((isUnknown(all) ? [] : all.flatMap((s) => s.members)).map((k) => k.payload.context));
    return {
      governing,
      remaining: scopeGate.remaining(u, currency, h),
      next: isUnknown(governing) ? undefined : scopeGate.admitsDraw(u, governing.at, h),
      history,
      held: myDraws.filter((d) => !bound.has(d.at)),
    };
  };
  const promptOf = (u: Unit, currency: Currency) => {
    const identity = revisions.conditionInForce(u, currency, h);
    if (isUnknown(identity)) return identity;
    const inputs = prompts.get(identity) as DrawInputs;
    return { text: String(inputs["prompt"]), version: revisions.revisions(u, currency, h).length };
  };
  const takesOf = (u: Unit, currency: Currency): { readonly list: readonly TakeRead[]; readonly approved: number | undefined } => {
    const identity = revisions.conditionInForce(u, currency, h);
    const sample = isUnknown(identity) ? undefined : samples.of(u, currency, identity).compute(h);
    const members: readonly Candidate[] = sample === undefined || isUnknown(sample) ? [] : sample.members;
    const k = commitments.effectiveCommitment(u, currency, h);
    const at = isUnknown(k) ? undefined : k.payload.candidate;
    const list = members.map((c, i) => ({ n: i + 1, candidate: c, image: media.get(c.at) ?? "", file: files.get(c.at), by: c.author, observation: observations.observationOf(c, h), approved: c.at === at }));
    return { list, approved: list.find((t) => t.approved)?.n };
  };
  const read = (id: string, label: string, kind: CellRead["kind"]): CellRead => {
    const u = unit(id);
    const stills = takesOf(u, still);
    const clips = takesOf(u, clip);
    const from = stills.list[0]?.candidate.payload.from;
    const refLook = from === undefined || isUnknown(from) ? undefined : lineage.commitmentsAsOf(h).find((c) => c.at === from);
    const d = declarations.declarationAt(u, h);
    return {
      id, label, kind,
      level: isUnknown(d) ? d : d.payload.level,
      prompt: promptOf(u, still),
      clipPrompt: promptOf(u, clip),
      takes: stills.list,
      clips: clips.list,
      approvedTake: stills.approved,
      approvedClip: clips.approved,
      stills: money(u, still),
      clipMoney: money(u, clip),
      clipReach: reach.evaluate(u, clip, h),
      ratio: ratio.of(u).compute(h),
      reference: refLook === undefined ? undefined : media.get(refLook.candidate),
    };
  };
  return {
    title: "Story 1 · Scene 3 - the kitchen argument",
    cells: [read("mara-pkg", "Mara - identity package", "package"), read("3.1", "3.1 - wide", "shot"), read("3.2", "3.2 - Mara, close-up", "shot"), read("3.3", "3.3 - reaction", "shot")],
    record: { owner: "Rosa", devices: ["this laptop", "Rosa's phone"], asOf: "10:42", facts: facts.length },
  };
}
