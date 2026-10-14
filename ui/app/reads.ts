/**
 * Readings the views compose from several library calls. Each answer is the library's; these only
 * gather them for one cell. Nothing here decides, ranks or recomputes a status.
 */
import { isUnknown, type RecordHeight, type UnknownValue } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import type { Candidate, DrawContext } from "../../src/facts/index.js";
import type { ConditionIdentity, DrawInputs, SampleValue } from "../../src/condition/index.js";
import type { DiagnosticValue } from "../../src/diagnostic/index.js";
import type { ScopeRecord } from "../../src/spend/index.js";
import type { Engine } from "./engine.js";
import { PROJECT } from "./project.js";
import type { PromptStore } from "./stores.js";

/** The prompt in force for a cell's currency, with its inputs when they digest back to the identity the engine holds. */
export function promptOf(e: Engine, prompts: PromptStore, unit: Unit, currency: Currency, at: RecordHeight) {
  const identity = e.revisions.conditionInForce(unit, currency, at);
  if (isUnknown(identity)) return identity;
  const inputs = prompts.get(identity);
  const verified = inputs !== undefined && e.identities.identityOf(inputs) === identity;
  return { identity, inputs: verified ? (inputs as DrawInputs) : undefined, version: e.revisions.revisions(unit, currency, at).length };
}

/** A cell's takes in one currency: the sample under the prompt in force (stills with none: the one the diagnostic reads). */
export function takesOf(e: Engine, unit: Unit, currency: Currency, at: RecordHeight) {
  const inForce = e.revisions.conditionInForce(unit, currency, at);
  const read = isUnknown(inForce) && currency === e.order.least()
    ? PROJECT.components.map((c) => e.diagnostic.of(unit, currency, c).compute(at)).find((d): d is DiagnosticValue => !isUnknown(d))
    : undefined;
  const condition = isUnknown(inForce) ? (read?.condition as ConditionIdentity | undefined) : inForce;
  const computed = condition === undefined ? undefined : e.samples.of(unit, currency, condition).compute(at);
  const sample: SampleValue | undefined = computed === undefined || isUnknown(computed) ? undefined : computed;
  const takes: readonly Candidate[] = sample?.members ?? [];
  const approved = e.commitments.effectiveCommitment(unit, currency, at);
  const approvedAt = isUnknown(approved) ? undefined : approved.payload.candidate;
  const n = approvedAt === undefined ? 0 : takes.findIndex((k) => k.at === approvedAt) + 1;
  return { sample, takes, approved, approvedAt, approvedTake: n === 0 ? undefined : n };
}

/** One authorization in a cell's money history: the scope, the draws charged to it, those still waiting for a file, and whether it is in force. */
export interface Authorization { readonly scope: ScopeRecord; readonly drawn: number; readonly waiting: number; readonly inForce: boolean }

/**
 * A + B: a cell's money in one currency, for the authorization in force - made (draws with their
 * take), reserved (draws recorded before their file, each with who made it), free (what remains) -
 * and its answer to the next draw; every authorization ever drawn under, from each draw's own scope;
 * and every reservation still waiting, including any under a replaced authorization (they survive it).
 */
export function moneyOf(e: Engine, unit: Unit, currency: Currency, at: RecordHeight) {
  const governing = e.scopeReader.governing(unit, currency, at);
  const mine = e.draws.drawsAsOf(unit, at).filter((d) => {
    const c = e.scopeGate.currencyOf(d.payload.scope, at);
    return !isUnknown(c) && c === currency;
  });
  const samples = e.samples.samplesFor(unit, currency, at);
  const bound = new Set((isUnknown(samples) ? [] : samples.flatMap((s) => s.members)).map((k) => k.payload.context));
  const held: readonly DrawContext[] = mine.filter((d) => !bound.has(d.at));
  const inForce = (d: DrawContext): boolean => !isUnknown(governing) && d.payload.scope === governing.at;
  const heights = [...new Set([...mine.map((d) => d.payload.scope), ...(isUnknown(governing) ? [] : [governing.at])])].sort((a, b) => a - b);
  const history: readonly Authorization[] = heights.flatMap((h) => {
    const s = e.scopeReader.scopeAt(h, at);
    return isUnknown(s) ? [] : [{ scope: s, drawn: e.lineage.drawsUnder(h, at).length, waiting: held.filter((d) => d.payload.scope === h).length, inForce: !isUnknown(governing) && governing.at === h }];
  });
  const next: "WITHIN" | UnknownValue | undefined = isUnknown(governing) ? undefined : e.scopeGate.admitsDraw(unit, governing.at, at);
  return {
    governing,
    made: mine.filter((d) => inForce(d) && bound.has(d.at)).length,
    reserved: held.filter(inForce),
    /** Every reservation still waiting, oldest first - under the authorization in force or a replaced one. */
    held,
    free: e.scopeGate.remaining(unit, currency, at),
    next,
    history,
  };
}
export type Money = ReturnType<typeof moneyOf>;
