/**
 * Review Theater. Batch 1: the shell and one flow (review, score, read the diagnostic, approve).
 * Batch 2: the budget card. Batch 3: the scene board, bringing takes in with their images, budgeting
 * in plain terms, the engine's answers in words. Batch 4: the scene's record on every device (A),
 * money you can follow and reserving before you make (B), clips in (C), small fixes (I). Every value
 * is the library's answer and every act goes through it; refusals are shown as the engine names
 * them, in words, code beside.
 */
import { isUnknown, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import type { Candidate } from "../../src/facts/index.js";
import { dischargeable, score, type ComponentEntry, type ComponentValue } from "../../src/observation/index.js";
import { bringIn, reserve, writePrompt } from "./acts.js";
import { exampleScene } from "./demo.js";
import { engine } from "./engine.js";
import { PROJECT } from "./project.js";
import { moneyOf, promptOf, takesOf, type Money } from "./reads.js";
import { StaleRecord, connect, prepare } from "./stores.js";
import { clipWords, esc, heldWords, historyWords, moneyWords, num, plural, said, scoreWords, withheld } from "./words.js";

const conn = await connect();
const e = engine(conn.record);
const { prompts, media } = conn;
const [still, clip] = e.order.currencies() as readonly [Currency, Currency];
const app = document.getElementById("app") as HTMLElement;
let selected: { readonly kind: "take" | "clip"; readonly n: number } | undefined;
/** A refusal, a stop or a confirmation, shown where the act was made, so it is in view on a phone. */
let notice: { readonly at: string; readonly text: string; readonly ok?: boolean } | undefined;
/** The currency whose authorize form is open, if any. */
let authorizing: Currency | undefined;
/** A: where this device stands against the record. */
let standing = { devices: ["this computer"] as readonly string[], asOf: new Date(), reached: true };

const word = (c: Currency): string => PROJECT.classLabels[c] ?? c;
const noticeIn = (at: string, wide = true): string =>
  notice?.at === at ? `<div class="${notice.ok ? "done" : "refused"}"${wide ? ` style="grid-column:1/-1"` : ""}>${notice.text}</div>` : "";
const isPackage = (id: string): boolean => "package" in ((PROJECT.units as Readonly<Record<string, Readonly<Record<string, unknown>>>>)[id] ?? {});
const time = (d: Date): string => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** The address: #board, #<cell>, #<cell>/<take n> or #<cell>/c<clip n>. */
const route = (): { readonly id: string | undefined; readonly pick: typeof selected } => {
  const [id, part] = decodeURIComponent(location.hash.slice(1)).split("/");
  const m = /^(c?)(\d+)$/.exec(part ?? "");
  return { id: id === undefined || id === "" || id === "board" ? undefined : id, pick: m === null ? undefined : { kind: m[1] === "c" ? "clip" : "take", n: Number(m[2]) } };
};

/** An act against the shared record: if another device appended first, nothing was written - catch up, and say so. */
function act(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    if (err instanceof StaleRecord) {
      notice = { at: "page", text: "Another device changed this scene a moment ago. This screen is up to date now - please do that again." };
      void e.record.refresh().then(render);
      return;
    }
    notice = { at: "page", text: `Nothing was recorded: the record couldn't be reached (${esc((err as Error).message)}).` };
    render();
  }
}

// ---- A: the record's standing, in the rail and under the top bar
const standingLine = (): string =>
  `<div class="recstat"><b>This scene's record</b><span>on ${standing.devices.map(esc).join(", ")}</span><span>${standing.reached ? `as of ${time(standing.asOf)} · up to date` : `<span class="refused">can't reach the record since ${time(standing.asOf)}</span>`}</span><button class="link" type="button" data-refresh>refresh</button></div>`;
async function catchUp(): Promise<void> {
  try {
    const s = await conn.status();
    const arrived = s.height > e.record.top() ? await e.record.refresh() : 0;
    standing = { devices: s.devices.length === 0 ? ["this computer"] : s.devices, asOf: new Date(), reached: true };
    const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
    if (arrived > 0 && !typing) return render();
  } catch {
    standing = { ...standing, reached: false };
  }
  document.querySelectorAll(".recstat").forEach((el) => (el.outerHTML = standingLine()));
}

