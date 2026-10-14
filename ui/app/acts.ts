/**
 * The app's acts that take more than one library call. Each call is the library's, made in the
 * order the library asks for it; every refusal is the library's and is returned as it came.
 */
import { isUnknown, type UnknownValue } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import { BOTTOM, type Candidate, type CandidateProposal, type Commitment, type DrawContext } from "../../src/facts/index.js";
import type { Invalidation } from "../../src/lineage/index.js";
import type { DrawInputs, PromptRevision } from "../../src/condition/index.js";
import type { Engine } from "./engine.js";
import { PROJECT } from "./project.js";
import { moneyOf, promptOf } from "./reads.js";
import type { MediaStore, PromptStore } from "./stores.js";

/** Write a cell's prompt for a currency: its identity from the library, its inputs kept by the service, the revision recorded. */
export function writePrompt(e: Engine, prompts: PromptStore, unit: Unit, currency: Currency, inputs: DrawInputs): PromptRevision {
  const identity = e.identities.identityOf(inputs);
  prompts.put(identity, inputs);
  return e.revisions.revise(unit, currency, identity, "HUMAN");
}

/**
 * What a take is drawn from. Above the cheapest currency: this cell's commitment one currency down
 * (a clip, from the approved still). At the cheapest: the approved look of the character the prompt
 * names, or nothing. The library rules on it (malformed-from otherwise).
 */
function fromFor(e: Engine, prompts: PromptStore, unit: Unit, currency: Currency): CandidateProposal["from"] {
  const at = e.record.top();
  const below = e.order.predecessors(currency);
  const prev = isUnknown(below) ? undefined : below[below.length - 1];
  if (prev !== undefined) {
    const k = e.commitments.effectiveCommitment(unit, prev, at);
    return isUnknown(k) ? BOTTOM : k;
  }
  const prompt = promptOf(e, prompts, unit, currency, at);
  const tags = isUnknown(prompt) || prompt.inputs === undefined ? [] : (prompt.inputs["characters"] as readonly string[] | undefined) ?? [];
  const pkg = tags.map((t) => PROJECT.characters[t]).find((id): id is string => id !== undefined);
  const u = pkg === undefined ? undefined : e.registry.unit(pkg);
  if (u === undefined || isUnknown(u)) return BOTTOM;
  const look = e.commitments.effectiveCommitment(u, currency, at);
  return isUnknown(look) ? BOTTOM : look;
}

/**
 * B: reserve - record the draw now, under the scope and the prompt in force, before the file is made.
 * The draw is charged when recorded (R-78), so the file can never be refused for the budget later.
 */
export function reserve(e: Engine, unit: Unit, currency: Currency, features: Readonly<Record<string, string>>, author: "HUMAN" | "ENGINE"): DrawContext | UnknownValue {
  const at = e.record.top();
  const scope = e.scopeReader.governing(unit, currency, at);
  if (isUnknown(scope)) return scope;
  const condition = e.revisions.conditionInForce(unit, currency, at);
  if (isUnknown(condition)) return condition;
  return e.draws.recordDraw(unit, features, scope.at, condition, at, author);
}

/** Bind a file to a draw already recorded: the take, then its file kept against it. One draw, one take (R-33). */
export function fill(
  e: Engine, prompts: PromptStore, media: MediaStore, draw: DrawContext, currency: Currency,
  file: { readonly name: string; readonly sha256: string; readonly blob: Blob }, author: "HUMAN" | "ENGINE",
): Candidate | UnknownValue {
  const unit = draw.payload.unit;
  const proposal: CandidateProposal = { context: draw, unit, currency, condition: draw.payload.condition, seed: `file sha256:${file.sha256}`, from: fromFor(e, prompts, unit, currency) };
  const take = e.candidates.appendCandidate(proposal, e.signatures.sign(e.signatures.materialOf(proposal)), e.record.top(), author);
  if (!isUnknown(take)) void media.put(take.at, file.blob, file.name);
  return take;
}

/**
 * C5 + A: bring a file in as the next take - into the oldest reservation made by the same kind of
 * author (a person's files into a person's reservations, a program's into its own), or into a new
 * draw under the scope and prompt in force. A refused take after a recorded draw leaves that draw
 * reserved, to be filled next time. A specific reservation is filled with `fill` (a drop on its slot).
 */
export function bringIn(
  e: Engine, prompts: PromptStore, media: MediaStore, unit: Unit, currency: Currency,
  file: { readonly name: string; readonly sha256: string; readonly blob: Blob }, author: "HUMAN" | "ENGINE",
): Candidate | UnknownValue {
  const held = moneyOf(e, unit, currency, e.record.top()).held.find((d) => d.author === author);
  const draw = held ?? reserve(e, unit, currency, { source: "brought in", file: file.name }, author);
  return isUnknown(draw) ? draw : fill(e, prompts, media, draw, currency, file, author);
}

/**
 * B: undo an approval. The library derives what it would undo and records that it was shown (R-48),
 * then the invalidation is appended at that same height (R-47) - the view shows the same derivation
 * first, from InvalidationScope.of, so what the person confirmed is what is undone.
 */
export function undoApproval(e: Engine, approval: Commitment): Invalidation | UnknownValue {
  const at = e.record.top();
  return e.invalidations.invalidate(e.invalidations.display(approval, at), "HUMAN", at);
}

/** B: switch the approved clip (or still) to another take, in one step: undo the approval in force, then approve the new one. */
export function switchApproval(e: Engine, approval: Commitment, to: Candidate): Commitment | UnknownValue {
  const undone = undoApproval(e, approval);
  return isUnknown(undone) ? undone : e.commitments.commit(to, "HUMAN");
}
