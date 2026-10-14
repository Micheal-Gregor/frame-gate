/**
 * PREVIEW ONLY (Phase 5, Simulate 4): the whole-view target for the shortlist H (open it anywhere,
 * keep it safe), A (honest counts, reservations you can trust), B (safer approve), with I (small
 * fixes). Routes: #board, #3.1 (reservations), #3.2 (switch clips; undo an approval), #3.3 (the
 * approve confirm), #devices (open it on a phone; the nightly copy). Engine answers in words; the
 * clock times and the host's standing are invented (fixture.ts).
 */
import { isUnknown } from "../../src/kernel/index.js";
import { esc, plural, scoreWords, said } from "../app/words.js";
import { scene, type CellRead, type MoneyRead, type TakeRead } from "./fixture.js";

const s = scene();
const app = document.getElementById("app") as HTMLElement;

// ---- H: the host's standing, in words that hold on any device
const standing = `<div class="recstat"><b>This scene's record</b><span>on the host computer${s.host.devices.length > 1 ? ` · seen from ${s.host.devices.slice(1).map(esc).join(", ")}` : ""}</span><span>${s.host.offlineSince ? `<span class="refused">host offline since ${esc(s.host.offlineSince)}</span>` : `as of ${esc(s.host.asOf)} · up to date`}</span><span><button class="link" type="button">refresh</button> · <a class="link" href="#devices">open on your phone</a></span></div>`;

// ---- A: made / reserved / free, and who reserved what, when
const counts = (m: MoneyRead, w: string): string => {
  if (isUnknown(m.governing)) return "none authorized";
  const free = isUnknown(m.free) ? said(m.free, "") : m.free;
  return `<span class="tally"><b>${m.made}</b> made</span><span class="tally"><b>${m.reserved.length}</b> reserved</span><span class="tally"><b>${free}</b> free</span> <span class="none">of ${plural(m.governing.payload.ceiling, w)}</span>`;
};
const reservedList = (m: MoneyRead, w: string): string =>
  m.reserved.length === 0 ? "" : `<ul class="reservations">${m.reserved.map((r) => `<li>reserved ${esc(w)} · ${esc(r.when)} by ${esc(r.by)}</li>`).join("")}</ul>`;
const history = (m: MoneyRead): string =>
  m.history.length === 0 ? "" : `<ul class="history">${m.history.map((a) => `<li><span>${esc(a.scope.payload.estimate)}</span><span>${a.drawn} drawn · ${a.inForce ? "in force" : "replaced"}</span></li>`).join("")}</ul>`;

const tile = (t: TakeRead, kind: string, selected: boolean): string => {
  const rows = isUnknown(t.o) ? `<span class="none" style="grid-column:1/-1">not scored yet</span>` : t.o.payload.components.map((c) => `<span>${esc(c.name)}</span><span>${scoreWords(c.value)}</span>`).join("");
  return `<div class="take${selected ? " selected" : ""}${t.approved ? " approved" : ""}"><img class="img" src="${t.image}" alt="" /><div class="cap"><b>${kind} ${t.n}</b><span class="file">${esc(t.file)} · ${esc(t.when)}</span>${t.by === "a program" ? `<span class="via">by a program</span>` : ""}${t.approved ? `<span class="badge">approved</span>` : ""}</div><div class="scores">${rows}</div></div>`;
};
const slots = (m: MoneyRead, w: string): string =>
  m.reserved.map((r) => `<label class="take slot"><b>reserved ${esc(w)}</b><span class="note">${esc(r.when)} by ${esc(r.by)}</span><span class="note">drop its file here</span></label>`).join("");