const picture = (take: RecordHeight, alt: string): string => {
  const url = media.url(take);
  if (url === undefined) return `<div class="img blank">no file yet</div>`;
  return media.isVideo(take) ? `<video class="img" src="${url}" muted loop playsinline autoplay controls></video>` : `<img class="img" src="${url}" alt="${esc(alt)}" />`;
};
const fileOf = (unit: Unit, k: Candidate, at: RecordHeight): string | undefined => {
  const named = media.name(k.at);
  if (named !== undefined) return named;
  const file = e.draws.drawsAsOf(unit, at).find((d) => d.at === k.payload.context)?.payload.features["file"];
  return typeof file === "string" ? file : undefined;
};
const levelWords = (unit: Unit, at: RecordHeight): string => {
  const d = e.declarations.declarationAt(unit, at);
  return isUnknown(d) ? said(d, "no shot level set") : `${esc(d.payload.level)} shot`;
};
const promptLine = (unit: Unit, currency: Currency, at: RecordHeight, label: string): string => {
  const p = promptOf(e, prompts, unit, currency, at);
  if (isUnknown(p)) return `<div class="spec">${said(p, `No ${label} written for this cell yet.`)}</div>`;
  return `<div class="spec">${label} v${p.version}: ${p.inputs === undefined ? `<span class="none">its text isn't in the record service</span>` : `${esc(p.inputs["prompt"])} <span class="ok">✓</span> <span class="tick">matches what's recorded</span>`}</div>`;
};

// ---- takes and clips as tiles; a reserved draw as a slot waiting for its file
function tiles(unit: Unit, currency: Currency, list: readonly Candidate[], approvedAt: RecordHeight | undefined, money: Money, at: RecordHeight): string {
  const kind = currency === clip ? "clip" : "take";
  const shown = list.map((k, i) => {
    const n = i + 1;
    const o = e.observations.observationOf(k, at);
    const rows = isUnknown(o) ? `<span class="none" style="grid-column:1/-1">not scored yet</span>` : o.payload.components.map((c) => `<span>${esc(c.name)}</span><span>${scoreWords(c.value)}</span>`).join("");
    const file = fileOf(unit, k, at);
    const cls = ["take", selected?.kind === kind && selected.n === n ? "selected" : "", k.at === approvedAt ? "approved" : ""].join(" ");
    const via = k.author === "ENGINE" ? `<span class="via">via program</span>` : k.author === "DIRECTOR" ? `<span class="via">proposed by the director</span>` : "";
    return `<button class="${cls}" type="button" data-pick="${kind === "clip" ? "c" : ""}${n}">${picture(k.at, `${kind} ${n}`)}<div class="cap"><b>${kind} ${n}</b>${file ? `<span class="file">${esc(file)}</span>` : ""}${via}${k.at === approvedAt ? `<span class="badge">approved</span>` : ""}</div><div class="scores">${rows}</div></button>`;
  }).join("");
  const slots = money.held.map(() => `<label class="take slot" data-drop="${esc(currency)}"><input type="file" accept="${currency === clip ? "video/*,image/*" : "image/*"}" multiple data-bring="${esc(currency)}" hidden /><b>reserved ${esc(word(currency))}</b><span class="note">waiting for its file - drop it here</span></label>`).join("");
  return shown + slots;
}

