/**
 * Review Theater. Batch 1: the shell and one flow (review, score, read the diagnostic, approve).
 * Batch 2: the budget card. Batch 3: the scene board, bringing takes in with their images, budgeting
 * in plain terms, the engine's answers in words. Batch 4: the scene's record on every device, money
 * you can follow and reserving before you make, clips in. Batch 5: open it anywhere and keep it safe
 * (H), honest counts and reservations you can trust (A), safer approve (B), small fixes (I). Every
 * value is the library's answer and every act goes through it; refusals are shown as the engine
 * names them, in words, code beside.
 */
import { isUnknown, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import type { Candidate, Commitment, DrawContext } from "../../src/facts/index.js";
import { dischargeable, score, type ComponentEntry, type ComponentValue } from "../../src/observation/index.js";
import { bringIn, fill, reserve, switchApproval, undoApproval, writePrompt } from "./acts.js";
import { exampleScene } from "./demo.js";
import { engine } from "./engine.js";
import { PROJECT } from "./project.js";
import { moneyOf, promptOf, takesOf, type Money } from "./reads.js";
import { StaleRecord, connect, prepare, type Standing } from "./stores.js";
import { byWords, clipWords, countWords, esc, historyWords, num, plural, reservedWords, said, scoreWords, withheld } from "./words.js";

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
/** B: an act waiting for its confirmation, or an undo waiting with its consequence shown. */
type Pending =
  | { readonly kind: "approve"; readonly currency: Currency; readonly n: number }
  | { readonly kind: "switch"; readonly n: number }
  | { readonly kind: "authorize"; readonly currency: Currency; readonly ceiling: string; readonly estimate: string }
  | { readonly kind: "undo"; readonly currency: Currency };
let pending: Pending | undefined;
/** H: where this device stands against the record, and what the service says about itself. */
let standing: { readonly info: Standing | undefined; readonly asOf: Date; readonly reached: boolean } = { info: undefined, asOf: new Date(), reached: true };
/** B: this device's view - everything, or reviewing only (no Approve, Budget, Reserve or bring-in). A layout choice, not a lock. */
const VIEW = "frame-gate:view";
let reviewing = (() => {
  try {
    return localStorage.getItem(VIEW) === "reviewing";
  } catch {
    return false;
  }
})();

const word = (c: Currency): string => PROJECT.classLabels[c] ?? c;
const noticeIn = (at: string, wide = true): string =>
  notice?.at === at ? `<div class="${notice.ok ? "done" : "refused"}"${wide ? ` style="grid-column:1/-1"` : ""}>${notice.text}</div>` : "";
const isPackage = (id: string): boolean => "package" in ((PROJECT.units as Readonly<Record<string, Readonly<Record<string, unknown>>>>)[id] ?? {});
const clock = (d: Date): string => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
/** When a fact reached the record, as the service noted it - with the day when it was not today. */
const when = (at: RecordHeight): string => {
  const d = e.record.when(at);
  if (d === undefined) return "";
  const today = new Date().toDateString() === d.toDateString();
  return today ? clock(d) : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${clock(d)}`;
};

/** The address: #board, #devices, #<cell>, #<cell>/<take n> or #<cell>/c<clip n>. */
const route = (): { readonly id: string | undefined; readonly page: "board" | "devices" | "cell"; readonly pick: typeof selected } => {
  const [id, part] = decodeURIComponent(location.hash.slice(1)).split("/");
  const m = /^(c?)(\d+)$/.exec(part ?? "");
  const page = id === undefined || id === "" || id === "board" ? "board" : id === "devices" ? "devices" : "cell";
  return { id: page === "cell" ? id : undefined, page, pick: m === null ? undefined : { kind: m[1] === "c" ? "clip" : "take", n: Number(m[2]) } };
};

/** An act against the shared record: if another device appended first, nothing was written - catch up, and say so. */
function act(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    pending = undefined;
    if (err instanceof StaleRecord) {
      notice = { at: "page", text: "Another device changed this scene a moment ago. This screen is up to date now - please do that again." };
      void e.record.refresh().then(render);
      return;
    }
    notice = { at: "page", text: `Nothing was recorded: the record couldn't be reached (${esc((err as Error).message)}).` };
    render();
  }
}

// ---- H: the record's standing, in words that hold on any device
const standingLine = (): string => {
  const others = (standing.info?.devices ?? []).filter((d) => d !== "the host computer");
  return `<div class="recstat"><b>This scene's record</b><span>on the host computer${others.length ? ` · seen from ${others.map(esc).join(", ")}` : ""}</span><span>${standing.reached ? `as of ${clock(standing.asOf)} · up to date` : `<span class="refused">host offline since ${clock(standing.asOf)}</span>`}</span><span><button class="link" type="button" data-refresh>refresh</button> · <a class="link" href="#devices">open on your phone</a></span></div>`;
};
const viewPicker = (): string =>
  `<label class="viewpick">show <select data-view><option value="everything"${reviewing ? "" : " selected"}>everything</option><option value="reviewing"${reviewing ? " selected" : ""}>reviewing only</option></select></label>`;
