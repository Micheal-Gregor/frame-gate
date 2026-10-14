/**
 * Review Theater - batch 1: the shell (layout, cell navigation) and ONE flow: review a cell's takes,
 * score one, read the diagnostic, approve. Every value is the library's answer and every act goes
 * through it; refusals are shown as the engine names them. No rule of the engine is restated here.
 */
import { isUnknown, type UnknownValue } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import type { Candidate } from "../../src/facts/index.js";
import { dischargeable, isAbsent, score, type ComponentEntry, type ComponentValue } from "../../src/observation/index.js";
import type { DiagnosticValue, WithheldReason } from "../../src/diagnostic/index.js";
import { demoScene } from "./demo.js";
import { engine } from "./engine.js";
import { PROJECT } from "./project.js";

const e = engine();
const [still, video] = e.order.currencies() as readonly [Currency, Currency];
const app = document.getElementById("app") as HTMLElement;
let selected: number | undefined;
let notice: string | undefined;

const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
const num = (x: number): string => x.toFixed(2);
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
/** The address: #<cell> or #<cell>/<take> - a cell, and optionally a take within it. */
const cellId = (): string => decodeURIComponent(location.hash.slice(1)).split("/")[0] || "3.2";
const takeFromHash = (): number | undefined => {
  const n = Number(decodeURIComponent(location.hash.slice(1)).split("/")[1]);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const scoreCell = (v: ComponentValue | UnknownValue): string => {
  if (isUnknown(v)) return `<span class="none">${esc(unknown(v))}</span>`;
  if (isAbsent(v)) return `<span class="absent">${v.discharge.kind === "dischargeable" ? `not yet - ${esc(v.discharge.task)}` : `not here - ${esc(v.discharge.reason)}`}</span>`;
  return num(v);
};
const withheld = (w: WithheldReason): string => {
  const cause = "kind" in w.cause && w.cause.kind === "no-bar"
    ? `no bar - ${esc(w.cause.cause)}<div class="counts">accepted ${w.cause.acceptedCount} · passed over ${w.cause.passedOverCount} · excluded ${w.cause.excludedAccepted} / ${w.cause.excludedPassedOver}</div>`
    : esc(unknown(w.cause as UnknownValue));
  return `<div class="withheld">withheld: ${cause}</div><div class="note">would supply it: ${esc(w.discharge)}</div>`;
};
const diagnosticCard = (name: string, d: DiagnosticValue | UnknownValue): string => {
  if (isUnknown(d)) return `<div class="axis"><b>${esc(name)}</b><div class="none">${esc(unknown(d))}</div></div>`;
  const spread = d.dispersion.kind === "dispersion" ? `spread ${num(d.dispersion.spread)} over ${d.dispersion.n} scored takes` : withheld(d.dispersion);
  const location = d.location.kind === "location"
    ? `${esc(d.location.classification)} - centre ${num(d.location.centre)} against bar ${num(d.location.bar.theta)} (n ${d.location.bar.sampleSize})`
    : withheld(d.location);
  return `<div class="axis"><b>${esc(name)}</b><div class="row"><span>dispersion</span></div><div>${spread}</div><div class="row"><span>location</span></div><div>${location}</div></div>`;
};

function cellView(unit: Unit): string {
  const at = e.record.top();
  const level = e.declarations.declarationAt(unit, at);
  const diagnostics = PROJECT.components.map((c) => [c, e.diagnostic.of(unit, still, c).compute(at)] as const);
  const read = diagnostics.map(([, d]) => d).find((d): d is DiagnosticValue => !isUnknown(d));
  const sample = read === undefined ? undefined : e.samples.of(unit, still, read.condition).compute(at);
  const takes: readonly Candidate[] = sample === undefined || isUnknown(sample) ? [] : sample.members;
  const approved = e.commitments.effectiveCommitment(unit, still, at);
  const approvedAt = isUnknown(approved) ? undefined : approved.payload.candidate;
  const n = (k: Candidate): number => takes.indexOf(k) + 1;
  const pick = selected !== undefined && selected <= takes.length ? takes[selected - 1] : undefined;

  const header = `<header><h1>${esc(PROJECT.labels[unit] ?? unit)}</h1><span class="meta">level ${esc(isUnknown(level) ? unknown(level) : level.payload.level)}</span>${
    sample !== undefined && !isUnknown(sample) ? `<span class="meta">sample: ${sample.cardinality} takes, ${esc(sample.closure.kind)}</span>` : ""
  }</header>`;
  if (takes.length === 0) {
    return `${header}${notice ? `<p class="notice">${esc(notice)}</p>` : ""}<div class="empty">No takes for this cell yet. An empty cell is a legal state.</div>`;
  }
  const cards = takes.map((k) => {
    const o = e.observations.observationOf(k, at);
    const rows = isUnknown(o)
      ? `<div class="none" style="grid-column:1/-1">no observation yet</div>`
      : o.payload.components.map((c) => `<span>${esc(c.name)}</span><span>${scoreCell(c.value)}</span>`).join("");
    const cls = ["take", k === pick ? "selected" : "", k.at === approvedAt ? "approved" : ""].join(" ");
    return `<button class="${cls}" data-take="${n(k)}"><div class="frame">take ${n(k)} - ${esc(PROJECT.classLabels[k.payload.currency] ?? k.payload.currency)}</div><div class="scores">${rows}</div>${k.at === approvedAt ? `<span class="badge">approved</span>` : ""}</button>`;
  }).join("");
  const scoreForm = pick === undefined ? `<p class="note">Select a take to score or approve it.</p>` : `
    <form class="score" data-take="${n(pick)}">
      <b style="grid-column:1/-1">Score take ${n(pick)} <span class="note">(leave a field blank for "not yet")</span></b>
      ${PROJECT.components.map((c) => `<label for="s-${c}">${esc(c)}</label><input id="s-${c}" name="${c}" inputmode="decimal" placeholder="not yet" />`).join("")}
      <span></span><button class="act" type="submit">Record scores</button>
    </form>`;
  const video_ = e.reach.evaluate(unit, video, at);
  const videoText = isUnknown(video_) ? unknown(video_) : video_.verdict === "reachable" ? "reachable" : `not reachable - cheapest unmet: ${video_.cheapestUnmet}`;
  const approveBody = isUnknown(approved)
    ? approved.kind === "no-subject"
      ? pick === undefined
        ? `<p class="note">Select a take to approve it.</p>`
        : `<div class="row"><span>selected</span><b>take ${n(pick)}</b></div><div style="margin-top:8px"><button class="act" data-approve="${n(pick)}">Approve take ${n(pick)}</button></div><div class="note">The diagnostic proposes. Approving is yours, with or without it.</div>`
      : `<div class="refused">${esc(unknown(approved))}</div>`
    : `<div class="row"><span>approved</span><b>take ${takes.findIndex((k) => k.at === approvedAt) + 1 || "?"}</b></div>`;
  return `${header}${notice ? `<p class="notice">${esc(notice)}</p>` : ""}
  <main>
    <section class="card">
      <h2>Takes</h2>
      <div class="spec">spec: ${esc(read?.condition ?? "")}</div>
      <div class="takes">${cards}</div>
      ${scoreForm}
    </section>
    <div class="stack">
      <section class="card"><h2>Diagnostic</h2>${diagnostics.map(([c, d]) => diagnosticCard(c, d)).join("")}</section>
      <section class="card"><h2>Approve</h2>${approveBody}<div class="row"><span>I2V for this cell</span><span>${esc(videoText)}</span></div></section>
    </div>
  </main>`;
}

function render(): void {
  const id = cellId();
  const unit = e.registry.unit(id);
  const nav = Object.keys(PROJECT.units).map((c) => `<a href="#${encodeURIComponent(c)}" class="${c === id ? "active" : ""}">${esc(PROJECT.labels[c] ?? c)}</a>`).join("");
  const body = e.record.empty()
    ? `<header><h1>${esc(PROJECT.title)}</h1></header><div class="empty"><p>This browser's record is empty.</p><button class="act" data-demo>Start with the demo scene</button><p class="note">The demo records invented acts through the library: Mara's approved identity still, then six stills for cell 3.2, five reviewed.</p></div>`
    : isUnknown(unit) ? `<div class="empty">${esc(unknown(unit))}</div>` : cellView(unit);
  app.innerHTML = `<div class="shell"><nav><div class="brand">Review Theater</div><div class="scene">${esc(PROJECT.title)}</div>${nav}</nav><div>${body}</div></div>`;
}

app.addEventListener("click", (ev) => {
  const t = ev.target as HTMLElement;
  const take = t.closest<HTMLElement>("[data-take]");
  if (t.closest("[data-demo]")) {
    const r = demoScene(e);
    notice = r === "RECORDED" ? undefined : `The demo stopped: ${unknown(r)}`;
    render();
  } else if (t.closest("[data-approve]")) {
    const unit = e.registry.unit(cellId()) as Unit;
    const at = e.record.top();
    const read = PROJECT.components.map((c) => e.diagnostic.of(unit, still, c).compute(at)).find((d): d is DiagnosticValue => !isUnknown(d));
    const sample = read && e.samples.of(unit, still, read.condition).compute(at);
    const k = sample && !isUnknown(sample) ? sample.members[Number(t.closest<HTMLElement>("[data-approve]")?.dataset["approve"]) - 1] : undefined;
    if (k !== undefined) e.commitments.commit(k, "HUMAN");
    notice = undefined;
    render();
  } else if (take && take.tagName === "BUTTON") {
    selected = Number(take.dataset["take"]);
    notice = undefined;
    render();
  }
});

app.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const form = ev.target as HTMLFormElement;
  const unit = e.registry.unit(cellId()) as Unit;
  const at = e.record.top();
  const read = PROJECT.components.map((c) => e.diagnostic.of(unit, still, c).compute(at)).find((d): d is DiagnosticValue => !isUnknown(d));
  const sample = read && e.samples.of(unit, still, read.condition).compute(at);
  const k = sample && !isUnknown(sample) ? sample.members[Number(form.dataset["take"]) - 1] : undefined;
  if (k === undefined) return;
  const entries: Record<string, ComponentEntry> = {};
  for (const c of PROJECT.components) {
    const raw = (new FormData(form).get(c) ?? "").toString().trim();
    const value: ComponentValue | UnknownValue = raw === "" ? dischargeable("a later look") : score(Number(raw));
    if (isUnknown(value)) {
      notice = `${c}: ${unknown(value)}`;
      return render();
    }
    entries[c] = { value, author: "HUMAN" };
  }
  const o = e.observations.observe(k, entries, "HUMAN", e.record.top());
  notice = isUnknown(o) ? `The observation was not recorded: ${unknown(o)}` : undefined;
  render();
});

window.addEventListener("hashchange", () => {
  selected = takeFromHash();
  notice = undefined;
  render();
});
selected = takeFromHash();
render();