/** C5 + B: the bar that brings files in - into reserved draws first, then new ones while the authorization allows. */
function bringBar(currency: Currency, money: Money, hasPrompt: boolean): string {
  const w = word(currency);
  const input = `<input type="file" accept="${currency === clip ? "video/*,image/*" : "image/*"}" multiple data-bring="${esc(currency)}" hidden />`;
  if (!hasPrompt) return `<div class="drop off"><b>Bring in ${esc(w)}s</b><span>${currency === clip ? "Write the clip prompt first." : "Takes are drawn under a prompt, and this cell has none yet."}</span></div>`;
  if (isUnknown(money.governing)) return `<div class="drop off"><b>Bring in ${esc(w)}s</b><span>Authorize ${esc(w)}s first - each file you bring in counts as one.</span>${noticeIn(`bring-${currency}`, false)}</div>`;
  if (money.held.length > 0) {
    const more = isUnknown(money.remaining) || money.remaining === 0 ? "" : `, then ${money.remaining} more can come in`;
    return `<label class="drop" data-drop="${esc(currency)}">${input}<b>+ Bring in ${esc(w)}s</b><span>drop files here, or choose them - the first ${money.held.length} fill the reserved ${esc(w)}s${more}</span>${noticeIn(`bring-${currency}`, false)}</label>`;
  }
  if (money.next === "WITHIN") return `<label class="drop" data-drop="${esc(currency)}">${input}<b>+ Bring in ${esc(w)}s</b><span>drop files here, or choose them - each becomes the next ${esc(w)}</span><span class="left">${isUnknown(money.remaining) ? "" : `${plural(money.remaining, w)} left`}</span>${noticeIn(`bring-${currency}`, false)}</label>`;
  return `<div class="drop off"><b>Bring in ${esc(w)}s</b><span>all ${money.governing.payload.ceiling} ${esc(w)}s of this authorization are drawn - authorize more to bring in more</span>${noticeIn(`bring-${currency}`, false)}</div>`;
}

