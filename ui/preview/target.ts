/**
 * PREVIEW ONLY (Phase 5, Simulate 3): the whole-view target for the shortlist A (your record on all
 * your devices), B (money you can follow, and reserve before you make), C (clips in), with I (small
 * fixes) on the pages they touch. Routes: #board, #3.1, #3.2, #3.3. It renders what the engine
 * returns, in words; the record status line and the pictures are invented (see fixture.ts).
 */
import { isUnknown, type UnknownValue } from "../../src/kernel/index.js";
import { clipWords, esc, plural, said, scoreWords } from "../app/words.js";
import { scene, type CellRead, type MoneyRead, type TakeRead } from "./fixture.js";

const s = scene();

// ---- A: where the record lives, and how fresh this screen is
const status = `<div class="recstat"><b>${esc(s.record.owner)}'s record</b><span>on ${s.record.devices.map(esc).join(" and ")}</span><span>as of ${esc(s.record.asOf)} · up to date</span><button class="link" type="button">refresh</button></div>`;

// ---- B: money you can follow
const moneyLine = (m: MoneyRead, w: string): string => {
  if (isUnknown(m.governing)) return "none authorized";
  const drawn = m.history.find((a) => a.inForce)?.drawn ?? 0;
  const left = isUnknown(m.remaining) ? said(m.remaining, "") : m.remaining === 0 ? "none left" : `<b>${m.remaining} left</b>`;
  return `${drawn} of ${plural(m.governing.payload.ceiling, w)} drawn · ${left}`;
};
const heldLine = (m: MoneyRead, w: string): string =>
  m.held.length === 0 ? "" : `<div class="held">${plural(m.held.length, w)} reserved, waiting for ${m.held.length === 1 ? "its file" : "their files"}</div>`;
const historyList = (m: MoneyRead): string =>
  m.history.length === 0 ? "" : `<ul class="history">${m.history.map((a) => `<li><span>${esc(a.scope.payload.estimate)}</span><span>${a.drawn} drawn · ${a.inForce ? "in force" : `replaced${a.scope.payload.ceiling > a.drawn ? ` (${a.scope.payload.ceiling - a.drawn} dropped)` : ""}`}</span></li>`).join("")}</ul>`;
const counts = (c: CellRead): string => isUnknown(c.ratio) ? said(c.ratio, "") : c.ratio.counts.map((k) => `${k.currency === "i2v" ? "clips" : "stills"} ${k.count}`).join(" · ");

function moneySection(c: CellRead, m: MoneyRead, w: "still" | "clip"): string {
  const reserve = isUnknown(m.governing)
    ? ""
    : m.next === "WITHIN"
      ? `<button class="act secondary" type="button">Reserve a ${w}</button><span class="note">holds one now, before you make it in Grok - the app won't refuse its file later</span>`
      : `<span class="note">${said(m.next as UnknownValue, "")} - authorize more to reserve or bring in more</span>`;
  return `<div class="sub">${w}s</div>
    <div class="row"><span>this authorization</span><span>${moneyLine(m, w)}</span></div>${heldLine(m, w)}
    ${historyList(m)}
    ${isUnknown(m.governing) && w === "clip" ? `<div class="note">${c.clipReach !== undefined && !isUnknown(c.clipReach) && c.clipReach.verdict === "reachable" ? "This cell's still is approved: clips can be authorized and made." : "A clip can start once a still is approved; you can authorize clips before that."}</div>` : ""}
    <div class="reserve">${reserve}</div>
    <div style="margin-top:6px"><button class="act secondary" type="button">Authorize ${isUnknown(m.governing) ? "" : "more "}${w}s…</button></div>`;
}

// ---- takes and clips (C)
const tile = (t: TakeRead, w: string, selected: boolean, moving: boolean): string => {
  const o = t.observation;
  const rows = isUnknown(o) ? `<span class="none" style="grid-column:1/-1">not scored yet</span>` : o.payload.components.map((k) => `<span>${esc(k.name)}</span><span>${scoreWords(k.value)}</span>`).join("");
  return `<div class="take${selected ? " selected" : ""}${t.approved ? " approved" : ""}"><div class="pic"><img class="img" src="${t.image}" alt="${w} ${t.n}" />${moving ? `<span class="play">▶ plays</span>` : ""}</div>
    <div class="cap"><b>${w} ${t.n}</b>${t.file ? `<span class="file">${esc(t.file)}</span>` : ""}${t.by === "ENGINE" ? `<span class="via">via program</span>` : ""}${t.approved ? `<span class="badge">approved</span>` : ""}</div><div class="scores">${rows}</div></div>`;
};
const heldTiles = (m: MoneyRead, w: string): string =>
  m.held.map(() => `<label class="take slot"><span><b>reserved ${w}</b></span><span class="note">waiting for its file - drop it here</span></label>`).join("");
