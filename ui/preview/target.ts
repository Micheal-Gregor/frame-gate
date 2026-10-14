/**
 * PREVIEW ONLY (Phase 5, Simulate 2): the whole-view target for the shortlist C5 (bring in takes,
 * and see them), C8 (clear budgeting), C6 (scene board), with C7's plain words on every page they
 * touch. Two routes: #board, and #3.3 (the cell page). It renders what the engine returns, put
 * into words: no recomputed status, no ranking of takes, no threshold typed into the copy - the
 * one number the copy needs (the dispersion floor) is read from the library.
 */
import { isUnknown, type UnknownValue } from "../../src/kernel/index.js";
import { isAbsent, type ComponentValue } from "../../src/observation/index.js";
import { DISPERSION_FLOOR } from "../../src/statistics/index.js";
import type { DiagnosticValue, WithheldReason } from "../../src/diagnostic/index.js";
import type { ReachabilityEvaluation } from "../../src/reachability/index.js";
import { scene, type BudgetRead, type CellRead } from "./fixture.js";

const s = scene();
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
const num = (x: number): string => x.toFixed(2);
const code = (c: string): string => `<span class="code" title="the engine's code">${esc(c)}</span>`;

// ---- C7: plain words for the engine's own answers. Each maps a code the engine names; anything
// unmapped is shown as the engine says it. The code itself stays on screen, small.
const refusal: Readonly<Record<string, string>> = {
  "scope-exceeded": "this authorization is used up",
  unreachable: "needs an approved still first",
  "malformed-ceiling": "enter a whole number, 1 or more",
  "not-finite": "enter a number",
};
const said = (u: UnknownValue, none: string): string => {
  switch (u.kind) {
    case "refuse": return `${esc(refusal[u.guard] ?? `refused`)} ${code(u.guard)}`;
    case "no-subject": return esc(none);
    case "uncomputable": return `can't be worked out ${code(u.boundary)}`;
    case "undetermined": return `not enough to say yet ${code(u.ae)}`;
    case "latent": return "not known yet";
  }
};
const clipWords = (r: ReachabilityEvaluation): string =>
  isUnknown(r) ? said(r, "nothing to read yet") : r.verdict === "reachable" ? "can start" : `needs an approved ${esc(r.cheapestUnmet)} first ${code(`cheapest unmet: ${r.cheapestUnmet}`)}`;
const noBar: Readonly<Record<string, string>> = {
  "both-empty": "no bar yet - it needs an approved take and a passed-over take at this level, both scored",
  "accepted-empty": "no bar yet - it needs a scored, approved take at this level",
  "passed-over-empty": "no bar yet - it needs a scored take that was passed over at this level",
  "AE-5 open": "no bar yet - waiting on the project's rule for the bar; nothing for you to do here",
};
const withheld = (w: WithheldReason): string => {
  if ("kind" in w.cause && w.cause.kind === "no-bar") {
    const c = w.cause;
    return `${esc(noBar[c.cause] ?? `no bar yet (${c.cause})`)} ${code(c.cause)}<div class="counts">approved ${c.acceptedCount} · passed over ${c.passedOverCount} · left out ${c.excludedAccepted} / ${c.excludedPassedOver}</div>`;
  }
  const u = w.cause as UnknownValue;
  return u.kind === "undetermined" ? `needs ${DISPERSION_FLOOR} scored takes under this prompt ${code(u.ae)}` : said(u, "nothing to read yet");
};
const level = (l: string | UnknownValue): string => (isUnknown(l) ? said(l, "no level set") : `${esc(l)} shot`);
const closure = (c: CellRead): string =>
  c.sample === undefined ? "nothing drawn yet" : c.sample.closure.kind === "open" ? "no take approved yet" : c.sample.closure.kind === "closed-by-commitment" ? `take ${c.approvedTake ?? "?"} approved` : "prompt changed since these were drawn";
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;
/** C8: a budget in words - used of ceiling, what is left - from the engine's scope, its charged draws and remaining. */
const budgetLine = (b: BudgetRead, word: string): string => {
  if (isUnknown(b.scope)) return `none authorized`;
  const left = isUnknown(b.remaining) ? said(b.remaining, "") : b.remaining === 0 ? `<b class="spent">used up</b>` : `<b>${b.remaining} left</b>`;
  return `${b.used ?? "?"} of ${plural(b.scope.payload.ceiling, word)} used · ${left}`;
};
const nextWords = (b: BudgetRead, verb: string): string =>
  b.next === undefined ? "" : b.next === "WITHIN" ? `can be ${verb}` : said(b.next, "");

