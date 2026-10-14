/**
 * C7 - plain words for the engine's own answers. Each entry maps a code the engine names to the
 * words a person reads; the code stays on screen beside them, small. A code with no entry is shown
 * as the engine says it. Nothing here decides: no status is worked out, no take is ranked, and the
 * one number the copy needs - the dispersion floor - is read from the library, never typed in.
 */
import { isUnknown, type UnknownValue } from "../../src/kernel/index.js";
import { isAbsent, type ComponentValue } from "../../src/observation/index.js";
import { DISPERSION_FLOOR } from "../../src/statistics/index.js";
import type { WithheldReason } from "../../src/diagnostic/index.js";
import type { ReachabilityEvaluation } from "../../src/reachability/index.js";
import type { ScopeRecord } from "../../src/spend/index.js";
import type { Money } from "./reads.js";

export const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
export const num = (x: number): string => x.toFixed(2);
export const code = (c: string): string => `<span class="code" title="the engine's code">${esc(c)}</span>`;
export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

const REFUSED: Readonly<Record<string, string>> = {
  "scope-exceeded": "this authorization is used up",
  unreachable: "needs an approved still first",
  "malformed-ceiling": "enter a whole number, 1 or more",
  "not-finite": "enter a number",
  "malformed-from": "this cell needs an approved look to draw from",
  "no-declaration": "this cell has no shot level set",
  "form-before-act": "the form went stale - try again",
  "context-spent": "that draw already has its take",
  "context-mismatch": "that draw belongs to another cell or prompt",
  "scope-mismatch": "that draw belongs to another authorization",
};

/** An Unknown in words; `none` is what NoSubject means where it is asked. */
export function said(u: UnknownValue, none: string): string {
  switch (u.kind) {
    case "refuse": return `${esc(REFUSED[u.guard] ?? "refused")} ${code(u.guard)}`;
    case "no-subject": return esc(none);
    case "uncomputable": return `can't be worked out ${code(u.boundary)}`;
    case "undetermined": return `not enough to say yet ${code(u.ae)}`;
    case "latent": return "not known yet";
  }
}

/** The clip's reachability (MOD-04) in words. */
export const clipWords = (r: ReachabilityEvaluation): string =>
  isUnknown(r) ? said(r, "nothing to read yet") : r.verdict === "reachable" ? "can start" : `needs an approved ${esc(r.cheapestUnmet)} first ${code(`cheapest unmet: ${r.cheapestUnmet}`)}`;

const NO_BAR: Readonly<Record<string, string>> = {
  "both-empty": "no bar yet - it needs an approved take and a passed-over take at this level, both scored",
  "accepted-empty": "no bar yet - it needs a scored, approved take at this level",
  "passed-over-empty": "no bar yet - it needs a scored take that was passed over at this level",
  "AE-5 open": "no bar yet - waiting on the project's rule for the bar; nothing for you to do here",
};

/** A withheld diagnostic axis, with its reason in words and the populations behind a missing bar. */
export function withheld(w: WithheldReason): string {
  if ("kind" in w.cause && w.cause.kind === "no-bar") {
    const c = w.cause;
    return `${esc(NO_BAR[c.cause] ?? `no bar yet (${c.cause})`)} ${code(c.cause)}<div class="counts">approved ${c.acceptedCount} · passed over ${c.passedOverCount} · left out ${c.excludedAccepted} / ${c.excludedPassedOver}</div>`;
  }
  const u = w.cause as UnknownValue;
  return u.kind === "undetermined" ? `needs ${DISPERSION_FLOOR} scored takes under this prompt ${code(u.ae)}` : said(u, "nothing to read yet");
}

/** One score as shown under a take. */
export function scoreWords(v: ComponentValue | UnknownValue): string {
  if (isUnknown(v)) return `<span class="none">${said(v, "")}</span>`;
  if (isAbsent(v)) return `<span class="absent">${v.discharge.kind === "dischargeable" ? "not yet" : `not here - ${esc(v.discharge.reason)}`}</span>`;
  return num(v);
}

/** C8: one currency's budget in words - used of the ceiling, and what is left - from the scope, its charged draws, and remaining. */
export function budgetWords(scope: ScopeRecord | UnknownValue, used: number | undefined, remaining: number | UnknownValue, word: string): string {
  if (isUnknown(scope)) return "none authorized";
  const left = isUnknown(remaining) ? said(remaining, "") : remaining === 0 ? `<b class="spent">used up</b>` : `<b>${remaining} left</b>`;
  return `${used ?? "?"} of ${plural(scope.payload.ceiling, word)} used · ${left}`;
}

/** B: the authorization in force in words - drawn of the ceiling, what is left - and the reserved draws waiting for files. */
export function moneyWords(m: Money, word: string): string {
  if (isUnknown(m.governing)) return "none authorized";
  const left = isUnknown(m.remaining) ? said(m.remaining, "") : m.remaining === 0 ? `<span class="spent">none left</span>` : `<b>${m.remaining} left</b>`;
  return `${m.used ?? 0} of ${plural(m.governing.payload.ceiling, word)} drawn · ${left}`;
}
export const heldWords = (m: Money, word: string): string =>
  m.held.length === 0 ? "" : `<div class="held">${plural(m.held.length, word)} reserved, waiting for ${m.held.length === 1 ? "its file" : "their files"}</div>`;
/** B: every authorization ever drawn under, as typed, with what was drawn and whether it still governs. */
export const historyWords = (m: Money): string =>
  m.history.length === 0 ? "" : `<ul class="history">${m.history.map((a) => `<li><span>${esc(a.scope.payload.estimate)}</span><span>${a.drawn} drawn · ${a.inForce ? "in force" : `replaced${a.scope.payload.ceiling > a.drawn ? ` (${a.scope.payload.ceiling - a.drawn} dropped)` : ""}`}</span></li>`).join("")}</ul>`;