function moneyCard(c: CellRead): string {
  const section = (m: MoneyRead, w: string): string => `<div class="sub">${w}s</div>
    <div class="row"><span>this authorization</span><span>${counts(m, w)}</span></div>${reservedList(m, w)}${history(m)}
    ${m.next === "WITHIN" ? `<div class="reserve"><button class="act secondary" type="button">Reserve a ${w}</button><span class="note">holds one from this authorization now, before you make it in Grok. A reservation can't be given back.</span></div>` : ""}
    <div style="margin-top:6px"><button class="act secondary" type="button">Authorize more ${w}s…</button></div>`;
  return `<section class="card budget"><h2>Budget</h2>${section(c.stills, "still")}${c.kind === "package" ? "" : section(c.clipMoney, "clip")}
    <p class="charge">This app never charges you. A reserved ${"still or clip"} counts against the authorization from the moment you reserve it; you pay Grok when you make it. Re-authorizing keeps reserved slots.</p></section>`;
}

function cellPage(c: CellRead): string {
  const approve = (() => {
    if (c.id === "3.2") {
      const better = c.clips.find((t) => !t.approved);
      return `<section class="card approve"><h2>Approve</h2>
        <div class="row"><span>still</span><b>take ${c.approvedTake} approved</b></div>
        <div class="row"><span>clip</span><b>clip ${c.approvedClip} approved</b></div>
        ${better === undefined ? "" : `<div class="switch"><b>Switch to clip ${better.n}?</b><span class="note">Undoes clip ${c.approvedClip}'s approval and approves clip ${better.n}, in one step.</span><div class="buttons"><button class="act" type="button">Switch to clip ${better.n}</button></div></div>`}
        <div class="undo"><button class="link" type="button">Undo take ${c.approvedTake}'s approval…</button></div>
        ${c.undoStill === undefined ? "" : `<div class="consequence"><b>Undo take ${c.approvedTake}'s approval?</b>
          <p>This also undoes what was made from it: ${plural(c.undoStill.count, "take")} drawn from it (${plural(c.clips.length, "clip")}), and ${plural(c.undoStill.commitments.length, "approval")} of those (clip ${c.approvedClip}). The record keeps all of it; none of it is deleted.</p>
          <div class="buttons"><button class="act danger" type="button">Undo the approval</button><button class="act secondary" type="button">Keep it</button></div></div>`}
      </section>`;
    }
    const pick = c.takes[0];
    return `<section class="card approve"><h2>Approve</h2>${c.approvedTake !== undefined ? `<div class="row"><span>still</span><b>take ${c.approvedTake} approved</b></div>` : pick === undefined ? `<div class="row"><span>still</span><span class="none">no takes yet</span></div>` : `<div class="row"><span>still</span><b>take 1 selected</b></div><div style="margin-top:8px"><button class="act" type="button">Approve take 1</button></div>`}</section>`;
  })();
  const confirm = c.id !== "3.3" ? "" : `<div class="dialog" role="dialog" aria-label="Approve take 1?"><div class="sheet"><b>Approve take 1 for 3.3?</b><p>It becomes the still 3.3's clips are drawn from. You can undo it later - undoing shows first what it would undo.</p><img class="img" src="${c.takes[0]?.image ?? ""}" alt="take 1" /><div class="buttons"><button class="act secondary" type="button">Not now</button><button class="act" type="button">Approve take 1</button></div></div></div>`;
  return `<header><h1>${esc(c.label)}</h1><span class="meta">${esc(c.level)} shot</span><span class="meta">${plural(c.takes.length, "take")} · ${c.approvedTake === undefined ? "no take approved yet" : `take ${c.approvedTake} approved`}</span></header>
  <main class="cell"><div class="col-main">
    <section class="card takes-card"><h2>Takes</h2><div class="takes">${c.takes.map((t) => tile(t, "take", false)).join("")}${slots(c.stills, "still")}</div>
      ${c.stills.reserved.length > 0 ? `<label class="drop"><b>+ Bring in stills</b><span>drop files here - they fill reservations a person made first; drop on a slot to fill that one</span></label>` : ""}</section>
    ${c.kind === "package" ? "" : `<section class="card clips-card"><h2>Clips</h2>${c.clips.length + c.clipMoney.reserved.length === 0 ? `<p class="note">Clips are drawn from the approved still; approve a take first.</p>` : `<div class="takes">${c.clips.map((t) => tile(t, "clip", t.approved)).join("")}${slots(c.clipMoney, "clip")}</div>`}</section>`}
  </div><div class="col-side">${approve}${moneyCard(c)}<section class="card diag"><details><summary><h2>Diagnostic</h2><span class="note">(as now)</span></summary></details></section></div></main>${confirm}`;
}

