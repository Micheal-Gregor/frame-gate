/**
 * PREVIEW ONLY (Phase 5, Simulate 1): the whole-view target for the shortlist C3 (take review +
 * diagnostic), C4 (approve, never blocked) and C2 (budget panel). It renders what the engine
 * returns, as returned: no recomputed status, no restated rule, no threshold in the copy.
 */
import { isUnknown, type UnknownValue } from "../../src/kernel/index.js";
import { isAbsent, type ComponentValue } from "../../src/observation/index.js";
import type { DiagnosticValue, WithheldReason } from "../../src/diagnostic/index.js";
import { scene } from "./fixture.js";

const s = scene();
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
/** An Unknown, named as the engine names it. */
const unknown = (u: UnknownValue): string => {
  switch (u.kind) {
    case "refuse": return `refused: ${u.guard}`;
    case "no-subject": return "nothing to read yet";
    case "uncomputable": return `uncomputable: ${u.boundary}`;
    case "undetermined": return `undetermined (${u.ae})`;
    case "latent": return "latent";
  }
};
const num = (x: number): string => x.toFixed(2);

// ---- C3: the takes of the spec in force, as observed
const scoreCell = (v: ComponentValue | UnknownValue): string => {
  if (isUnknown(v)) return `<span class="none">${esc(unknown(v))}</span>`;
  if (isAbsent(v)) return `<span class="absent">${v.discharge.kind === "dischargeable" ? `not yet - ${esc(v.discharge.task)}` : `not here - ${esc(v.discharge.reason)}`}</span>`;
  return num(v);
};
const takes = s.takes.map((t) => {
  const o = t.observation;
  const rows = isUnknown(o)
    ? `<div class="none" style="grid-column:1/-1">no observation yet</div>`
    : o.payload.components.map((c) => `<span>${esc(c.name)}</span><span>${scoreCell(c.value)}</span>`).join("");
  return `<div class="take${t.n === 3 ? " selected" : ""}"><div class="frame">take ${t.n} - still</div><div class="scores">${rows}</div></div>`;
}).join("");

// ---- C3: the diagnostic per component; every withheld axis shown with its reason (PC-07)
const withheld = (w: WithheldReason): string => {
  const cause = "kind" in w.cause && w.cause.kind === "no-bar"
    ? `no bar - ${esc(w.cause.cause)}<div class="counts">accepted ${w.cause.acceptedCount} · passed over ${w.cause.passedOverCount} · excluded ${w.cause.excludedAccepted} / ${w.cause.excludedPassedOver}</div>`
    : esc(unknown(w.cause as UnknownValue));
  return `<div class="withheld">withheld: ${cause}</div><div class="note">would supply it: ${esc(w.discharge)}</div>`;
};
const diag = (name: string, d: DiagnosticValue | UnknownValue): string => {
  if (isUnknown(d)) return `<div class="axis"><b>${esc(name)}</b><div class="none">${esc(unknown(d))}</div></div>`;
  const spread = d.dispersion.kind === "dispersion" ? `spread ${num(d.dispersion.spread)} over ${d.dispersion.n} scored takes` : withheld(d.dispersion);
  const location = d.location.kind === "location"
    ? `${esc(d.location.classification)} - centre ${num(d.location.centre)} against bar ${num(d.location.bar.theta)} (n ${d.location.bar.sampleSize})`
    : withheld(d.location);
  return `<div class="axis"><b>${esc(name)}</b><div class="row"><span>dispersion</span></div><div>${spread}</div><div class="row"><span>location</span></div><div>${location}</div></div>`;
};
const diagnostics = s.components.map((c) => diag(c, s.diagnostics[c] as DiagnosticValue | UnknownValue)).join("");

// ---- C4: approve - the diagnostic proposes; it never blocks
const video = isUnknown(s.video) ? unknown(s.video) : s.video.verdict === "reachable" ? "reachable" : `not reachable - cheapest unmet: ${s.video.cheapestUnmet}`;

// ---- C2: the budget panel - the governing scope, what remains, and the next draw's answer
const governing = isUnknown(s.governing)
  ? `<div class="none">${esc(unknown(s.governing))}</div>`
  : `<div class="row"><span>ceiling</span><b>${s.governing.payload.ceiling} stills</b></div><div class="row"><span>estimate (as given)</span><span>${esc(s.governing.payload.estimate)}</span></div>`;
const remaining = isUnknown(s.remaining) ? unknown(s.remaining) : String(s.remaining);
const next = s.nextDraw === "ADMITTED" ? "admitted" : `<span class="refused">${esc(unknown(s.nextDraw))}</span>`;
const ratio = isUnknown(s.ratio) ? unknown(s.ratio) : s.ratio.counts.map((c) => `${esc(c.currency)} ${c.count}`).join(" · ");

const app = document.getElementById("app") as HTMLElement;
app.innerHTML = `
<header>
  <h1>Scene 3 · Cell 3.2 - Mara, close-up</h1>
  <span class="meta">level ${esc(isUnknown(s.level) ? unknown(s.level) : s.level)}</span>
  <span class="tag">spec in force: ${esc(s.condition)}</span>
  <span class="meta">sample: ${esc(s.sample ? `${s.sample.cardinality} takes, ${s.sample.closure.kind}` : "none")}</span>
</header>
<main>
  <section class="card">
    <h2>Takes - C3</h2>
    <div class="takes">${takes}</div>
  </section>
  <div class="stack">
    <section class="card">
      <h2>Diagnostic - C3</h2>
      ${diagnostics}
    </section>
    <section class="card">
      <h2>Approve - C4</h2>
      <div class="row"><span>selected</span><b>take 3</b></div>
      <div class="row"><span>I2V for this cell</span><span>${esc(video)}</span></div>
      <div style="margin-top:8px"><button>Approve take 3</button></div>
      <div class="note">The diagnostic proposes. Approving is yours, with or without it.</div>
    </section>
    <section class="card">
      <h2>Budget - C2</h2>
      ${governing}
      <div class="row"><span>remaining</span><b>${esc(remaining)}</b></div>
      <div class="row"><span>next draw</span>${next}</div>
      <div class="row"><span>draws so far (ratio)</span><span>${ratio}</span></div>
      <div style="margin-top:8px"><button class="secondary">Authorize more stills…</button></div>
    </section>
  </div>
</main>
<footer>Target · Simulate 1 · Every value above is the sealed library's answer over an invented fixture. What comes off?</footer>`;