// ---- C5: a take with its image; the reference beside the set; the drop zone that brings takes in
const scoreCell = (v: ComponentValue | UnknownValue): string => {
  if (isUnknown(v)) return `<span class="none">${said(v, "")}</span>`;
  if (isAbsent(v)) return `<span class="absent">${v.discharge.kind === "dischargeable" ? "not yet" : `not here - ${esc(v.discharge.reason)}`}</span>`;
  return num(v);
};
const takeTile = (t: CellRead["takes"][number], selected: boolean): string => {
  const o = t.observation;
  const rows = isUnknown(o) ? `<span class="none" style="grid-column:1/-1">not scored yet</span>` : o.payload.components.map((c) => `<span>${esc(c.name)}</span><span>${scoreCell(c.value)}</span>`).join("");
  return `<div class="take${selected ? " selected" : ""}${t.approved ? " approved" : ""}">
    <img class="img" src="${t.image}" alt="take ${t.n}" />
    <div class="cap"><b>take ${t.n}</b>${t.brought ? `<span class="file">${esc(t.brought)}</span>` : ""}${t.approved ? `<span class="badge">approved</span>` : ""}</div>
    <div class="scores">${rows}</div></div>`;
};

function cellPage(c: CellRead, pick: number): string {
  const prompt = isUnknown(c.prompt) ? `<div class="spec">${said(c.prompt, "no prompt written yet")}</div>` : `<div class="spec">prompt v${c.prompt.version}: ${esc(c.prompt.text)}${c.prompt.verified ? ` <span class="ok" title="matches the prompt identity the engine holds">✓</span>` : ""}</div>`;
  const picked = c.takes.find((t) => t.n === pick);
  const current = picked === undefined || isUnknown(picked.observation) ? "not scored yet" : picked.observation.payload.components.map((k) => `${esc(k.name)} ${scoreCell(k.value)}`).join(", ");
  const drop = isUnknown(c.stills.scope)
    ? `<div class="drop off"><b>Bring in takes</b><span>Authorize stills first - each image you bring in counts as one.</span></div>`
    : c.stills.next === "WITHIN"
      ? `<label class="drop"><b>+ Bring in takes</b><span>drop images here, or choose files - each becomes the next take under prompt v${isUnknown(c.prompt) ? "?" : c.prompt.version}</span><span class="left">${isUnknown(c.stills.remaining) ? "" : `${plural(c.stills.remaining, "still")} left in this authorization`}</span></label>`
      : `<div class="drop off"><b>Bring in takes</b><span>${nextWords(c.stills, "brought in")} - authorize more stills to bring in more.</span></div>`;
  const diag = s.components.map((name) => {
    const d = c.diagnostics[name] as DiagnosticValue | UnknownValue;
    if (isUnknown(d)) return `<div class="axis"><b>${esc(name)}</b><div class="none">${said(d, "nothing to read yet")}</div></div>`;
    const spread = d.dispersion.kind === "dispersion" ? `spread ${num(d.dispersion.spread)} across ${d.dispersion.n} scored takes` : withheld(d.dispersion);
    const loc = d.location.kind === "location" ? `${esc(d.location.classification)} the bar - average ${num(d.location.centre)} against ${num(d.location.bar.theta)}` : withheld(d.location);
    return `<div class="axis"><b>${esc(name)}</b><div class="row"><span>how alike</span><span>${spread}</span></div><div class="row"><span>against the bar</span><span>${loc}</span></div></div>`;
  }).join("");
  return `
  <header><h1>${esc(c.label)}</h1><span class="meta">${level(c.level)}</span><span class="meta">${plural(c.takes.length, "take")} · ${closure(c)}</span></header>
  <main class="cell">
    <section class="card takes-card">
      <h2>Takes</h2>
      ${prompt}
      <div class="takes">${c.takes.map((t) => takeTile(t, t.n === pick)).join("")}</div>
      ${drop}
      ${picked === undefined ? "" : `<div class="compare">
        <figure><img class="img" src="${picked.image}" alt="take ${picked.n}" /><figcaption><b>take ${picked.n}</b>${picked.brought ? ` · ${esc(picked.brought)}` : ""}</figcaption></figure>
        ${c.reference ? `<figure><img class="img" src="${c.reference.image}" alt="reference" /><figcaption><b>reference</b> · ${esc(c.reference.label)}</figcaption></figure>` : ""}
      </div>
      <form class="score"><b style="grid-column:1/-1">Score take ${picked.n}</b><div class="note" style="grid-column:1/-1;margin-top:0">Scale ${esc(s.scale)}. Now: ${current}. New scores replace these.</div>
        ${s.components.map((k) => `<label>${esc(k)}</label><input placeholder="${esc(s.scale)}, or blank for not yet" />`).join("")}
        <span></span><button class="act" type="button">Record scores</button></form>`}
    </section>
    <section class="card approve">
      <h2>Approve</h2>
      ${c.approvedTake !== undefined ? `<div class="row"><span>approved</span><b>take ${c.approvedTake}</b></div>` : picked === undefined ? `<p class="note">Select a take to approve it.</p>` : `<div class="row"><span>selected</span><b>take ${picked.n}</b></div><div style="margin-top:8px"><button class="act" type="button">Approve take ${picked.n}</button></div><div class="note">The diagnostic proposes; approving is yours. New takes can still be brought in afterwards.</div>`}
      <div class="row"><span>clip for this cell</span><span>${clipWords(c.clip)}</span></div>
    </section>
    <section class="card budget">
      <h2>Budget</h2>
      <div class="sub">Stills</div>
      <div class="row"><span>used</span><span>${budgetLine(c.stills, "still")}</span></div>
      ${isUnknown(c.stills.scope) ? "" : `<div class="row"><span>estimate, as typed</span><span>${esc(c.stills.scope.payload.estimate)}</span></div>`}
      <form class="authorize">
        <b style="grid-column:1/-1">Authorize more stills</b>
        <label>how many more, from now</label><input value="3" />
        <label>estimate, as typed</label><input value="~$0.21 - 3 Imagine stills" />
        <div class="preview" style="grid-column:1/-1">After: <b>3 stills left</b>. ${isUnknown(c.stills.remaining) ? "" : `The ${c.stills.remaining} left now ${c.stills.remaining === 1 ? "is" : "are"} dropped - a new authorization replaces the current one.`}<div class="counts">drawn so far, shown with every authorization: ${isUnknown(c.ratio) ? said(c.ratio, "") : c.ratio.counts.map((k) => `${esc(k.currency === "i2v" ? "clips" : "stills")} ${k.count}`).join(" · ")}</div></div>
        <span></span><div class="buttons"><button class="act" type="button">Authorize 3 stills</button><button class="act secondary" type="button">Cancel</button></div>
      </form>
      <div class="sub">Clips</div>
      <div class="row"><span>used</span><span>${budgetLine(c.clips, "clip")}</span></div>
      ${isUnknown(c.clips.scope) ? `<div class="note">A clip can start once a still is approved; you can authorize clips before that.</div><div style="margin-top:8px"><button class="act secondary" type="button">Authorize clips…</button></div>` : `<div class="row"><span>next clip</span><span>${nextWords(c.clips, "started")}</span></div>`}
      <p class="charge">This app never charges you. Authorizing sets how many stills or clips may be brought in or made; you pay wherever the image is made. Saved in this browser.</p>
    </section>
    <section class="card diag">
      <details><summary><h2>Diagnostic</h2><span class="note">how alike the scored takes are, and where they sit against the bar - it proposes, never decides</span></summary>${diag}</details>
    </section>
  </main>`;
}