function scoreForm(kind: "take" | "clip", k: Candidate, n: number, at: RecordHeight): string {
  const o = e.observations.observationOf(k, at);
  const now = isUnknown(o) ? "not scored yet" : o.payload.components.map((c) => `${esc(c.name)} ${scoreWords(c.value)}`).join(", ");
  const hint = kind === "clip" ? " For a clip, identity means: does she hold for the whole clip." : "";
  return `<form class="score" data-score="${kind === "clip" ? "c" : ""}${n}">
    <b style="grid-column:1/-1">Score ${kind} ${n}</b><div class="note" style="grid-column:1/-1;margin-top:0">Scale ${esc(PROJECT.scale)}.${hint} Now: ${now}. New scores replace these.</div>
    ${PROJECT.components.map((c) => `<label for="s-${c}">${esc(c)}</label><input id="s-${c}" name="${c}" inputmode="decimal" placeholder="${esc(PROJECT.scale)}, or blank for not yet" />`).join("")}
    ${noticeIn(`score-${kind}`)}<span></span><button class="act" type="submit">Record scores</button>
  </form>`;
}

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
    <div class="preview" style="grid-column:1/-1">After authorizing, you'll have exactly the number you enter.${dropped}<div class="counts">takes so far, shown with every authorization: ${counts}</div></div>
    ${noticeIn("authorize")}<span></span><div class="buttons"><button class="act" type="submit">Authorize</button><button class="act secondary" type="button" data-authorize-cancel>Cancel</button></div>
  </form>`;
}

/** B: one currency's money - the authorization in force, the reserved draws, every authorization as typed, reserve and authorize. */
function moneySection(unit: Unit, currency: Currency, m: Money, at: RecordHeight): string {
  const w = word(currency);
  const reserveRow = isUnknown(m.governing)
    ? ""
    : m.next === "WITHIN"
      ? `<div class="reserve"><button class="act secondary" type="button" data-reserve="${esc(currency)}">Reserve a ${esc(w)}</button><span class="note">holds one now, before you make it in Grok - its file is never refused later</span>${noticeIn(`reserve-${currency}`, false)}</div>`
      : `<div class="note">${m.next === undefined ? "" : said(m.next, "")} - authorize more to reserve or bring in more.</div>`;
  const reachNote = currency === clip && isUnknown(m.governing)
    ? (() => {
        const r = e.reach.evaluate(unit, clip, at);
        return `<div class="note">${!isUnknown(r) && r.verdict === "reachable" ? "This cell's still is approved: clips can be authorized and made." : "A clip can start once a still is approved; you can authorize clips before that."}</div>`;
      })()
    : "";
  const action = authorizing === currency
    ? authorizeForm(unit, currency, at, m.remaining)
    : `<div style="margin-top:6px"><button class="act secondary" type="button" data-authorize-open="${esc(currency)}">Authorize ${isUnknown(m.governing) ? "" : "more "}${esc(w)}s…</button></div>`;
  return `<div class="sub">${esc(w)}s</div><div class="row"><span>this authorization</span><span>${moneyWords(m, w)}</span></div>${heldWords(m, w)}${historyWords(m)}${reachNote}${reserveRow}${action}`;
}

function cellView(id: string, unit: Unit): string {
  const at = e.record.top();
  const stills = takesOf(e, unit, still, at);
  const clips = takesOf(e, unit, clip, at);
  const stillMoney = moneyOf(e, unit, still, at);
  const clipMoney = moneyOf(e, unit, clip, at);
  const pickTake = selected?.kind === "take" ? stills.takes[selected.n - 1] : undefined;
  const pickClip = selected?.kind === "clip" ? clips.takes[selected.n - 1] : undefined;
  const n = selected?.n ?? 0;
  const header = `<header><h1>${esc(PROJECT.labels[unit] ?? unit)}</h1><span class="meta">${levelWords(unit, at)}</span><span class="meta">${plural(stills.takes.length, "take")} · ${stills.approvedTake === undefined ? "no take approved yet" : `take ${stills.approvedTake} approved`}${isPackage(id) || stills.approvedTake === undefined ? "" : ` · ${plural(clips.takes.length, "clip")}${clips.approvedTake === undefined ? "" : `, clip ${clips.approvedTake} approved`}`}</span></header>`;

  // ---- takes: the sheet, reserved slots, the bar, the selected take beside its reference, its score form
  const stillPrompt = promptOf(e, prompts, unit, still, at);
  const reference = (() => {
    const from = (pickTake ?? stills.takes[0])?.payload.from;
    if (from === undefined || isUnknown(from)) return undefined;
    const look = e.lineage.commitmentsAsOf(at).find((c) => c.at === from);
    return look === undefined ? undefined : { label: `${PROJECT.labels[look.unit] ?? look.unit}, approved look`, at: look.candidate };
  })();
  const takeCompare = pickTake === undefined
    ? stills.takes.length === 0 ? "" : `<p class="note">Select a take to score it beside the reference, or to approve it.</p>`
    : `<div class="compare"><figure>${picture(pickTake.at, `take ${n}`)}<figcaption><b>take ${n}</b>${fileOf(unit, pickTake, at) ? ` · ${esc(fileOf(unit, pickTake, at))}` : ""}</figcaption></figure>${reference === undefined ? "" : `<figure>${picture(reference.at, "reference")}<figcaption><b>reference</b> · ${esc(reference.label)}</figcaption></figure>`}</div>${scoreForm("take", pickTake, n, at)}`;
  const takesCard = `<section class="card takes-card"><h2>Takes</h2>${promptLine(unit, still, at, "prompt")}${stills.takes.length + stillMoney.held.length === 0 ? `<div class="empty">Nothing drawn yet.</div>` : `<div class="takes">${tiles(unit, still, stills.takes, stills.approvedAt, stillMoney, at)}</div>`}${bringBar(still, stillMoney, !isUnknown(stillPrompt))}${takeCompare}</section>`;

  // ---- C: clips - their prompt, the clips and reserved slots, the bar, the selected clip beside its still
  const clipPrompt = promptOf(e, prompts, unit, clip, at);
  const approvedStill = stills.takes.find((k) => k.at === stills.approvedAt);
  const clipsCard = isPackage(id) ? "" : `<section class="card clips-card"><h2>Clips</h2>
    ${stills.approvedTake === undefined && clips.takes.length === 0 ? `<p class="note">Clips are drawn from the approved still; approve a take first.</p>` : `
      ${isUnknown(clipPrompt)
        ? `<form class="prompt" data-clip-prompt><label for="c-prompt">What should the clip do?</label><input id="c-prompt" name="prompt" placeholder="e.g. she turns toward the window, slow push-in, 4 seconds" />${noticeIn("clip-prompt")}<button class="act secondary" type="submit">Save the clip prompt</button></form>`
        : promptLine(unit, clip, at, "clip prompt")}
      <div class="spec">drawn from take ${stills.approvedTake ?? "?"}</div>
      ${clips.takes.length + clipMoney.held.length === 0 ? "" : `<div class="takes">${tiles(unit, clip, clips.takes, clips.approvedAt, clipMoney, at)}</div>`}
      ${bringBar(clip, clipMoney, !isUnknown(clipPrompt))}
      ${pickClip === undefined ? "" : `<div class="compare"><figure>${picture(pickClip.at, `clip ${n}`)}<figcaption><b>clip ${n}</b>${fileOf(unit, pickClip, at) ? ` · ${esc(fileOf(unit, pickClip, at))}` : ""}</figcaption></figure>${approvedStill === undefined ? "" : `<figure>${picture(approvedStill.at, "approved still")}<figcaption><b>take ${stills.approvedTake}</b> · the still it was drawn from</figcaption></figure>`}</div>${scoreForm("clip", pickClip, n, at)}`}`}
  </section>`;

  // ---- approve: the still, and the clip
  const approveStill = isUnknown(stills.approved)
    ? stills.approved.kind === "no-subject"
      ? pickTake === undefined
        ? `<div class="row"><span>still</span><span class="none">${stills.takes.length === 0 ? "no takes yet" : "select a take to approve it"}</span></div>`
        : `<div class="row"><span>still</span><b>take ${n} selected</b></div><div style="margin-top:8px"><button class="act" type="button" data-approve="${n}">Approve take ${n}</button></div><div class="note">The diagnostic proposes; approving is yours. New takes can still be brought in afterwards.</div>`
      : `<div class="refused">${said(stills.approved, "")}</div>`
    : `<div class="row"><span>still</span><b>take ${stills.approvedTake ?? "?"} approved</b></div>`;
  const approveClip = isPackage(id) ? "" : stills.approvedTake === undefined
    ? `<div class="row"><span>clip</span><span>${clipWords(e.reach.evaluate(unit, clip, at))}</span></div>`
    : !isUnknown(clips.approved)
      ? `<div class="row"><span>clip</span><b>clip ${clips.approvedTake ?? "?"} approved</b></div>`
      : pickClip === undefined
        ? `<div class="row"><span>clip</span><span class="none">${clips.takes.length === 0 ? "none brought in yet" : "select a clip to approve it"}</span></div>`
        : `<div class="row"><span>clip</span><b>clip ${n} selected</b></div><div style="margin-top:8px"><button class="act" type="button" data-approve-clip="${n}">Approve clip ${n}</button></div>`;

  // ---- the diagnostic (stills), in words, folded away
  const diag = PROJECT.components.map((name) => {
    const d = e.diagnostic.of(unit, still, name).compute(at);
    if (isUnknown(d)) return `<div class="axis"><b>${esc(name)}</b><div class="none">${said(d, "nothing to read yet")}</div></div>`;
    const spread = d.dispersion.kind === "dispersion" ? `spread ${num(d.dispersion.spread)} across ${d.dispersion.n} scored takes` : withheld(d.dispersion);
    const loc = d.location.kind === "location" ? `${esc(d.location.classification)} the bar - average ${num(d.location.centre)} against ${num(d.location.bar.theta)}` : withheld(d.location);
    return `<div class="axis"><b>${esc(name)}</b><div class="row"><span>how alike</span><span>${spread}</span></div><div class="row"><span>against the bar</span><span>${loc}</span></div></div>`;
  }).join("");
  const ratio = e.ratio.of(unit).compute(at);

  return `${header}${notice?.at === "page" ? `<p class="notice">${notice.text}</p>` : ""}
  <main class="cell">
    <div class="col-main">${takesCard}${clipsCard}</div>
    <div class="col-side">
      <section class="card approve"><h2>Approve</h2>${approveStill}${approveClip}</section>
      <section class="card budget"><h2>Budget</h2>${moneySection(unit, still, stillMoney, at)}${isPackage(id) ? "" : moneySection(unit, clip, clipMoney, at)}
        <div class="row total"><span>takes so far, every authorization</span><span>${isUnknown(ratio) ? said(ratio, "") : ratio.counts.map((k) => `${esc(word(k.currency))}s ${k.count}`).join(" · ")}</span></div>
        <p class="charge">This app never charges you. Authorizing sets how many stills or clips may be brought in or made; reserving holds one before you make it. You pay wherever it is made.</p></section>
      <section class="card diag"><details><summary><h2>Diagnostic</h2><span class="note">how alike the scored takes are, and where they sit against the bar - it proposes, never decides</span></summary>${diag}</details></section>
    </div>
  </main>`;
}

/** C6 + B + I: every cell on one row - the approval, both budgets with reserved draws, every authorization as typed. */
function boardView(): string {
  const at = e.record.top();
  const rows = Object.keys(PROJECT.units).map((id) => {
    const unit = e.registry.unit(id);
    if (isUnknown(unit)) return `<tr><td colspan="5">${esc(id)}: ${said(unit, "not registered")}</td></tr>`;
    const stills = takesOf(e, unit, still, at);
    const clips = takesOf(e, unit, clip, at);
    const s = moneyOf(e, unit, still, at);
    const c = moneyOf(e, unit, clip, at);
    const approved = stills.approvedTake === undefined
      ? `<span class="none">${stills.takes.length === 0 ? "nothing drawn yet" : `no take yet · ${plural(stills.takes.length, "take")} to choose from`}</span>`
      : `take ${stills.approvedTake}`;
    const clipCell = isPackage(id)
      ? `<span class="none">reference only</span>`
      : `${stills.approvedTake === undefined ? clipWords(e.reach.evaluate(unit, clip, at)) : moneyWords(c, word(clip))}${c.held.length ? `<div class="held">${c.held.length} reserved</div>` : ""}${clips.approvedTake === undefined ? "" : `<div>clip ${clips.approvedTake} approved</div>`}`;
    const est = [...s.history, ...c.history].map((a) => `<div>${esc(a.scope.payload.estimate)} <span class="none">· ${a.drawn} drawn${a.inForce ? "" : " · replaced"}</span></div>`).join("") || `<span class="none">-</span>`;
    return `<tr data-href="#${encodeURIComponent(id)}">
      <td data-h="Cell"><a href="#${encodeURIComponent(id)}"><b>${esc(PROJECT.labels[id] ?? id)}</b></a><div class="none">${levelWords(unit, at)}</div></td>
      <td data-h="Approved"><span>${approved}</span></td>
      <td data-h="Stills"><span>${moneyWords(s, word(still))}${s.held.length ? `<div class="held">${s.held.length} reserved</div>` : ""}</span></td>
      <td data-h="Clips"><span>${clipCell}</span></td>
      <td data-h="Authorizations, as typed" class="est"><span>${est}</span></td>
    </tr>`;
  }).join("");
  return `<header><h1>Scene board</h1><span class="meta">${esc(PROJECT.title)}</span><span class="meta">${plural(Object.keys(PROJECT.units).length, "cell")}</span></header>
  ${notice?.at === "page" ? `<p class="notice">${notice.text}</p>` : ""}
  <main class="board"><section class="card">
    <table><thead><tr><th>Cell</th><th>Approved</th><th>Stills</th><th>Clips</th><th>Authorizations, as typed</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="charge">Every authorization stays listed, replaced ones too. Money isn't totalled here: the app keeps each estimate as it was typed - no prices and no charges. This app never charges you.</p>
  </section></main>`;
}

function render(): void {
  const { id } = route();
  const ids = Object.keys(PROJECT.units);
  const rail = [`<a href="#board" class="${id === undefined ? "active" : ""}">Scene board</a>`, ...ids.map((c) => `<a href="#${encodeURIComponent(c)}" class="${c === id ? "active" : ""}">${esc(PROJECT.labels[c] ?? c)}</a>`)].join("");
  const picker = [`<option value="board"${id === undefined ? " selected" : ""}>Scene board</option>`, ...ids.map((c) => `<option value="${esc(c)}"${c === id ? " selected" : ""}>${esc(PROJECT.labels[c] ?? c)}</option>`)].join("");
  const unit = id === undefined ? undefined : e.registry.unit(id);
  const body = e.record.empty()
    ? `<header><h1>${esc(PROJECT.title)}</h1></header><div class="empty"><p>Nothing is recorded for this scene yet.</p><button class="act" type="button" data-demo>Start with the example scene</button><p class="note">The example records a made-up scene through the engine: Mara's approved look, two stills reserved for 3.1, six overnight takes and a clip for 3.2, and takes brought in for 3.3. Its pictures are drawings.</p>${notice?.at === "page" ? `<p class="notice">${notice.text}</p>` : ""}</div>`
    : unit === undefined ? boardView() : isUnknown(unit) ? `<div class="empty">${said(unit, "There is no such cell.")}</div>` : cellView(id as string, unit);
  app.innerHTML = `<div class="shell">
    <nav class="rail"><div class="brand">Review Theater</div><div class="scene">${esc(PROJECT.title)}</div>${rail}${standingLine()}</nav>
    <div class="page">
      <div class="topbar"><b>Review Theater</b><select data-cell aria-label="cell">${picker}</select></div>
      <div class="topstat">${standingLine()}</div>
      ${body}
    </div>
  </div>`;
}

