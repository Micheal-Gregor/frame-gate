/**
 * PREVIEW ONLY (Phase 5, Simulate 4) - disposable, never shipped, never imported by product UI.
 *
 * The SEALED library composed over an invented fixture: Scene 3, the morning after. Every value the
 * target shows is the engine's answer to a real call, except what the target marks as invented: the
 * pictures (the app's example drawings), and each act's clock time and the host's standing (the
 * record service would note those once built - no route exists yet).
 */
import { height, isUnknown, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { RecordPort } from "../../src/ports/index.js";
import { CurrencyOrder, DeclarationLedger, IndependenceLedger, UnitRegistry, type Currency, type Unit } from "../../src/catalog/index.js";
import { BOTTOM, CandidateLedger, CommitmentLedger, DrawContextLog, LineageReader, type Candidate, type CandidateProposal, type Commitment, type DrawContext } from "../../src/facts/index.js";
import { Reachability, ReachabilityGate } from "../../src/reachability/index.js";
import { InvalidationLedger, InvalidationScope, SignatureGate, type ScopeValue } from "../../src/lineage/index.js";
import { ConditionIdentities, RevisionLog, Samples } from "../../src/condition/index.js";
import { ObservationLedger, dischargeable, score, type ComponentEntry, type ComponentValue, type Observation } from "../../src/observation/index.js";
import { AuthorizationForms, Ratio, ScopeGate, ScopeLedger, ScopeReader, type ScopeRecord } from "../../src/spend/index.js";
import { AE5_OPEN, Bar, PopulationPartition } from "../../src/calibration/index.js";
import { SHA256_HEX } from "../app/sha256.js";
import { exampleClip, exampleStill, type Look } from "../app/example-art.js";

/** A: a cell's money in one currency - made, reserved (with who and when), free, and every authorization. */
export interface MoneyRead {
  readonly governing: ScopeRecord | UnknownValue;
  readonly made: number;
  readonly reserved: readonly { readonly draw: DrawContext; readonly by: string; readonly when: string }[];
  readonly free: number | UnknownValue;
  readonly next: "WITHIN" | UnknownValue | undefined;
  readonly history: readonly { readonly scope: ScopeRecord; readonly drawn: number; readonly inForce: boolean }[];
}
export interface TakeRead { readonly n: number; readonly k: Candidate; readonly image: string; readonly file: string; readonly by: string; readonly when: string; readonly o: Observation | UnknownValue; readonly approved: boolean }
export interface CellRead {
  readonly id: string;
  readonly label: string;
  readonly kind: "package" | "shot";
  readonly level: string;
  readonly takes: readonly TakeRead[];
  readonly clips: readonly TakeRead[];
  readonly approvedTake: number | undefined;
  readonly approvedClip: number | undefined;
  readonly stills: MoneyRead;
  readonly clipMoney: MoneyRead;
  /** B: what un-approving this cell's still would undo, as the engine derives it (OBJ-28). */
  readonly undoStill: ScopeValue | undefined;
  readonly undoClip: ScopeValue | undefined;
}
export interface Scene4 {
  readonly title: string;
  readonly cells: readonly CellRead[];
  /** INVENTED until the service notes it: the host's standing and the backup's last run. */
  readonly host: { readonly address: string; readonly devices: readonly string[]; readonly asOf: string; readonly offlineSince: string | undefined; readonly lastCopy: string; readonly kept: number };
}

export function scene(): Scene4 {
  const facts: unknown[] = [];
  const record: RecordPort<unknown, RecordHeight> = { append: (f: unknown) => { facts.push(f); return height(facts.length); }, readAsOf: (at: RecordHeight) => facts.slice(0, at) };
  const now = (): RecordHeight => height(facts.length);
  const order = new CurrencyOrder({ currencies: ["still", "i2v"] });
  const [still, clip] = order.currencies() as readonly [Currency, Currency];
  const registry = new UnitRegistry({ units: { "mara-pkg": { package: "Mara" }, "3.1": { shot: "wide" }, "3.2": { shot: "close-up", speaking: true }, "3.3": { shot: "reaction" } } });
  const unit = (id: string): Unit => registry.unit(id) as Unit;
  const lineage = new LineageReader({ record });
  const invalidationScope = new InvalidationScope({ lineage });
  const invalidations = new InvalidationLedger({ record, scopes: invalidationScope, renderer: { present: () => undefined } });
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
  const bar = new Bar({ populations: new PopulationPartition({ lineage, samples, draws, declarations, invalidations, observations }), separation: AE5_OPEN });
  const forms = new AuthorizationForms({ ratio: new Ratio({ candidates }) });
  const scopes = new ScopeLedger({ record, bar, declarations });

  // ---- app-side, invented: files, and each act's clock time (the service would note it)
  const pictures = new Map<RecordHeight, { image: string; file: string }>();
  const clock = new Map<RecordHeight, string>();
  let time = "9:02 PM";
  const at = (t: string): void => { time = t; };
  const write = (u: Unit, c: Currency, prompt: string, characters: string[]): void => { revisions.revise(u, c, identities.identityOf({ prompt, characters }), "HUMAN"); };
  const authorize = (u: Unit, c: Currency, ceiling: number, estimate: string): void => {
    const h = now();
    const s = scopes.authorize(forms.build(u, c, h) as Exclude<ReturnType<typeof forms.build>, UnknownValue>, ceiling, { kind: "none" }, estimate, "HUMAN", h);
    if (isUnknown(s)) throw new Error("fixture: authorize");
  };
  const reserve = (u: Unit, c: Currency, author: "HUMAN" | "ENGINE"): DrawContext => {
    const g = scopeReader.governing(u, c, now()); const cond = revisions.conditionInForce(u, c, now());
    const d = draws.recordDraw(u, { source: "reserved" }, (g as ScopeRecord).at, cond as string, now(), author);
    if (isUnknown(d)) throw new Error(`fixture: reserve ${JSON.stringify(d)}`);
    clock.set(d.at, time);
    return d;
  };
  let n = 0;
  const fill = (d: DrawContext, c: Currency, from: CandidateProposal["from"], art: Blob, file: string, author: "HUMAN" | "ENGINE"): Candidate => {
    n += 1;
    const proposal: CandidateProposal = { context: d, unit: d.payload.unit, currency: c, condition: d.payload.condition, seed: `seed-${n}`, from };
    const k = candidates.appendCandidate(proposal, signatures.sign(signatures.materialOf(proposal)), now(), author);
    if (isUnknown(k)) throw new Error(`fixture: fill ${JSON.stringify(k)}`);
    pictures.set(k.at, { image: URL.createObjectURL(art), file });
    clock.set(k.at, time);
    return k;
  };
  const take = (u: Unit, from: CandidateProposal["from"], look: Look, file: string, author: "HUMAN" | "ENGINE"): Candidate => fill(reserve(u, still, author), still, from, exampleStill(look, n + 1), file, author);
  const observe = (k: Candidate, v: Readonly<Record<string, number | "later">>): void => {
    const entries: Record<string, ComponentEntry> = {};
    for (const [name, x] of Object.entries(v)) entries[name] = { value: (x === "later" ? dischargeable("a later look") : score(x)) as ComponentValue, author: "HUMAN" };
    observations.observe(k, entries, "HUMAN", now());
  };

  // ---- Mara: two looks, the second approved; at 2:10 a.m. the overnight program reserved a third and never filled it
  const mara = unit("mara-pkg");
  declarations.declare(mara, "easy", "HUMAN");
  independence.declareIndependence(mara, true, "HUMAN");
  write(mara, still, "Mara, early 30s, dark curly hair, green cardigan; even light", []);
  authorize(mara, still, 3, "~$0.21 - 3 Imagine stills");
  take(mara, BOTTOM, "mara", "mara-look-1.png", "HUMAN");
  const maraLook: Commitment = commitments.commit(take(mara, BOTTOM, "mara", "mara-look-2.png", "HUMAN"), "HUMAN");
  // ---- 3.1: Rosa reserved one at 9:40 PM; the program reserved one at 2:10 AM
  const wide = unit("3.1");
  declarations.declare(wide, "easy", "HUMAN");
  write(wide, still, "Wide: the kitchen at night, Mara at the sink, back to camera", ["@mara"]);
  authorize(wide, still, 3, "~$0.21 - 3 Imagine stills");
  at("9:40 PM"); reserve(wide, still, "HUMAN");
  // ---- 3.3: four stills, three brought in; re-authorized three, one more (the evening before)
  const reaction = unit("3.3");
  declarations.declare(reaction, "hard", "HUMAN");
  write(reaction, still, "Reaction: Mara listening, jaw set, kitchen window behind her", ["@mara"]);
  at("10:30 PM");
  authorize(reaction, still, 4, "~$0.28 - 4 Imagine stills");
  const brought = ["IMG_0412.png", "IMG_0413.png", "IMG_0415.png"].map((f) => take(reaction, maraLook, "reaction", f, "HUMAN"));
  observe(brought[0] as Candidate, { identity: 0.74, composition: 0.69 });
  observe(brought[1] as Candidate, { identity: 0.58, composition: "later" });
  authorize(reaction, still, 3, "~$0.21 - 3 Imagine stills");
  at("10:50 PM"); take(reaction, maraLook, "reaction", "IMG_0431.png", "HUMAN");
  // ---- 3.2: six overnight stills by the program at 1:15 AM
  const close = unit("3.2");
  declarations.declare(close, "hard", "HUMAN");
  write(close, still, "Close-up: Mara mid-sentence, kitchen light from the left", ["@mara"]);
  authorize(close, still, 6, "~$0.42 - 6 Imagine stills (vendor quote)");
  at("1:15 AM");
  const looks: Look[] = ["mara", "mara-off", "mara", "mara", "mara", "mara"];
  const closeTakes = looks.map((l, i) => take(close, maraLook, l, `runner-3.2-${i + 1}.png`, "ENGINE"));
  // ---- at 2:10 AM the program reserved one still for 3.1 and one for Mara - and never filled them
  at("2:10 AM"); reserve(wide, still, "ENGINE"); reserve(mara, still, "ENGINE");
  // ---- the morning: scores, take 3 approved, clip 1 approved; clip 2 came in better
  at("8:20 AM");
  [{ identity: 0.71, composition: 0.6 }, { identity: 0.64, composition: "later" }, { identity: 0.82, composition: 0.74 }, { identity: 0.77, composition: 0.58 }, { identity: 0.69, composition: 0.66 }]
    .forEach((v, i) => observe(closeTakes[i] as Candidate, v as Record<string, number | "later">));
  const still3 = commitments.commit(closeTakes[2] as Candidate, "HUMAN");
  write(close, clip, "Mara turns toward the window, slow push-in, 4 seconds", ["@mara"]);
  authorize(close, clip, 2, "~$0.60 - 2 Imagine clips (vendor quote)");
  const c1 = fill(reserve(close, clip, "HUMAN"), clip, still3, exampleClip(3), "3.2-clip-1.mp4", "HUMAN");
  observe(c1, { identity: 0.71, composition: 0.7 });
  commitments.commit(c1, "HUMAN");
  at("9:05 AM");
  const c2 = fill(reserve(close, clip, "HUMAN"), clip, still3, exampleClip(5), "3.2-clip-2.mp4", "HUMAN");
  observe(c2, { identity: 0.84, composition: 0.76 });

  // ---- the reads, at one height
  const h = now();
  const by = (a: string): string => (a === "ENGINE" ? "a program" : a === "DIRECTOR" ? "the director" : "a person");
  const money = (u: Unit, c: Currency): MoneyRead => {
    const governing = scopeReader.governing(u, c, h);
    const mine = draws.drawsAsOf(u, h).filter((d) => { const x = scopeGate.currencyOf(d.payload.scope, h); return !isUnknown(x) && x === c; });
    const all = samples.samplesFor(u, c, h);
    const bound = new Set((isUnknown(all) ? [] : all.flatMap((s) => s.members)).map((k) => k.payload.context));
    const held = mine.filter((d) => !bound.has(d.at));
    const heights = [...new Set([...mine.map((d) => d.payload.scope), ...(isUnknown(governing) ? [] : [governing.at])])].sort((a, b) => a - b);
    return {
      governing,
      // this authorization only: its draws with a take, its draws still waiting for one
      made: isUnknown(governing) ? 0 : mine.filter((d) => d.payload.scope === governing.at && bound.has(d.at)).length,
      reserved: held.filter((d) => !isUnknown(governing) && d.payload.scope === governing.at).map((d) => ({ draw: d, by: by(d.author), when: clock.get(d.at) ?? "" })),
      free: scopeGate.remaining(u, c, h),
      next: isUnknown(governing) ? undefined : scopeGate.admitsDraw(u, governing.at, h),
      history: heights.flatMap((sh) => { const s = scopeReader.scopeAt(sh, h); return isUnknown(s) ? [] : [{ scope: s, drawn: lineage.drawsUnder(sh, h).length, inForce: !isUnknown(governing) && governing.at === sh }]; }),
    };
  };
  const takes = (u: Unit, c: Currency): { list: TakeRead[]; approved: number | undefined; commitment: Commitment | undefined } => {
    const cond = revisions.conditionInForce(u, c, h);
    const sample = isUnknown(cond) ? undefined : samples.of(u, c, cond).compute(h);
    const members: readonly Candidate[] = sample === undefined || isUnknown(sample) ? [] : sample.members;
    const k = commitments.effectiveCommitment(u, c, h);
    const list = members.map((m, i) => ({ n: i + 1, k: m, image: pictures.get(m.at)?.image ?? "", file: pictures.get(m.at)?.file ?? "", by: by(m.author), when: clock.get(m.at) ?? "", o: observations.observationOf(m, h), approved: !isUnknown(k) && k.payload.candidate === m.at }));
    return { list, approved: list.find((t) => t.approved)?.n, commitment: isUnknown(k) ? undefined : k };
  };
  const read = (id: string, label: string, kind: CellRead["kind"]): CellRead => {
    const u = unit(id);
    const s = takes(u, still);
    const c = takes(u, clip);
    const d = declarations.declarationAt(u, h);
    return {
      id, label, kind, level: isUnknown(d) ? "" : d.payload.level,
      takes: s.list, clips: c.list, approvedTake: s.approved, approvedClip: c.approved,
      stills: money(u, still), clipMoney: money(u, clip),
      undoStill: s.commitment === undefined ? undefined : invalidationScope.of(s.commitment.at).compute(h),
      undoClip: c.commitment === undefined ? undefined : invalidationScope.of(c.commitment.at).compute(h),
    };
  };
  return {
    title: "Story 1 · Scene 3 - the kitchen argument",
    cells: [read("mara-pkg", "Mara - identity package", "package"), read("3.1", "3.1 - wide", "shot"), read("3.2", "3.2 - Mara, close-up", "shot"), read("3.3", "3.3 - reaction", "shot")],
    host: { address: "http://192.168.1.205:5173", devices: ["the host computer", "an iPhone"], asOf: "9:12 AM", offlineSince: undefined, lastCopy: "last night, 2:00 AM", kept: 14 },
  };
}