function boardPage(): string {
  const rows = s.cells.map((c) => {
    const estimates = [c.stills.scope, c.clips.scope].filter((x) => !isUnknown(x)).map((x) => esc((x as Exclude<typeof x, UnknownValue>).payload.estimate));
    return `<tr>
      <td data-h="Cell"><a href="#${esc(c.id)}"><b>${esc(c.label)}</b></a></td>
      <td data-h="Shot">${level(c.level)}</td>
      <td data-h="Takes">${c.takes.length}</td>
      <td data-h="Approved">${c.approvedTake === undefined ? `<span class="none">${c.takes.length === 0 ? "nothing drawn yet" : "no take yet"}</span>` : `take ${c.approvedTake}`}</td>
      <td data-h="Clip">${c.kind === "package" ? `<span class="none">reference only</span>` : clipWords(c.clip)}</td>
      <td data-h="Stills">${budgetLine(c.stills, "still")}</td>
      <td data-h="Clips">${c.kind === "package" ? `<span class="none">-</span>` : budgetLine(c.clips, "clip")}</td>
      <td data-h="Estimates, as typed" class="est">${estimates.length === 0 ? `<span class="none">-</span>` : estimates.join("<br />")}</td>
    </tr>`;
  }).join("");
  return `
  <header><h1>Scene board</h1><span class="meta">${esc(s.title)}</span><span class="meta">${plural(s.cells.length, "cell")}</span></header>
  <main class="board">
    <section class="card">
      <table><thead><tr><th>Cell</th><th>Shot</th><th>Takes</th><th>Approved</th><th>Clip</th><th>Stills</th><th>Clips</th><th>Estimates, as typed</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="charge">Money isn't totalled here: the app keeps each estimate as it was typed - no prices and no charges. This app never charges you.</p>
    </section>
  </main>`;
}

const app = document.getElementById("app") as HTMLElement;
const render = (): void => {
  const route = decodeURIComponent(location.hash.slice(1)) || "board";
  const cell = s.cells.find((c) => c.id === route);
  const nav = [`<a href="#board" class="${cell === undefined ? "active" : ""}">Scene board</a>`, ...s.cells.map((c) => `<a href="#${esc(c.id)}" class="${c === cell ? "active" : ""}">${esc(c.label)}</a>`)].join("");
  const options = [`<option${cell === undefined ? " selected" : ""}>Scene board</option>`, ...s.cells.map((c) => `<option${c === cell ? " selected" : ""}>${esc(c.label)}</option>`)].join("");
  app.innerHTML = `
  <div class="shell">
    <nav class="rail"><div class="brand">Review Theater</div><div class="scene">${esc(s.title)}</div>${nav}</nav>
    <div class="page">
      <div class="topbar"><b>Review Theater</b><select aria-label="cell">${options}</select></div>
      ${cell === undefined ? boardPage() : cellPage(cell, 2)}
    </div>
  </div>`;
};
addEventListener("hashchange", render);
render();