const promptLine = (p: CellRead["prompt"], label: string): string =>
  isUnknown(p) ? `<div class="spec">${said(p, `No ${label} written for this cell yet.`)}</div>` : `<div class="spec">${label} v${p.version}: ${esc(p.text)} <span class="ok">✓</span> <span class="tick">matches what's recorded</span></div>`;

function cellPage(c: CellRead): string {
  const pickClip = c.clips[0];
  const pickTake = c.kind === "shot" && c.clips.length === 0 ? c.takes[1] : undefined;
  const bring = isUnknown(c.stills.governing)
    ? `<div class="drop off"><b>Bring in takes</b><span>Authorize stills first - each image you bring in counts as one.</span></div>`
    : c.stills.held.length > 0
      ? `<label class="drop"><b>+ Bring in takes</b><span>drop images here - the first ${c.stills.held.length} fill the reserved stills${isUnknown(c.stills.remaining) || c.stills.remaining === 0 ? "" : `, then ${c.stills.remaining} more can come in`}</span></label>`
      : c.stills.next === "WITHIN"
        ? `<label class="drop"><b>+ Bring in takes</b><span>drop images here, or choose files - each becomes the next take</span><span class="left">${isUnknown(c.stills.remaining) ? "" : `${plural(c.stills.remaining, "still")} left`}</span></label>`
        : `<div class="drop off"><b>Bring in takes</b><span>all ${isUnknown(c.stills.governing) ? "" : c.stills.governing.payload.ceiling} stills of this authorization are drawn - authorize more to bring in more</span></div>`;
  const stillTiles = c.takes.map((t) => tile(t, "take", t === pickTake, false)).join("") + heldTiles(c.stills, "still");
  const clipsCard = c.kind === "package" ? "" : `
    <section class="card clips-card"><h2>Clips</h2>
      ${c.approvedTake === undefined ? `<p class="note">Clips are drawn from the approved still; approve a take first.</p>` : `${promptLine(c.clipPrompt, "clip prompt")}<div class="spec">drawn from take ${c.approvedTake}</div>`}
      ${c.clips.length + c.clipMoney.held.length === 0 ? "" : `<div class="takes">${c.clips.map((t) => tile(t, "clip", t === pickClip, true)).join("")}${heldTiles(c.clipMoney, "clip")}</div>`}
      ${pickClip === undefined ? "" : `<div class="compare">
        <figure><img class="img" src="${pickClip.image}" alt="clip ${pickClip.n}" /><figcaption><b>clip ${pickClip.n}</b> · ${esc(pickClip.file ?? "")} · plays</figcaption></figure>
        <figure><img class="img" src="${c.takes.find((t) => t.approved)?.image ?? ""}" alt="approved still" /><figcaption><b>take ${c.approvedTake}</b> · the still it was drawn from</figcaption></figure>
      </div>
      <form class="score"><b style="grid-column:1/-1">Score clip ${pickClip.n}</b><div class="note" style="grid-column:1/-1;margin-top:0">Scale 0 to 1. For a clip, identity means: does she hold for the whole clip. New scores replace these.</div>
        <label>identity</label><input placeholder="0 to 1, or blank for not yet" /><label>composition</label><input placeholder="0 to 1, or blank for not yet" />
        <span></span><button class="act" type="button">Record scores</button></form>`}
    </section>`;
  const header = `<header><h1>${esc(c.label)}</h1><span class="meta">${isUnknown(c.level) ? said(c.level, "") : `${esc(c.level)} shot`}</span><span class="meta">${plural(c.takes.length, "take")} · ${c.approvedTake === undefined ? "no take approved yet" : `take ${c.approvedTake} approved`}${c.kind === "shot" && c.approvedTake !== undefined ? ` · ${plural(c.clips.length, "clip")}${c.approvedClip === undefined ? "" : `, clip ${c.approvedClip} approved`}` : ""}</span></header>`;
  return `${header}
  <main class="cell">
    <section class="card takes-card"><h2>Takes</h2>${promptLine(c.prompt, "prompt")}${c.takes.length + c.stills.held.length === 0 ? `<div class="empty">Nothing drawn yet.</div>` : `<div class="takes">${stillTiles}</div>`}${bring}
      ${pickTake === undefined ? "" : `<p class="note">Take ${pickTake.n} selected - its score form and the reference sit here, as now.</p>`}</section>
    ${clipsCard}
    <section class="card approve"><h2>Approve</h2>
      <div class="row"><span>still</span><span>${c.approvedTake === undefined ? "none approved yet" : `<b>take ${c.approvedTake}</b>`}</span></div>
      ${c.kind === "package" ? "" : `<div class="row"><span>clip</span><span>${c.approvedTake === undefined ? clipWords(c.clipReach) : pickClip === undefined ? "none drawn yet" : `clip ${pickClip.n} selected`}</span></div>${pickClip === undefined ? "" : `<div style="margin-top:8px"><button class="act" type="button">Approve clip ${pickClip.n}</button></div>`}`}
    </section>
    <section class="card budget"><h2>Budget</h2>
      ${moneySection(c, c.stills, "still")}
      ${c.kind === "package" ? "" : moneySection(c, c.clipMoney, "clip")}
      <div class="row total"><span>drawn so far, every authorization</span><span>${counts(c)}</span></div>
      <p class="charge">This app never charges you. Authorizing sets how many stills or clips may be brought in or made; reserving holds one before you make it. You pay wherever it is made.</p>
    </section>
    <section class="card diag"><details><summary><h2>Diagnostic</h2><span class="note">how alike the scored takes are - it proposes, never decides</span></summary><p class="note">(as now)</p></details></section>
  </main>`;
}