/** C5 + B: each file, in order, fills a reserved draw or becomes a new one; the first refusal stops the rest, and every file is named. */
async function bringFiles(currency: Currency, files: readonly File[]): Promise<void> {
  const unit = e.registry.unit(route().id ?? "") as Unit;
  const done: string[] = [];
  let stopped: string | undefined;
  for (const [i, file] of files.entries()) {
    const rest = files.slice(i + 1).map((f) => esc(f.name));
    let ready: { readonly blob: Blob; readonly sha256: string };
    try {
      ready = await prepare(file);
    } catch {
      stopped = `${esc(file.name)} isn't a file this browser can read.`;
      break;
    }
    let take: Candidate | UnknownValue;
    try {
      take = bringIn(e, prompts, media, unit, currency, { name: file.name, ...ready }, "HUMAN");
    } catch (err) {
      if (err instanceof StaleRecord) await e.record.refresh();
      stopped = `${esc(file.name)} wasn't recorded: ${err instanceof StaleRecord ? "another device changed the scene; try again" : "the record couldn't be reached"}.`;
      break;
    }
    if (isUnknown(take)) {
      stopped = `${esc(file.name)}${rest.length ? ` and ${rest.join(", ")}` : ""} not brought in: ${said(take, "none authorized")}`;
      break;
    }
    done.push(esc(file.name));
  }
  const got = done.length === 0 ? "Nothing brought in." : `Brought in ${done.join(", ")}.`;
  notice = { at: `bring-${currency}`, text: stopped === undefined ? got : `${got} ${stopped}`, ok: stopped === undefined };
  render();
}

