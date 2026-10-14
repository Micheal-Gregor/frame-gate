/**
 * The demo scene: invented acts, recorded THROUGH the library so the board starts somewhere. It
 * records Mara's approved identity still, then six stills for cell 3.2 drawn from it, five of them
 * reviewed. Every act passes the library's own gates; a refusal stops the demo and is shown.
 * Takes carry no media: the library owns none, and the Runner is not part of this app.
 */
import { isUnknown, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import { BOTTOM, type Candidate, type CandidateProposal, type Commitment } from "../../src/facts/index.js";
import { dischargeable, score, type ComponentEntry, type ComponentValue } from "../../src/observation/index.js";
import type { Engine } from "./engine.js";

export function demoScene(e: Engine): UnknownValue | "RECORDED" {
  const now = (): RecordHeight => e.record.top();
  const unit = (id: string): Unit => e.registry.unit(id) as Unit;
  const [still] = e.order.currencies() as readonly [Currency, Currency];
  const stop = (what: string, x: UnknownValue): never => {
    throw Object.assign(new Error(`demo: ${what}`), { answer: x });
  };
  const authorize = (u: Unit, ceiling: number, estimate: string) => {
    const h = now();
    const form = e.forms.build(u, still, h);
    if (isUnknown(form)) stop("form", form);
    const s = e.scopes.authorize(form as Exclude<typeof form, UnknownValue>, ceiling, { kind: "none" }, estimate, "HUMAN", h);
    return isUnknown(s) ? stop("scope", s) : s;
  };
  let seeds = 0;
  const draw = (u: Unit, under: RecordHeight, condition: string, from: CandidateProposal["from"]): Candidate => {
    const context = e.draws.recordDraw(u, { demo: true }, under, condition, now(), "ENGINE");
    if (isUnknown(context)) return stop("draw", context);
    seeds += 1;
    const proposal: CandidateProposal = { context, unit: u, currency: still, condition, seed: `demo-${seeds}`, from };
    const k = e.candidates.appendCandidate(proposal, e.signatures.sign(e.signatures.materialOf(proposal)), now(), "ENGINE");
    return isUnknown(k) ? stop("candidate", k) : k;
  };
  const observe = (k: Candidate, values: Readonly<Record<string, number | "later">>): void => {
    const entries: Record<string, ComponentEntry> = {};
    for (const [name, x] of Object.entries(values)) {
      const value: ComponentValue | UnknownValue = x === "later" ? dischargeable("a later look") : score(x);
      if (isUnknown(value)) stop("score", value);
      entries[name] = { value: value as ComponentValue, author: "HUMAN" };
    }
    const o = e.observations.observe(k, entries, "HUMAN", now());
    if (isUnknown(o)) stop("observation", o);
  };
  try {
    const mara = unit("mara-pkg");
    e.declarations.declare(mara, "easy", "HUMAN");
    e.independence.declareIndependence(mara, true, "HUMAN");
    const pkg = authorize(mara, 3, "~$0.21 - 3 Imagine stills");
    draw(mara, pkg.at, "mara-identity-v1", BOTTOM);
    const maraStill: Commitment = e.commitments.commit(draw(mara, pkg.at, "mara-identity-v1", BOTTOM), "HUMAN");
    for (const id of ["3.1", "3.2", "3.3"]) e.declarations.declare(unit(id), id === "3.1" ? "easy" : "hard", "HUMAN");
    const cell = unit("3.2");
    const s = authorize(cell, 6, "~$0.42 - 6 Imagine stills (vendor quote)");
    const condition = "3.2 spec v1 - Mara, close-up, kitchen, @mara";
    const takes = [0, 1, 2, 3, 4, 5].map(() => draw(cell, s.at, condition, maraStill));
    const looks: readonly Readonly<Record<string, number | "later">>[] = [
      { identity: 0.71, composition: 0.6 },
      { identity: 0.64, composition: "later" },
      { identity: 0.82, composition: 0.74 },
      { identity: 0.77, composition: 0.58 },
      { identity: 0.69, composition: 0.66 },
    ];
    looks.forEach((values, i) => observe(takes[i] as Candidate, values));
    return "RECORDED";
  } catch (err) {
    const answer = (err as { answer?: UnknownValue }).answer;
    if (answer !== undefined) return answer;
    throw err;
  }
}