function boardPage(): string {
  const rows = s.cells.map((c) => {
    const est = [...c.stills.history, ...c.clipMoney.history].map((a) => `<div>${esc(a.scope.payload.estimate)} <span class="none">· ${a.drawn} drawn${a.inForce ? "" : " · replaced"}</span></div>`).join("") || `<span class="none">-</span>`;
    const approved = c.approvedTake === undefined ? `<span class="none">${c.takes.length === 0 ? "nothing drawn yet" : `no take yet · ${plural(c.takes.length, "take")} to choose from`}</span>` : `take ${c.approvedTake}`;
    const stills = `${moneyLine(c.stills, "still")}${c.stills.held.length ? `<div class="held">${c.stills.held.length} reserved</div>` : ""}`;
    const clips = c.kind === "package" ? `<span class="none">reference only</span>` : `${c.approvedTake === undefined ? clipWords(c.clipReach) : moneyLine(c.clipMoney, "clip")}${c.clipMoney.held.length ? `<div class="held">${c.clipMoney.held.length} reserved</div>` : ""}${c.approvedClip === undefined ? "" : `<div>clip ${c.approvedClip} approved</div>`}`;
    return `<tr data-href="#${esc(c.id)}"><td data-h="Cell"><a href="#${esc(c.id)}"><b>${esc(c.label)}</b></a><div class="none">${isUnknown(c.level) ? "" : `${esc(c.level)} shot`}</div></td><td data-h="Approved">${approved}</td><td data-h="Stills">${stills}</td><td data-h="Clips">${clips}</td><td data-h="Authorizations, as typed" class="est">${est}</td></tr>`;
  }).join("");
  return `<header><h1>Scene board</h1><span class="meta">${esc(s.title)}</span><span class="meta">${plural(s.cells.length, "cell")}</span></header>
  <main class="board"><section class="card">
    <table><thead><tr><th>Cell</th><th>Approved</th><th>Stills</th><th>Clips</th><th>Authorizations, as typed</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="charge">Every authorization stays listed, replaced ones too. Money isn't totalled: the app keeps each estimate as it was typed. This app never charges you.</p>
  </section></main>`;
}

const app = document.getElementById("app") as HTMLElement;
const render = (): void => {
  const route = decodeURIComponent(location.hash.slice(1)) || "board";
  const cell = s.cells.find((c) => c.id === route);
  const nav = [`<a href="#board" class="${cell === undefined ? "active" : ""}">Scene board</a>`, ...s.cells.map((c) => `<a href="#${esc(c.id)}" class="${c === cell ? "active" : ""}">${esc(c.label)}</a>`)].join("");
  const options = [`<option${cell === undefined ? " selected" : ""}>Scene board</option>`, ...s.cells.map((c) => `<option${c === cell ? " selected" : ""}>${esc(c.label)}</option>`)].join("");
  app.innerHTML = `<div class="shell">
    <nav class="rail"><div class="brand">Review Theater</div><div class="scene">${esc(s.title)}</div>${nav}${status}</nav>
    <div class="page"><div class="topbar"><b>Review Theater</b><select aria-label="cell">${options}</select></div><div class="topstat">${status}</div>${cell === undefined ? boardPage() : cellPage(cell)}</div>
  </div>`;
};
addEventListener("hashchange", render);
render();
