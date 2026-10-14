/**
 * Review Theater. Batch 1: the shell and one flow (review a cell's takes, score one, read the
 * diagnostic, approve). Batch 2: the budget card. Batch 3: the scene board (C6), bringing takes in
 * with their images (C5), budgeting in plain terms with clips as their own budget (C8), and the
 * engine's answers in plain words on these pages (C7). Every value is the library's answer and
 * every act goes through it; refusals are shown as the engine names them, in words, code beside.
 */
import { isUnknown, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import type { Candidate } from "../../src/facts/index.js";
import { dischargeable, score, type ComponentEntry, type ComponentValue } from "../../src/observation/index.js";
import type { DiagnosticValue } from "../../src/diagnostic/index.js";
import type { ScopeRecord } from "../../src/spend/index.js";
import { bringIn, promptOf } from "./acts.js";
import { exampleScene } from "./demo.js";
import { engine } from "./engine.js";
import { PROJECT } from "./project.js";
import { mediaStore, prepare, promptStore } from "./stores.js";
import { budgetWords, clipWords, code, esc, num, plural, said, scoreWords, withheld } from "./words.js";

const e = engine();
const prompts = promptStore();
const media = await mediaStore();
if (e.record.empty()) media.clear();
const [still, clip] = e.order.currencies() as readonly [Currency, Currency];
const app = document.getElementById("app") as HTMLElement;
let selected: number | undefined;
/** A refusal, a stop or a confirmation, shown where the act was made, so it is in view on a phone. */
let notice: { readonly at: "page" | "score" | "authorize" | "bring"; readonly text: string; readonly ok?: boolean } | undefined;
/** The currency whose authorize form is open, if any. */
let authorizing: Currency | undefined;

const word = (c: Currency): string => PROJECT.classLabels[c] ?? c;
const noticeIn = (at: "score" | "authorize" | "bring", wide = true): string =>
  notice?.at === at ? `<div class="${notice.ok ? "done" : "refused"}"${wide ? ` style="grid-column:1/-1"` : ""}>${notice.text}</div>` : "";

/** The address: #board, #<cell> or #<cell>/<take>. */
const route = (): { readonly id: string | undefined; readonly take: number | undefined } => {
  const [id, take] = decodeURIComponent(location.hash.slice(1)).split("/");
  const n = Number(take);
  return { id: id === undefined || id === "" || id === "board" ? undefined : id, take: Number.isInteger(n) && n > 0 ? n : undefined };
};

/** A cell's takes: the sample under the prompt in force (or, with none, the one the diagnostic reads). */
function takesOf(unit: Unit, at: RecordHeight) {
  const diagnostics = PROJECT.components.map((c) => [c, e.diagnostic.of(unit, still, c).compute(at)] as const);
  const inForce = e.revisions.conditionInForce(unit, still, at);
  const read = diagnostics.map(([, d]) => d).find((d): d is DiagnosticValue => !isUnknown(d));
  const condition = isUnknown(inForce) ? read?.condition : inForce;
  const sample = condition === undefined ? undefined : e.samples.of(unit, still, condition as Parameters<typeof e.samples.of>[2]).compute(at);
  const takes: readonly Candidate[] = sample === undefined || isUnknown(sample) ? [] : sample.members;
  const approved = e.commitments.effectiveCommitment(unit, still, at);
  const approvedAt = isUnknown(approved) ? undefined : approved.payload.candidate;
  const approvedTake = approvedAt === undefined ? undefined : takes.findIndex((k) => k.at === approvedAt) + 1 || undefined;
  return { diagnostics, sample: sample === undefined || isUnknown(sample) ? undefined : sample, takes, approved, approvedAt, approvedTake };
}

/** One currency's budget for a cell: the scope in force, the draws charged against it, what remains, its answer to the next draw. */
function budgetOf(unit: Unit, currency: Currency, at: RecordHeight) {
  const scope = e.scopeReader.governing(unit, currency, at);
  return {
    scope,
    used: isUnknown(scope) ? undefined : e.lineage.drawsUnder(scope.at, at).length,
    remaining: e.scopeGate.remaining(unit, currency, at),
    next: isUnknown(scope) ? undefined : e.scopeGate.admitsDraw(unit, scope.at, at),
  };
}

const levelWords = (unit: Unit, at: RecordHeight): string => {
  const d = e.declarations.declarationAt(unit, at);
  return isUnknown(d) ? said(d, "no shot level set") : `${esc(d.payload.level)} shot`;
};
const isPackage = (id: string): boolean => "package" in ((PROJECT.units as Readonly<Record<string, Readonly<Record<string, unknown>>>>)[id] ?? {});

/** The file a take was brought in as, from its draw's recorded features. */
function fileOf(unit: Unit, k: Candidate, at: RecordHeight): string | undefined {
  const draw = e.draws.drawsAsOf(unit, at).find((d) => d.at === k.payload.context);
  const file = draw?.payload.features["file"];
  return typeof file === "string" ? file : undefined;
}

/** The approved look a take was drawn from, and its image: the commitment named by `from`, and the take it accepted. */
function referenceOf(k: Candidate | undefined, at: RecordHeight): { readonly label: string; readonly image: string | undefined } | undefined {
  const from = k?.payload.from;
  if (from === undefined || isUnknown(from)) return undefined;
  const look = e.lineage.commitmentsAsOf(at).find((c) => c.at === from);
  return look === undefined ? undefined : { label: `${PROJECT.labels[look.unit] ?? look.unit}, approved look`, image: media.get(look.candidate) };
}

const picture = (image: string | undefined, alt: string): string =>
  image === undefined ? `<div class="img blank">no image</div>` : `<img class="img" src="${image}" alt="${esc(alt)}" />`;

function authorizeForm(unit: Unit, currency: Currency, at: RecordHeight, remaining: number | UnknownValue): string {
  const form = e.forms.build(unit, currency, at);
  const counts = isUnknown(form) ? said(form, "") : form.ratio.counts.map((c) => `${esc(word(c.currency))}s ${c.count}`).join(" · ");
  const dropped = isUnknown(remaining) ? "" : remaining === 0
    ? " It replaces the current authorization, which is used up."
    : ` The ${remaining} left now ${remaining === 1 ? "is" : "are"} dropped - a new authorization replaces the current one.`;
  return `<form class="authorize" data-authorize="${esc(currency)}">
    <b style="grid-column:1/-1">Authorize ${isUnknown(remaining) ? "" : "more "}${esc(word(currency))}s</b>
    <label for="a-ceiling">how many${isUnknown(remaining) ? "" : " more, from now"}</label><input id="a-ceiling" name="ceiling" inputmode="numeric" placeholder="${esc(word(currency))}s" />
    <label for="a-estimate">estimate, as typed</label><input id="a-estimate" name="estimate" placeholder="e.g. a vendor quote" />
    <div class="preview" style="grid-column:1/-1">After authorizing, you'll have exactly the number you enter.${dropped}<div class="counts">drawn so far, shown with every authorization: ${counts}</div></div>
    ${noticeIn("authorize")}<span></span><div class="buttons"><button class="act" type="submit">Authorize</button><button class="act secondary" type="button" data-authorize-cancel>Cancel</button></div>
  </form>`;
}

/** C8: stills and clips, each its own budget; the form that authorizes more; what authorizing does and does not do. */
function budgetCard(id: string, unit: Unit, at: RecordHeight): string {
  const section = (currency: Currency): string => {
    const b = budgetOf(unit, currency, at);
    const w = word(currency);
    const next = b.next === undefined ? "" : `<div class="row"><span>next ${esc(w)}</span><span>${b.next === "WITHIN" ? `can be ${currency === still ? "brought in" : "made"}` : said(b.next, "")}</span></div>`;
    const estimate = isUnknown(b.scope) ? "" : `<div class="row"><span>estimate, as typed</span><span>${esc(b.scope.payload.estimate)}</span></div>`;
    const action = authorizing === currency
      ? authorizeForm(unit, currency, at, b.remaining)
      : `${currency === clip && isUnknown(b.scope) ? `<div class="note">A clip can start once a still is approved; you can authorize clips before that.</div>` : ""}<div style="margin-top:8px"><button class="act secondary" type="button" data-authorize-open="${esc(currency)}">Authorize ${isUnknown(b.scope) ? "" : "more "}${esc(w)}s…</button></div>`;
    return `<div class="sub">${esc(w)}s</div><div class="row"><span>used</span><span>${budgetWords(b.scope, b.used, b.remaining, w)}</span></div>${estimate}${next}${action}`;
  };
  return `<section class="card budget"><h2>Budget</h2>${section(still)}${isPackage(id) ? "" : section(clip)}
    <p class="charge">This app never charges you. Authorizing sets how many stills or clips may be brought in or made; you pay wherever the image is made. Saved in this browser.</p></section>`;
}

function cellView(id: string, unit: Unit): string {
  const at = e.record.top();
  const { diagnostics, sample, takes, approved, approvedAt, approvedTake } = takesOf(unit, at);
  const n = (k: Candidate): number => takes.indexOf(k) + 1;
  const pick = selected !== undefined && selected <= takes.length ? takes[selected - 1] : undefined;
  const closure = sample === undefined ? "nothing drawn yet" : sample.closure.kind === "open" ? "no take approved yet" : sample.closure.kind === "closed-by-commitment" ? `take ${approvedTake ?? "?"} approved` : "prompt changed since these were drawn";
  const header = `<header><h1>${esc(PROJECT.labels[unit] ?? unit)}</h1><span class="meta">${levelWords(unit, at)}</span><span class="meta">${plural(takes.length, "take")} · ${closure}</span></header>`;

  // C5: the prompt the takes are drawn under, the takes with their images, the way more come in
  const prompt = promptOf(e, prompts, unit, still);
  const promptLine = isUnknown(prompt)
    ? `<div class="spec">${said(prompt, "No prompt written for this cell yet.")}</div>`
    : `<div class="spec">prompt v${prompt.version}: ${prompt.inputs === undefined ? `<span class="none">its text isn't in this browser</span> ${code(prompt.identity.slice(0, 12))}` : `${esc(prompt.inputs["prompt"])} <span class="ok" title="matches the prompt identity the engine holds">✓</span>`}</div>`;
  const tiles = takes.map((k) => {
    const o = e.observations.observationOf(k, at);
    const rows = isUnknown(o) ? `<span class="none" style="grid-column:1/-1">not scored yet</span>` : o.payload.components.map((c) => `<span>${esc(c.name)}</span><span>${scoreWords(c.value)}</span>`).join("");
    const file = fileOf(unit, k, at);
    const cls = ["take", k === pick ? "selected" : "", k.at === approvedAt ? "approved" : ""].join(" ");
    return `<button class="${cls}" type="button" data-take="${n(k)}">${picture(media.get(k.at), `take ${n(k)}`)}<div class="cap"><b>take ${n(k)}</b>${file ? `<span class="file">${esc(file)}</span>` : ""}${k.at === approvedAt ? `<span class="badge">approved</span>` : ""}</div><div class="scores">${rows}</div></button>`;
  }).join("");
  const stills = budgetOf(unit, still, at);
  const bring = isUnknown(prompt)
    ? `<div class="drop off"><b>Bring in takes</b><span>Takes are drawn under a prompt, and this cell has none yet.</span></div>`
    : isUnknown(stills.scope)
      ? `<div class="drop off"><b>Bring in takes</b><span>Authorize stills first - each image you bring in counts as one.</span>${noticeIn("bring", false)}</div>`
      : stills.next === "WITHIN"
        ? `<label class="drop" data-drop><input type="file" accept="image/*" multiple data-bring hidden /><b>+ Bring in takes</b><span>drop images here, or choose files - each becomes the next take under prompt v${prompt.version}</span><span class="left">${isUnknown(stills.remaining) ? "" : `${plural(stills.remaining, "still")} left in this authorization`}</span>${noticeIn("bring", false)}</label>`
        : `<div class="drop off"><b>Bring in takes</b><span>${stills.next === undefined ? "" : said(stills.next, "")} - authorize more stills to bring in more.</span>${noticeIn("bring", false)}</div>`;
  const reference = referenceOf(pick ?? takes[0], at);
  const current = pick === undefined ? "" : (() => {
    const o = e.observations.observationOf(pick, at);
    return isUnknown(o) ? "not scored yet" : o.payload.components.map((c) => `${esc(c.name)} ${scoreWords(c.value)}`).join(", ");
  })();
  const scoring = pick === undefined
    ? takes.length === 0 ? "" : `<p class="note">Select a take to score it beside the reference, or to approve it.</p>`
    : `<div class="compare">
        <figure>${picture(media.get(pick.at), `take ${n(pick)}`)}<figcaption><b>take ${n(pick)}</b>${fileOf(unit, pick, at) ? ` · ${esc(fileOf(unit, pick, at))}` : ""}</figcaption></figure>
        ${reference === undefined ? "" : `<figure>${picture(reference.image, "reference")}<figcaption><b>reference</b> · ${esc(reference.label)}</figcaption></figure>`}
      </div>
      <form class="score" data-take="${n(pick)}">
        <b style="grid-column:1/-1">Score take ${n(pick)}</b><div class="note" style="grid-column:1/-1;margin-top:0">Scale ${esc(PROJECT.scale)}. Now: ${current}. New scores replace these.</div>
        ${PROJECT.components.map((c) => `<label for="s-${c}">${esc(c)}</label><input id="s-${c}" name="${c}" inputmode="decimal" placeholder="${esc(PROJECT.scale)}, or blank for not yet" />`).join("")}
        ${noticeIn("score")}<span></span><button class="act" type="submit">Record scores</button>
      </form>`;

  // C4: approve - the diagnostic proposes, never blocks
  const approveBody = isUnknown(approved)
    ? approved.kind === "no-subject"
      ? pick === undefined
        ? `<p class="note">${takes.length === 0 ? "No takes to approve yet." : "Select a take to approve it."}</p>`
        : `<div class="row"><span>selected</span><b>take ${n(pick)}</b></div><div style="margin-top:8px"><button class="act" type="button" data-approve="${n(pick)}">Approve take ${n(pick)}</button></div><div class="note">The diagnostic proposes; approving is yours. New takes can still be brought in afterwards.</div>`
      : `<div class="refused">${said(approved, "")}</div>`
    : `<div class="row"><span>approved</span><b>take ${approvedTake ?? "?"}</b></div>`;
  const clipRow = isPackage(id) ? "" : `<div class="row"><span>clip for this cell</span><span>${clipWords(e.reach.evaluate(unit, clip, at))}</span></div>`;

  // C3 + C7: the diagnostic, in words, folded away
  const diag = diagnostics.map(([name, d]) => {
    if (isUnknown(d)) return `<div class="axis"><b>${esc(name)}</b><div class="none">${said(d, "nothing to read yet")}</div></div>`;
    const spread = d.dispersion.kind === "dispersion" ? `spread ${num(d.dispersion.spread)} across ${d.dispersion.n} scored takes` : withheld(d.dispersion);
    const loc = d.location.kind === "location" ? `${esc(d.location.classification)} the bar - average ${num(d.location.centre)} against ${num(d.location.bar.theta)}` : withheld(d.location);
    return `<div class="axis"><b>${esc(name)}</b><div class="row"><span>how alike</span><span>${spread}</span></div><div class="row"><span>against the bar</span><span>${loc}</span></div></div>`;
  }).join("");

  return `${header}${notice?.at === "page" ? `<p class="notice">${esc(notice.text)}</p>` : ""}
  <main class="cell">
    <section class="card takes-card"><h2>Takes</h2>${promptLine}${takes.length === 0 ? `<div class="empty">Nothing drawn yet.</div>` : `<div class="takes">${tiles}</div>`}${bring}${scoring}</section>
    <section class="card approve"><h2>Approve</h2>${approveBody}${clipRow}</section>
    ${budgetCard(id, unit, at)}
    <section class="card diag"><details><summary><h2>Diagnostic</h2><span class="note">how alike the scored takes are, and where they sit against the bar - it proposes, never decides</span></summary>${diag}</details></section>
  </main>`;
}

/** C6: every cell on one row - level, takes, approval, the clip, both budgets, the estimates as typed. */
function boardView(): string {
  const at = e.record.top();
  const rows = Object.keys(PROJECT.units).map((id) => {
    const unit = e.registry.unit(id);
    if (isUnknown(unit)) return `<tr><td colspan="8">${esc(id)}: ${said(unit, "not registered")}</td></tr>`;
    const { takes, approvedTake } = takesOf(unit, at);
    const s = budgetOf(unit, still, at);
    const c = budgetOf(unit, clip, at);
    const estimates = [s.scope, c.scope].filter((x): x is ScopeRecord => !isUnknown(x)).map((x) => esc(x.payload.estimate));
    return `<tr>
      <td data-h="Cell"><span><a href="#${encodeURIComponent(id)}"><b>${esc(PROJECT.labels[id] ?? id)}</b></a></span></td>
      <td data-h="Shot"><span>${levelWords(unit, at)}</span></td>
      <td data-h="Takes"><span>${takes.length}</span></td>
      <td data-h="Approved"><span>${approvedTake === undefined ? `<span class="none">${takes.length === 0 ? "nothing drawn yet" : "no take yet"}</span>` : `take ${approvedTake}`}</span></td>
      <td data-h="Clip"><span>${isPackage(id) ? `<span class="none">reference only</span>` : clipWords(e.reach.evaluate(unit, clip, at))}</span></td>
      <td data-h="Stills"><span>${budgetWords(s.scope, s.used, s.remaining, word(still))}</span></td>
      <td data-h="Clips"><span>${isPackage(id) ? `<span class="none">-</span>` : budgetWords(c.scope, c.used, c.remaining, word(clip))}</span></td>
      <td data-h="Estimates, as typed" class="est"><span>${estimates.length === 0 ? `<span class="none">-</span>` : estimates.join("<br />")}</span></td>
    </tr>`;
  }).join("");
  return `<header><h1>Scene board</h1><span class="meta">${esc(PROJECT.title)}</span><span class="meta">${plural(Object.keys(PROJECT.units).length, "cell")}</span></header>
  <main class="board"><section class="card">
    <table><thead><tr><th>Cell</th><th>Shot</th><th>Takes</th><th>Approved</th><th>Clip</th><th>Stills</th><th>Clips</th><th>Estimates, as typed</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="charge">Money isn't totalled here: the app keeps each estimate as it was typed - no prices and no charges. This app never charges you.</p>
  </section></main>`;
}

function render(): void {
  const { id } = route();
  const ids = Object.keys(PROJECT.units);
  const rail = [`<a href="#board" class="${id === undefined ? "active" : ""}">Scene board</a>`, ...ids.map((c) => `<a href="#${encodeURIComponent(c)}" class="${c === id ? "active" : ""}">${esc(PROJECT.labels[c] ?? c)}</a>`)].join("");
  const picker = [`<option value="board"${id === undefined ? " selected" : ""}>Scene board</option>`, ...ids.map((c) => `<option value="${esc(c)}"${c === id ? " selected" : ""}>${esc(PROJECT.labels[c] ?? c)}</option>`)].join("");
  const unit = id === undefined ? undefined : e.registry.unit(id);
  const body = e.record.empty()
    ? `<header><h1>${esc(PROJECT.title)}</h1></header><div class="empty"><p>Nothing is recorded in this browser yet.</p><button class="act" type="button" data-demo>Start with the example scene</button><p class="note">The example records a made-up scene through the engine: Mara's approved look, six overnight takes for 3.2 to review, and three takes brought in for 3.3. Its pictures are drawings.</p></div>`
    : unit === undefined ? boardView() : isUnknown(unit) ? `<div class="empty">${said(unit, "There is no such cell.")}</div>` : cellView(id as string, unit);
  app.innerHTML = `<div class="shell">
    <nav class="rail"><div class="brand">Review Theater</div><div class="scene">${esc(PROJECT.title)}</div>${rail}</nav>
    <div class="page">
      <div class="topbar"><b>Review Theater</b><select data-cell aria-label="cell">${picker}</select></div>
      ${body}
    </div>
  </div>`;
}

/** C5: each file becomes the next take, in order; the first refusal stops the rest and is shown in the drop bar. */
async function bringFiles(files: readonly File[]): Promise<void> {
  const unit = e.registry.unit(route().id ?? "") as Unit;
  let brought = 0;
  notice = undefined;
  for (const file of files) {
    let ready: { readonly image: string; readonly sha256: string };
    try {
      ready = await prepare(file);
    } catch {
      notice = { at: "bring", text: `Brought in ${brought} of ${files.length}: ${esc(file.name)} isn't an image this browser can read.` };
      break;
    }
    const take = bringIn(e, prompts, media, unit, still, { name: file.name, ...ready }, "HUMAN");
    if (isUnknown(take)) {
      notice = { at: "bring", text: `Brought in ${brought} of ${files.length}: ${said(take, "none authorized")}` };
      break;
    }
    brought += 1;
  }
  if (notice === undefined) notice = { at: "bring", text: `Brought in ${plural(brought, "take")}.`, ok: true };
  render();
}

app.addEventListener("click", (ev) => {
  const t = ev.target as HTMLElement;
  const take = t.closest<HTMLElement>("button.take");
  if (t.closest("[data-demo]")) {
    const r = exampleScene(e, prompts, media);
    notice = r === "RECORDED" ? undefined : { at: "page", text: `The example stopped: ${said(r, "")}` };
    render();
  } else if (t.closest("[data-approve]")) {
    const unit = e.registry.unit(route().id ?? "") as Unit;
    const k = takesOf(unit, e.record.top()).takes[Number(t.closest<HTMLElement>("[data-approve]")?.dataset["approve"]) - 1];
    if (k !== undefined) e.commitments.commit(k, "HUMAN");
    notice = undefined;
    render();
  } else if (t.closest("[data-authorize-open], [data-authorize-cancel]")) {
    const open = t.closest<HTMLElement>("[data-authorize-open]")?.dataset["authorizeOpen"];
    authorizing = open === undefined ? undefined : (e.order.currencies().find((c) => c === open) ?? undefined);
    notice = undefined;
    render();
  } else if (take !== null) {
    selected = Number(take.dataset["take"]);
    notice = undefined;
    render();
  }
});

app.addEventListener("change", (ev) => {
  const t = ev.target as HTMLElement;
  if (t instanceof HTMLSelectElement && t.dataset["cell"] !== undefined) location.hash = encodeURIComponent(t.value);
  if (t instanceof HTMLInputElement && t.dataset["bring"] !== undefined && t.files !== null) void bringFiles(Array.from(t.files));
});

app.addEventListener("dragover", (ev) => {
  const zone = (ev.target as HTMLElement).closest("[data-drop]");
  if (zone === null) return;
  ev.preventDefault();
  zone.classList.add("over");
});
app.addEventListener("dragleave", (ev) => (ev.target as HTMLElement).closest("[data-drop]")?.classList.remove("over"));
app.addEventListener("drop", (ev) => {
  if ((ev.target as HTMLElement).closest("[data-drop]") === null) return;
  ev.preventDefault();
  void bringFiles(Array.from(ev.dataTransfer?.files ?? []));
});

app.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const form = ev.target as HTMLFormElement;
  const unit = e.registry.unit(route().id ?? "") as Unit;
  const at = e.record.top();
  const data = new FormData(form);
  const currency = e.order.currencies().find((c) => c === form.dataset["authorize"]);
  if (currency !== undefined) {
    const built = e.forms.build(unit, currency, at);
    const scope = isUnknown(built)
      ? built
      : e.scopes.authorize(built, Number((data.get("ceiling") ?? "").toString().trim()), { kind: "none" }, (data.get("estimate") ?? "").toString().trim(), "HUMAN", at);
    notice = isUnknown(scope) ? { at: "authorize", text: `Not authorized: ${said(scope, "")}` } : undefined;
    authorizing = isUnknown(scope) ? currency : undefined;
    return render();
  }
  const k = takesOf(unit, at).takes[Number(form.dataset["take"]) - 1];
  if (k === undefined) return;
  const entries: Record<string, ComponentEntry> = {};
  for (const c of PROJECT.components) {
    const raw = (data.get(c) ?? "").toString().trim();
    const value: ComponentValue | UnknownValue = raw === "" ? dischargeable("a later look") : score(Number(raw));
    if (isUnknown(value)) {
      notice = { at: "score", text: `${esc(c)}: ${said(value, "")}` };
      return render();
    }
    entries[c] = { value, author: "HUMAN" };
  }
  const o = e.observations.observe(k, entries, "HUMAN", e.record.top());
  notice = isUnknown(o) ? { at: "score", text: `Not recorded: ${said(o, "")}` } : { at: "score", text: "Recorded in this browser.", ok: true };
  render();
});

window.addEventListener("hashchange", () => {
  selected = route().take;
  notice = undefined;
  authorizing = undefined;
  render();
});
selected = route().take;
render();