app.addEventListener("click", (ev) => {
  const t = ev.target as HTMLElement;
  const unitNow = (): Unit => e.registry.unit(route().id ?? "") as Unit;
  if (t.closest("[data-refresh]")) {
    void catchUp();
  } else if (t.closest("[data-demo]")) {
    void exampleScene(e, prompts, media).then((r) => {
      notice = r === "RECORDED" ? undefined : { at: "page", text: `The example stopped: ${said(r, "")}` };
      render();
    }, (err: unknown) => {
      notice = { at: "page", text: err instanceof StaleRecord ? "Another device changed the record while the example was being written; it stopped part-way." : `The example stopped: ${esc((err as Error).message)}` };
      void e.record.refresh().then(render);
    });
  } else if (t.closest("[data-approve]") || t.closest("[data-approve-clip]")) {
    const isClip = t.closest("[data-approve-clip]") !== null;
    const n = Number(t.closest<HTMLElement>(isClip ? "[data-approve-clip]" : "[data-approve]")?.dataset[isClip ? "approveClip" : "approve"]);
    act(() => {
      const k = takesOf(e, unitNow(), isClip ? clip : still, e.record.top()).takes[n - 1];
      if (k !== undefined) e.commitments.commit(k, "HUMAN");
      notice = undefined;
      render();
    });
  } else if (t.closest("[data-reserve]")) {
    const currency = e.order.currencies().find((c) => c === t.closest<HTMLElement>("[data-reserve]")?.dataset["reserve"]);
    if (currency === undefined) return;
    act(() => {
      const d = reserve(e, unitNow(), currency, { source: "reserved" }, "HUMAN");
      notice = isUnknown(d) ? { at: `reserve-${currency}`, text: `Not reserved: ${said(d, "none authorized")}` } : { at: `reserve-${currency}`, text: "Reserved - bring its file in when it's made.", ok: true };
      render();
    });
  } else if (t.closest("[data-authorize-open], [data-authorize-cancel]")) {
    const open = t.closest<HTMLElement>("[data-authorize-open]")?.dataset["authorizeOpen"];
    authorizing = open === undefined ? undefined : e.order.currencies().find((c) => c === open);
    notice = undefined;
    render();
  } else if (t.closest("button.take")) {
    const m = /^(c?)(\d+)$/.exec(t.closest<HTMLElement>("button.take")?.dataset["pick"] ?? "");
    selected = m === null ? undefined : { kind: m[1] === "c" ? "clip" : "take", n: Number(m[2]) };
    notice = undefined;
    render();
  } else {
    const row = t.closest<HTMLElement>("tr[data-href]");
    if (row !== null && t.closest("a") === null) location.hash = row.dataset["href"] ?? "";
  }
});