function boardPage(): string {
  const rows = s.cells.map((c) => `<tr><td data-h="Cell"><a href="#${esc(c.id)}"><b>${esc(c.label)}</b></a><div class="none">${esc(c.level)} shot</div></td>
    <td data-h="Ready"><span>${c.kind === "package" ? (c.approvedTake ? "look ✓" : "look -") : `still ${c.approvedTake ? "✓" : "-"} · clip ${c.approvedClip ? "✓" : "-"}`}</span></td>
    <td data-h="Stills"><span>${counts(c.stills, "still")}${c.stills.reserved.length ? `<div class="held">${c.stills.reserved.map((r) => `${esc(r.when)} by ${esc(r.by)}`).join("; ")}</div>` : ""}</span></td>
    <td data-h="Clips"><span>${c.kind === "package" ? `<span class="none">reference only</span>` : c.approvedTake === undefined ? `<span class="none">waiting on a still to be approved</span>` : counts(c.clipMoney, "clip")}</span></td>
    <td data-h="Authorizations, as typed" class="est"><span>${[...c.stills.history, ...c.clipMoney.history].map((a) => `<div>${esc(a.scope.payload.estimate)} · ${a.drawn} drawn${a.inForce ? "" : " · replaced"}</div>`).join("") || "-"}</span></td></tr>`).join("");
  return `<header><h1>Scene board</h1><span class="meta">${esc(s.title)}</span></header>
  <main class="board"><section class="card"><table><thead><tr><th>Cell</th><th>Ready to cut</th><th>Stills</th><th>Clips</th><th>Authorizations, as typed</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="charge">Made, reserved and free are counted separately; a reservation counts against its authorization until its file comes in. Money isn't totalled here.</p></section></main>`;
}

function devicesPage(): string {
  return `<header><h1>Open it on your phone or tablet</h1><span class="meta">this scene's record lives on the host computer</span></header>
  <main class="board"><section class="card steps"><ol>
    <li><b>Keep the host computer on</b> and the app running. If it sleeps, phones and tablets show "host offline since …" until it wakes.</li>
    <li><b>On the same Wi-Fi,</b> open <code>${esc(s.host.address)}</code> on the phone or tablet.</li>
    <li><b>Enter the access code</b> once. It's in <code>access-code.txt</code> in the record's folder on the host computer, or the one you set as FRAME_GATE_CODE. The device stays signed in.</li>
    <li><b>Away from home (optional):</b> a private-network app such as Tailscale, on the host computer and each device you invite, lets them reach it from anywhere without opening it to the internet. Not needed at home.</li>
  </ol></section>
  <section class="card"><h2>A copy of the record</h2><div class="row"><span>last nightly copy</span><b>${esc(s.host.lastCopy)}</b></div><div class="row"><span>copies kept</span><span>the last ${s.host.kept}</span></div><div class="row"><span>where</span><span>a "Review Theater backups" folder in your OneDrive</span></div>
    <p class="note">To restore: stop the app, copy the newest backup over the record's folder, start the app again.</p></section></main>`;
}

const render = (): void => {
  const route = decodeURIComponent(location.hash.slice(1)) || "board";
  const cell = s.cells.find((c) => c.id === route);
  const nav = [`<a href="#board" class="${route === "board" ? "active" : ""}">Scene board</a>`, ...s.cells.map((c) => `<a href="#${esc(c.id)}" class="${c === cell ? "active" : ""}">${esc(c.label)}</a>`)].join("");
  const view = `<label class="viewpick">show <select><option>everything</option><option>reviewing only</option></select></label>`;
  app.innerHTML = `<div class="shell"><nav class="rail"><div class="brand">Review Theater</div><div class="scene">${esc(s.title)}</div>${nav}${standing}${view}</nav>
    <div class="page"><div class="topbar"><b>Review Theater</b><select aria-label="cell"><option>${esc(cell?.label ?? "Scene board")}</option></select></div><div class="topstat">${standing}</div>
    ${route === "devices" ? devicesPage() : cell === undefined ? boardPage() : cellPage(cell)}</div></div>`;
};
addEventListener("hashchange", render);
render();