async function catchUp(): Promise<void> {
  try {
    const info = await conn.status();
    const arrived = info.height > e.record.top() ? await e.record.refresh() : 0;
    standing = { info, asOf: new Date(), reached: true };
    const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
    if ((arrived > 0 || route().page === "devices") && !typing && pending === undefined) return render();
  } catch {
    if (standing.reached) standing = { ...standing, reached: false };
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

// ---- takes and clips as tiles; each reservation as a slot its file can be dropped on (A)
function tiles(unit: Unit, currency: Currency, list: readonly Candidate[], approvedAt: RecordHeight | undefined, money: Money, at: RecordHeight): string {
  const kind = currency === clip ? "clip" : "take";
  const undone = new Set(e.invalidations.invalidatedAsOf(at));
  const shown = list.map((k, i) => {
    const n = i + 1;
    const o = e.observations.observationOf(k, at);
    const rows = isUnknown(o) ? `<span class="none" style="grid-column:1/-1">not scored yet</span>` : o.payload.components.map((c) => `<span>${esc(c.name)}</span><span>${scoreWords(c.value)}</span>`).join("");
    const file = fileOf(unit, k, at);
    const cls = ["take", selected?.kind === kind && selected.n === n ? "selected" : "", k.at === approvedAt ? "approved" : ""].join(" ");
    const by = k.author === "HUMAN" ? "" : `<span class="via">by ${byWords(k.author)}</span>`;
    const from = k.payload.from;
    const orphan = currency === clip && !isUnknown(from) && undone.has(from) ? `<span class="via">from an undone approval</span>` : "";
    return `<button class="${cls}" type="button" data-pick="${kind === "clip" ? "c" : ""}${n}">${picture(k.at, `${kind} ${n}`)}<div class="cap"><b>${kind} ${n}</b><span class="file">${[file, when(k.at)].filter((x) => x).map((x) => esc(x)).join(" · ")}</span>${by}${orphan}${k.at === approvedAt ? `<span class="badge">approved</span>` : ""}</div><div class="scores">${rows}</div></button>`;
  }).join("");
  const accept = currency === clip ? "video/*,image/*" : "image/*";
  const slots = reviewing ? "" : money.held.map((d) => `<label class="take slot" data-drop="${esc(currency)}" data-slot="${d.at}"><input type="file" accept="${accept}" data-fill="${d.at}" data-currency="${esc(currency)}" hidden /><b>reserved ${esc(word(currency))}</b><span class="note">by ${byWords(d.author)}${when(d.at) ? ` · ${esc(when(d.at))}` : ""}</span><span class="note">drop its file here</span></label>`).join("");
  return shown + slots;
}

/** C5 + A: the bar that brings files in - into reservations a person made first, then new draws while the authorization allows. */
function bringBar(currency: Currency, money: Money, hasPrompt: boolean): string {
  if (reviewing) return "";
  const w = word(currency);
  const input = `<input type="file" accept="${currency === clip ? "video/*,image/*" : "image/*"}" multiple data-bring="${esc(currency)}" hidden />`;
  if (!hasPrompt) return `<div class="drop off"><b>Bring in ${esc(w)}s</b><span>${currency === clip ? "Write the clip prompt first." : "Takes are drawn under a prompt, and this cell has none yet."}</span></div>`;
  if (isUnknown(money.governing)) return `<div class="drop off"><b>Bring in ${esc(w)}s</b><span>Authorize ${esc(w)}s first - each file you bring in counts as one.</span>${noticeIn(`bring-${currency}`, false)}</div>`;
  const mine = money.held.filter((d) => d.author === "HUMAN").length;
  const free = isUnknown(money.free) ? 0 : money.free;
  if (mine > 0 || money.next === "WITHIN") {
    const how = mine > 0
      ? `the first ${mine === 1 ? "fills the reservation" : `${mine} fill the reservations`} a person made${free > 0 ? `, then ${free} more can come in` : ""}`
      : `each becomes the next ${esc(w)}`;
    return `<label class="drop" data-drop="${esc(currency)}">${input}<b>+ Bring in ${esc(w)}s</b><span>drop files here, or choose them - ${how}. Drop on a reserved slot to fill that one.</span>${noticeIn(`bring-${currency}`, false)}</label>`;
  }
  return `<div class="drop off"><b>Bring in ${esc(w)}s</b><span>${money.held.length ? "drop a file on a reserved slot to fill it, or " : ""}authorize more ${esc(w)}s to bring in more</span>${noticeIn(`bring-${currency}`, false)}</div>`;
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

function authorizeForm(unit: Unit, currency: Currency, at: RecordHeight, money: Money): string {
  const form = e.forms.build(unit, currency, at);
  const counts = isUnknown(form) ? said(form, "") : form.ratio.counts.map((c) => `${esc(word(c.currency))}s ${c.count}`).join(" · ");
  const free = money.free;
  const dropped = isUnknown(free) ? "" : free === 0
    ? " It replaces the current authorization, which has nothing free."
    : ` The ${free} free now ${free === 1 ? "is" : "are"} dropped - a new authorization replaces the current one.`;
  return `<form class="authorize" data-authorize="${esc(currency)}">
    <b style="grid-column:1/-1">Authorize ${isUnknown(money.governing) ? "" : "more "}${esc(word(currency))}s</b>
    <label for="a-ceiling">how many${isUnknown(money.governing) ? "" : " more, from now"}</label><input id="a-ceiling" name="ceiling" inputmode="numeric" placeholder="${esc(word(currency))}s" />
    <label for="a-estimate">estimate, as typed</label><input id="a-estimate" name="estimate" placeholder="e.g. a vendor quote" />
    <div class="preview" style="grid-column:1/-1">After authorizing, you'll have exactly the number you enter.${dropped}${money.held.length ? ` Reserved slots stay - their files can still come in.` : ""}<div class="counts">takes so far, shown with every authorization: ${counts}</div></div>
    ${noticeIn("authorize")}<span></span><div class="buttons"><button class="act" type="submit">Authorize…</button><button class="act secondary" type="button" data-authorize-cancel>Cancel</button></div>
  </form>`;
}

/** A: one currency's money - made / reserved / free, every reservation with who and when, every authorization, reserve and authorize. */
function moneySection(unit: Unit, currency: Currency, m: Money, at: RecordHeight): string {
  const w = word(currency);
  const reserveRow = isUnknown(m.governing)
    ? ""
    : m.next === "WITHIN"
      ? `<div class="reserve"><button class="act secondary" type="button" data-reserve="${esc(currency)}">Reserve a ${esc(w)}</button><span class="note">holds one from this authorization now, before you make it in Grok - its file is never refused later. A reservation can't be given back.</span>${noticeIn(`reserve-${currency}`, false)}</div>`
      : `<div class="note">${m.next === undefined ? "" : said(m.next, "")} - authorize more to reserve or bring in more.</div>`;
  const reachNote = currency === clip && isUnknown(m.governing)
    ? (() => {
        const r = e.reach.evaluate(unit, clip, at);
        return `<div class="note">${!isUnknown(r) && r.verdict === "reachable" ? "This cell's still is approved: clips can be authorized and made." : "A clip can start once a still is approved; you can authorize clips before that."}</div>`;
      })()
    : "";
  const action = authorizing === currency
    ? authorizeForm(unit, currency, at, m)
    : `<div style="margin-top:6px"><button class="act secondary" type="button" data-authorize-open="${esc(currency)}">Authorize ${isUnknown(m.governing) ? "" : "more "}${esc(w)}s…</button></div>`;
  return `<div class="sub">${esc(w)}s</div><div class="row"><span>this authorization</span><span>${countWords(m, w)}</span></div>${reservedWords(m, w, when)}${historyWords(m)}${reachNote}${reserveRow}${action}`;
}

/** B: what undoing an approval would undo, as the library derives it (InvalidationScope.of), in words. */
function consequence(unit: Unit, approval: Commitment, label: string, at: RecordHeight): string {
  const scope = e.invalidationScope.of(approval.at).compute(at);
  const clips = scope.candidates.filter((c) => c.currency === clip).length;
  // the closure names every approval ever made of those takes (R-46); the person is told about the ones still in force
  const undone = new Set(e.invalidations.invalidatedAsOf(at));
  const approvals = scope.commitments.filter((c) => !undone.has(c.at)).length;
  const also = scope.count === 0 && approvals === 0
    ? "Nothing was made from it."
    : `This also undoes what was made from it: ${plural(scope.count, "take")} drawn from it${clips ? ` (${plural(clips, "clip")})` : ""}${approvals ? `, and ${plural(approvals, "approval")} of those` : ""}.`;
  return `<div class="consequence"><b>Undo ${esc(label)}'s approval?</b><p>${also} The record keeps all of it; nothing is deleted.</p>
    <div class="buttons"><button class="act danger" type="button" data-confirm>Undo the approval</button><button class="act secondary" type="button" data-cancel>Keep it</button></div></div>`;
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

  // ---- takes
  const stillPrompt = promptOf(e, prompts, unit, still, at);
  const reference = (() => {
    const from = (pickTake ?? stills.takes[0])?.payload.from;
    if (from === undefined || isUnknown(from)) return undefined;
    const look = e.lineage.commitmentsAsOf(at).find((c) => c.at === from);
    return look === undefined ? undefined : { label: `${PROJECT.labels[look.unit] ?? look.unit}, approved look`, at: look.candidate };
  })();
  const takeCompare = pickTake === undefined
    ? stills.takes.length === 0 ? "" : `<p class="note">Select a take to score it beside the reference${reviewing ? "" : ", or to approve it"}.</p>`
    : `<div class="compare"><figure>${picture(pickTake.at, `take ${n}`)}<figcaption><b>take ${n}</b>${fileOf(unit, pickTake, at) ? ` · ${esc(fileOf(unit, pickTake, at))}` : ""}</figcaption></figure>${reference === undefined ? "" : `<figure>${picture(reference.at, "reference")}<figcaption><b>reference</b> · ${esc(reference.label)}</figcaption></figure>`}</div>${scoreForm("take", pickTake, n, at)}`;
  const takesCard = `<section class="card takes-card"><h2>Takes</h2>${promptLine(unit, still, at, "prompt")}${stills.takes.length + stillMoney.held.length === 0 ? `<div class="empty">Nothing drawn yet.</div>` : `<div class="takes">${tiles(unit, still, stills.takes, stills.approvedAt, stillMoney, at)}</div>`}${bringBar(still, stillMoney, !isUnknown(stillPrompt))}${takeCompare}</section>`;

  // ---- clips
  const clipPrompt = promptOf(e, prompts, unit, clip, at);
  const approvedStill = stills.takes.find((k) => k.at === stills.approvedAt);
  const clipsCard = isPackage(id) ? "" : `<section class="card clips-card"><h2>Clips</h2>
    ${stills.approvedTake === undefined && clips.takes.length === 0 ? `<p class="note">Clips are drawn from the approved still; approve a take first.</p>` : `
      ${isUnknown(clipPrompt)
        ? reviewing ? "" : `<form class="prompt" data-clip-prompt><label for="c-prompt">What should the clip do?</label><input id="c-prompt" name="prompt" placeholder="e.g. she turns toward the window, slow push-in, 4 seconds" />${noticeIn("clip-prompt")}<button class="act secondary" type="submit">Save the clip prompt</button></form>`
        : promptLine(unit, clip, at, "clip prompt")}
      ${stills.approvedTake === undefined ? "" : `<div class="spec">drawn from take ${stills.approvedTake}</div>`}
      ${clips.takes.length + clipMoney.held.length === 0 ? "" : `<div class="takes">${tiles(unit, clip, clips.takes, clips.approvedAt, clipMoney, at)}</div>`}
      ${bringBar(clip, clipMoney, !isUnknown(clipPrompt))}
      ${pickClip === undefined ? "" : `<div class="compare"><figure>${picture(pickClip.at, `clip ${n}`)}<figcaption><b>clip ${n}</b>${fileOf(unit, pickClip, at) ? ` · ${esc(fileOf(unit, pickClip, at))}` : ""}</figcaption></figure>${approvedStill === undefined ? "" : `<figure>${picture(approvedStill.at, "approved still")}<figcaption><b>take ${stills.approvedTake}</b> · the still it was drawn from</figcaption></figure>`}</div>${scoreForm("clip", pickClip, n, at)}`}`}
  </section>`;

  // ---- approve (B): confirm before approving; undo showing its consequence first; switch a clip in one step
  const stillApproval = isUnknown(stills.approved) ? undefined : stills.approved;
  const clipApproval = isUnknown(clips.approved) ? undefined : clips.approved;
  const approveStill = stillApproval !== undefined
    ? `<div class="row"><span>still</span><b>take ${stills.approvedTake ?? "?"} approved</b></div>${pending?.kind === "undo" && pending.currency === still ? consequence(unit, stillApproval, `take ${stills.approvedTake}`, at) : `<div class="undo"><button class="link" type="button" data-undo="${esc(still)}">Undo take ${stills.approvedTake}'s approval…</button></div>`}`
    : !isUnknown(stills.approved) || stills.approved.kind !== "no-subject"
      ? `<div class="refused">${isUnknown(stills.approved) ? said(stills.approved, "") : ""}</div>`
      : pickTake === undefined
        ? `<div class="row"><span>still</span><span class="none">${stills.takes.length === 0 ? "no takes yet" : "select a take to approve it"}</span></div>`
        : `<div class="row"><span>still</span><b>take ${n} selected</b></div><div style="margin-top:8px"><button class="act" type="button" data-approve="${n}">Approve take ${n}…</button></div><div class="note">The diagnostic proposes; approving is yours. New takes can still be brought in afterwards.</div>`;
  const approveClip = isPackage(id) ? "" : stillApproval === undefined
    ? `<div class="row"><span>clip</span><span>${clipWords(e.reach.evaluate(unit, clip, at))}</span></div>`
    : clipApproval !== undefined
      ? `<div class="row"><span>clip</span><b>clip ${clips.approvedTake ?? "?"} approved</b></div>${pickClip !== undefined && pickClip.at !== clipApproval.payload.candidate
          ? `<div class="switch"><b>Switch to clip ${n}?</b><span class="note">Undoes clip ${clips.approvedTake}'s approval and approves clip ${n}, in one step.</span><div class="buttons"><button class="act" type="button" data-switch="${n}">Switch to clip ${n}…</button></div></div>`
          : pending?.kind === "undo" && pending.currency === clip ? consequence(unit, clipApproval, `clip ${clips.approvedTake}`, at) : `<div class="undo"><button class="link" type="button" data-undo="${esc(clip)}">Undo clip ${clips.approvedTake}'s approval…</button></div>`}`
      : pickClip === undefined
        ? `<div class="row"><span>clip</span><span class="none">${clips.takes.length === 0 ? "none brought in yet" : `no clip approved yet · ${plural(clips.takes.length, "clip")} to choose from`}</span></div>`
        : `<div class="row"><span>clip</span><b>clip ${n} selected</b></div><div style="margin-top:8px"><button class="act" type="button" data-approve-clip="${n}">Approve clip ${n}…</button></div>`;

  // ---- the diagnostic (stills), in words, folded away
  const diag = PROJECT.components.map((name) => {
    const d = e.diagnostic.of(unit, still, name).compute(at);
    if (isUnknown(d)) return `<div class="axis"><b>${esc(name)}</b><div class="none">${said(d, "nothing to read yet")}</div></div>`;
    const spread = d.dispersion.kind === "dispersion" ? `spread ${num(d.dispersion.spread)} across ${d.dispersion.n} scored takes` : withheld(d.dispersion);
    const loc = d.location.kind === "location" ? `${esc(d.location.classification)} the bar - average ${num(d.location.centre)} against ${num(d.location.bar.theta)}` : withheld(d.location);
    return `<div class="axis"><b>${esc(name)}</b><div class="row"><span>how alike</span><span>${spread}</span></div><div class="row"><span>against the bar</span><span>${loc}</span></div></div>`;
  }).join("");
  const ratio = e.ratio.of(unit).compute(at);
  const side = reviewing
    ? ""
    : `<section class="card approve"><h2>Approve</h2>${approveStill}${approveClip}</section>
      <section class="card budget"><h2>Budget</h2>${moneySection(unit, still, stillMoney, at)}${isPackage(id) ? "" : moneySection(unit, clip, clipMoney, at)}
        <div class="row total"><span>takes so far, every authorization</span><span>${isUnknown(ratio) ? said(ratio, "") : ratio.counts.map((k) => `${esc(word(k.currency))}s ${k.count}`).join(" · ")}</span></div>
        <p class="charge">This app never charges you. A reserved still or clip counts against its authorization from the moment you reserve it; you pay Grok when you make it. Re-authorizing keeps reserved slots.</p></section>`;

  return `${header}${notice?.at === "page" ? `<p class="notice">${notice.text}</p>` : ""}
  <main class="cell">
    <div class="col-main">${takesCard}${clipsCard}</div>
    <div class="col-side">${side}
      <section class="card diag"><details><summary><h2>Diagnostic</h2><span class="note">how alike the scored takes are, and where they sit against the bar - it proposes, never decides</span></summary>${diag}</details></section>
    </div>
  </main>${sheet(unit, stills.takes, clips.takes, at)}`;
}

/** B: the confirm sheet for an act waiting on its confirmation - it says what the act does, never "for everyone". */
function sheet(unit: Unit, takes: readonly Candidate[], clips: readonly Candidate[], at: RecordHeight): string {
  if (pending === undefined || pending.kind === "undo") return "";
  const label = PROJECT.labels[unit] ?? unit;
  const box = (title: string, body: string, image: string, yes: string): string =>
    `<div class="dialog" role="dialog" aria-label="${esc(title)}"><div class="sheet"><b>${esc(title)}</b><p>${body}</p>${image}${noticeIn("sheet")}<div class="buttons"><button class="act secondary" type="button" data-cancel>Not now</button><button class="act" type="button" data-confirm>${esc(yes)}</button></div></div></div>`;
  if (pending.kind === "approve") {
    const k = (pending.currency === clip ? clips : takes)[pending.n - 1];
    const what = pending.currency === clip ? `clip ${pending.n}` : `take ${pending.n}`;
    const body = pending.currency === clip ? `It becomes ${esc(label)}'s approved clip.` : `It becomes the still ${esc(label)}'s clips are drawn from.`;
    return box(`Approve ${what} for ${label}?`, `${body} You can undo it later - undoing shows first what it would undo.`, k === undefined ? "" : picture(k.at, what), `Approve ${what}`);
  }
  if (pending.kind === "switch") {
    const k = clips[pending.n - 1];
    return box(`Switch to clip ${pending.n}?`, "The clip approved now is un-approved and this one approved, in one step. Both stay in the record.", k === undefined ? "" : picture(k.at, `clip ${pending.n}`), `Switch to clip ${pending.n}`);
  }
  const m = moneyOf(e, unit, pending.currency, at);
  const w = word(pending.currency);
  const drop = isUnknown(m.free) || m.free === 0 ? "" : ` The ${m.free} free now ${m.free === 1 ? "is" : "are"} dropped.`;
  return box(`Authorize ${pending.ceiling} ${isUnknown(m.governing) ? "" : "more "}${w}s for ${label}?`, `After this you'll have ${esc(pending.ceiling)} free.${drop}${m.held.length ? " Reserved slots stay." : ""} Estimate, as typed: ${esc(pending.estimate || "none given")}.`, "", `Authorize ${pending.ceiling} ${w}s`);
}

/** C6 + A + I: every cell on one row - ready to cut, both budgets with every reservation, every authorization as typed. */
function boardView(): string {
  const at = e.record.top();
  const rows = Object.keys(PROJECT.units).map((id) => {
    const unit = e.registry.unit(id);
    if (isUnknown(unit)) return `<tr><td colspan="5">${esc(id)}: ${said(unit, "not registered")}</td></tr>`;
    const stills = takesOf(e, unit, still, at);
    const clips = takesOf(e, unit, clip, at);
    const s = moneyOf(e, unit, still, at);
    const c = moneyOf(e, unit, clip, at);
    const ready = isPackage(id)
      ? `look ${stills.approvedTake === undefined ? "-" : "✓"}`
      : `still ${stills.approvedTake === undefined ? "-" : "✓"} · clip ${clips.approvedTake === undefined ? "-" : "✓"}`;
    const pick = stills.approvedTake === undefined ? `<div class="none">${stills.takes.length === 0 ? "nothing drawn yet" : `no take yet · ${plural(stills.takes.length, "take")} to choose from`}</div>` : "";
    const held = (m: Money): string => (m.held.length ? `<div class="held">${m.held.map((d) => `reserved by ${byWords(d.author)}${when(d.at) ? ` · ${esc(when(d.at))}` : ""}`).join("; ")}</div>` : "");
    const clipCell = isPackage(id)
      ? `<span class="none">reference only</span>`
      : stills.approvedTake === undefined
        ? `<span class="none">waiting on a still to be approved</span>`
        : `${countWords(c, word(clip))}${held(c)}${clips.approvedTake === undefined && clips.takes.length ? `<div class="none">no clip yet · ${plural(clips.takes.length, "clip")} to choose from</div>` : ""}`;
    const est = [...s.history, ...c.history].map((a) => `<div>${esc(a.scope.payload.estimate)} · ${a.drawn} drawn${a.inForce ? "" : " · replaced"}</div>`).join("") || `<span class="none">-</span>`;
    return `<tr data-href="#${encodeURIComponent(id)}">
      <td data-h="Cell"><a href="#${encodeURIComponent(id)}"><b>${esc(PROJECT.labels[id] ?? id)}</b></a><div class="none">${levelWords(unit, at)}</div></td>
      <td data-h="Ready to cut"><span>${ready}${pick}</span></td>
      <td data-h="Stills"><span>${countWords(s, word(still))}${held(s)}</span></td>
      <td data-h="Clips"><span>${clipCell}</span></td>
      <td data-h="Authorizations, as typed" class="est"><span>${est}</span></td>
    </tr>`;
  }).join("");
  return `<header><h1>Scene board</h1><span class="meta">${esc(PROJECT.title)}</span><span class="meta">${plural(Object.keys(PROJECT.units).length, "cell")}</span></header>
  ${notice?.at === "page" ? `<p class="notice">${notice.text}</p>` : ""}
  <main class="board"><section class="card">
    <table><thead><tr><th>Cell</th><th>Ready to cut</th><th>Stills</th><th>Clips</th><th>Authorizations, as typed</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="charge">Made, reserved and free are counted separately; a reservation counts against its authorization until its file comes in. Every authorization stays listed, replaced ones too. Money isn't totalled here. This app never charges you.</p>
  </section></main>`;
}

/** H: how to open the scene on a phone or tablet, and the state of the nightly copy - from the service's own account of itself. */
function devicesView(): string {
  const info = standing.info;
  const address = info?.addresses[0];
  const b = info?.backups;
  return `<header><h1>Open it on your phone or tablet</h1><span class="meta">this scene's record lives on the host computer</span></header>
  <main class="board"><section class="card steps"><ol>
    <li><b>Keep the host computer on</b> and the app running on it. If it sleeps, phones and tablets show "host offline since …" until it wakes.</li>
    <li><b>On the same Wi-Fi,</b> open ${address === undefined ? "the host computer's address" : `<code>${esc(address)}</code>`} on the phone or tablet.${info && info.addresses.length > 1 ? ` <span class="note">(also ${info.addresses.slice(1).map((a) => `<code>${esc(a)}</code>`).join(", ")})</span>` : ""}</li>
    <li><b>Enter the access code</b> once. It's in ${info === undefined ? "the record's folder on the host computer" : `<code>${esc(info.codeAt)}</code>`}. The device stays signed in.</li>
    <li><b>Away from home (optional):</b> a private-network app such as Tailscale, on the host computer and on each device you invite, lets them reach it from anywhere without opening it to the internet. Not needed at home.</li>
  </ol></section>
  <section class="card"><h2>A copy of the record</h2>
    ${b === undefined ? `<p class="note">Waiting for the host computer to answer.</p>` : b.folder === null
      ? `<p class="note">No backup folder is set: set FRAME_GATE_BACKUP on the host computer, or sign in to OneDrive there.</p>`
      : `<div class="row"><span>last copy</span><b>${b.last === null ? "none yet - the first is made after 2 a.m." : esc(b.last)}</b></div><div class="row"><span>copies kept</span><span>${b.kept} of the last ${b.keep}</span></div><div class="row"><span>where</span><span><code>${esc(b.folder)}</code></span></div>
      <p class="note">One copy a day, made after 2 a.m. while the app is running. To restore: stop the app, copy the newest dated folder's files over the record's folder on the host computer, start the app again.</p>`}
  </section></main>`;
}

function render(): void {
  const { id, page } = route();
  const ids = Object.keys(PROJECT.units);
  const rail = [`<a href="#board" class="${page === "board" ? "active" : ""}">Scene board</a>`, ...ids.map((c) => `<a href="#${encodeURIComponent(c)}" class="${c === id ? "active" : ""}">${esc(PROJECT.labels[c] ?? c)}</a>`)].join("");
  const picker = [`<option value="board"${page === "board" ? " selected" : ""}>Scene board</option>`, ...ids.map((c) => `<option value="${esc(c)}"${c === id ? " selected" : ""}>${esc(PROJECT.labels[c] ?? c)}</option>`), `<option value="devices"${page === "devices" ? " selected" : ""}>Open on your phone</option>`].join("");
  const unit = id === undefined ? undefined : e.registry.unit(id);
  const body = page === "devices"
    ? devicesView()
    : e.record.empty()
      ? `<header><h1>${esc(PROJECT.title)}</h1></header><div class="empty"><p>Nothing is recorded for this scene yet.</p><button class="act" type="button" data-demo>Start with the example scene</button><p class="note">The example records a made-up scene through the engine: Mara's approved look, two stills reserved for 3.1, six overnight takes and a clip for 3.2, and takes brought in for 3.3. Its pictures are drawings.</p>${notice?.at === "page" ? `<p class="notice">${notice.text}</p>` : ""}</div>`
      : unit === undefined ? boardView() : isUnknown(unit) ? `<div class="empty">${said(unit, "There is no such cell.")}</div>` : cellView(id as string, unit);
  app.innerHTML = `<div class="shell${reviewing ? " reviewing" : ""}">
    <nav class="rail"><div class="brand">Review Theater</div><div class="scene">${esc(PROJECT.title)}</div>${rail}${standingLine()}${viewPicker()}</nav>
    <div class="page">
      <div class="topbar"><b>Review Theater</b><select data-cell aria-label="cell">${picker}</select></div>
      <div class="topstat">${standingLine()}${viewPicker()}</div>
      ${body}
    </div>
  </div>`;
}

/** C5 + A: each file, in order, fills a reservation a person made or becomes a new draw; a drop on a slot fills that one. Every file is named. */
async function bringFiles(currency: Currency, files: readonly File[], slot?: DrawContext): Promise<void> {
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
      const f = { name: file.name, ...ready };
      take = i === 0 && slot !== undefined ? fill(e, prompts, media, slot, currency, f, "HUMAN") : bringIn(e, prompts, media, unit, currency, f, "HUMAN");
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

const currencyOf = (name: string | undefined): Currency | undefined => e.order.currencies().find((c) => c === name);
const heldDraw = (at: string | undefined, currency: Currency): DrawContext | undefined =>
  moneyOf(e, e.registry.unit(route().id ?? "") as Unit, currency, e.record.top()).held.find((d) => String(d.at) === at);

/** B: carry out the act the person confirmed. */
function confirmPending(): void {
  const p = pending;
  if (p === undefined) return;
  const unit = e.registry.unit(route().id ?? "") as Unit;
  act(() => {
    const at = e.record.top();
    if (p.kind === "approve") {
      const k = takesOf(e, unit, p.currency, at).takes[p.n - 1];
      if (k !== undefined) e.commitments.commit(k, "HUMAN");
      notice = undefined;
    } else if (p.kind === "switch") {
      const clips = takesOf(e, unit, clip, at);
      const to = clips.takes[p.n - 1];
      if (to !== undefined && !isUnknown(clips.approved)) {
        const r = switchApproval(e, clips.approved, to);
        notice = isUnknown(r) ? { at: "page", text: `Not switched: ${said(r, "")}` } : undefined;
      }
    } else if (p.kind === "undo") {
      const approval = e.commitments.effectiveCommitment(unit, p.currency, at);
      if (!isUnknown(approval)) {
        const r = undoApproval(e, approval);
        notice = isUnknown(r) ? { at: "page", text: `Not undone: ${said(r, "")}` } : { at: "page", text: "Approval undone. Everything made from it is still in the record.", ok: true };
      }
    } else {
      const built = e.forms.build(unit, p.currency, at);
      const scope = isUnknown(built) ? built : e.scopes.authorize(built, Number(p.ceiling.trim()), { kind: "none" }, p.estimate.trim(), "HUMAN", at);
      notice = isUnknown(scope) ? { at: "authorize", text: `Not authorized: ${said(scope, "")}` } : undefined;
      authorizing = isUnknown(scope) ? p.currency : undefined;
    }
    pending = undefined;
    render();
  });
}

app.addEventListener("click", (ev) => {
  const t = ev.target as HTMLElement;
  const unitNow = (): Unit => e.registry.unit(route().id ?? "") as Unit;
  const data = (sel: string, key: string): string | undefined => t.closest<HTMLElement>(sel)?.dataset[key];
  if (t.closest("[data-refresh]")) {
    void catchUp();
  } else if (t.closest("[data-confirm]")) {
    confirmPending();
  } else if (t.closest("[data-cancel]")) {
    pending = undefined;
    render();
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
    pending = { kind: "approve", currency: isClip ? clip : still, n: Number(isClip ? data("[data-approve-clip]", "approveClip") : data("[data-approve]", "approve")) };
    render();
  } else if (t.closest("[data-switch]")) {
    pending = { kind: "switch", n: Number(data("[data-switch]", "switch")) };
    render();
  } else if (t.closest("[data-undo]")) {
    const currency = currencyOf(data("[data-undo]", "undo"));
    if (currency !== undefined) pending = { kind: "undo", currency };
    render();
  } else if (t.closest("[data-reserve]")) {
    const currency = currencyOf(data("[data-reserve]", "reserve"));
    if (currency === undefined) return;
    act(() => {
      const d = reserve(e, unitNow(), currency, { source: "reserved" }, "HUMAN");
      notice = isUnknown(d) ? { at: `reserve-${currency}`, text: `Not reserved: ${said(d, "none authorized")}` } : { at: `reserve-${currency}`, text: "Reserved - bring its file in when it's made.", ok: true };
      render();
    });
  } else if (t.closest("[data-authorize-open], [data-authorize-cancel]")) {
    authorizing = currencyOf(data("[data-authorize-open]", "authorizeOpen"));
    notice = undefined;
    render();
  } else if (t.closest("button.take")) {
    const m = /^(c?)(\d+)$/.exec(data("button.take", "pick") ?? "");
    selected = m === null ? undefined : { kind: m[1] === "c" ? "clip" : "take", n: Number(m[2]) };
    notice = undefined;
    pending = undefined;
    render();
  } else {
    const row = t.closest<HTMLElement>("tr[data-href]");
    if (row !== null && t.closest("a") === null) location.hash = row.dataset["href"] ?? "";
  }
});

app.addEventListener("change", (ev) => {
  const t = ev.target as HTMLElement;
  if (t instanceof HTMLSelectElement && t.dataset["cell"] !== undefined) location.hash = encodeURIComponent(t.value);
  if (t instanceof HTMLSelectElement && t.dataset["view"] !== undefined) {
    reviewing = t.value === "reviewing";
    try {
      localStorage.setItem(VIEW, t.value);
    } catch {
      /* the view lasts for this page only */
    }
    render();
  }
  if (t instanceof HTMLInputElement && t.files !== null && t.files.length > 0) {
    const currency = currencyOf(t.dataset["bring"] ?? t.dataset["currency"]);
    if (currency === undefined) return;
    const slot = t.dataset["fill"] === undefined ? undefined : heldDraw(t.dataset["fill"], currency);
    void bringFiles(currency, Array.from(t.files), slot);
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
  const currency = currencyOf(zone.dataset["drop"]);
  if (currency === undefined) return;
  const slot = zone.dataset["slot"] === undefined ? undefined : heldDraw(zone.dataset["slot"], currency);
  void bringFiles(currency, Array.from(ev.dataTransfer?.files ?? []), slot);
});

app.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const form = ev.target as HTMLFormElement;
  const unit = e.registry.unit(route().id ?? "") as Unit;
  const data = new FormData(form);
  const currency = currencyOf(form.dataset["authorize"]);
  if (currency !== undefined) {
    pending = { kind: "authorize", currency, ceiling: (data.get("ceiling") ?? "").toString(), estimate: (data.get("estimate") ?? "").toString() };
    notice = undefined;
    return render();
  }
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
  pending = undefined;
  render();
});
selected = route().pick;
render();
void catchUp();
setInterval(() => void catchUp(), 15_000);