app.addEventListener("change", (ev) => {
  const t = ev.target as HTMLElement;
  if (t instanceof HTMLSelectElement && t.dataset["cell"] !== undefined) location.hash = encodeURIComponent(t.value);
  if (t instanceof HTMLInputElement && t.dataset["bring"] !== undefined && t.files !== null) {
    const currency = e.order.currencies().find((c) => c === t.dataset["bring"]);
    if (currency !== undefined) void bringFiles(currency, Array.from(t.files));
  }
});
app.addEventListener("dragover", (ev) => {
  const zone = (ev.target as HTMLElement).closest("[data-drop]");
  if (zone === null) return;
  ev.preventDefault();
  zone.classList.add("over");
});
app.addEventListener("dragleave", (ev) => (ev.target as HTMLElement).closest("[data-drop]")?.classList.remove("over"));
app.addEventListener("drop", (ev) => {
  const zone = (ev.target as HTMLElement).closest<HTMLElement>("[data-drop]");
  if (zone === null) return;
  ev.preventDefault();
  const currency = e.order.currencies().find((c) => c === zone.dataset["drop"]);
  if (currency !== undefined) void bringFiles(currency, Array.from(ev.dataTransfer?.files ?? []));
});

app.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const form = ev.target as HTMLFormElement;
  const unit = e.registry.unit(route().id ?? "") as Unit;
  const data = new FormData(form);
  act(() => {
    const at = e.record.top();
    if (form.dataset["clipPrompt"] !== undefined) {
      const text = (data.get("prompt") ?? "").toString().trim();
      if (text === "") {
        notice = { at: "clip-prompt", text: "Write what the clip should do first." };
        return render();
      }
      const stillPrompt = promptOf(e, prompts, unit, still, at);
      const characters = isUnknown(stillPrompt) || stillPrompt.inputs === undefined ? [] : ((stillPrompt.inputs["characters"] as readonly string[] | undefined) ?? []);
      writePrompt(e, prompts, unit, clip, { prompt: text, characters: [...characters] });
      notice = undefined;
      return render();
    }
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
    const m = /^(c?)(\d+)$/.exec(form.dataset["score"] ?? "");
    if (m === null) return;
    const kind = m[1] === "c" ? "clip" : "take";
    const k = takesOf(e, unit, kind === "clip" ? clip : still, at).takes[Number(m[2]) - 1];
    if (k === undefined) return;
    const entries: Record<string, ComponentEntry> = {};
    for (const c of PROJECT.components) {
      const raw = (data.get(c) ?? "").toString().trim();
      const value: ComponentValue | UnknownValue = raw === "" ? dischargeable("a later look") : score(Number(raw));
      if (isUnknown(value)) {
        notice = { at: `score-${kind}`, text: `${esc(c)}: ${said(value, "")}` };
        return render();
      }
      entries[c] = { value, author: "HUMAN" };
    }
    const o = e.observations.observe(k, entries, "HUMAN", e.record.top());
    notice = isUnknown(o) ? { at: `score-${kind}`, text: `Not recorded: ${said(o, "")}` } : { at: `score-${kind}`, text: "Recorded in the scene's record.", ok: true };
    render();
  });
});

window.addEventListener("hashchange", () => {
  selected = route().pick;
  notice = undefined;
  authorizing = undefined;
  render();
});
selected = route().pick;
render();
void catchUp();
setInterval(() => void catchUp(), 15_000);
