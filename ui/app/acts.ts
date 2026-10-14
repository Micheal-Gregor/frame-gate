/**
 * The app's acts that take more than one library call. Each call is the library's, made in the
 * order the library asks for it; every refusal is the library's and is returned as it came.
 */
import { isUnknown, type UnknownValue } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import { BOTTOM, type Candidate, type CandidateProposal } from "../../src/facts/index.js";
import type { DrawInputs, PromptRevision } from "../../src/condition/index.js";
import type { Engine } from "./engine.js";
import { PROJECT } from "./project.js";
import type { MediaStore, PromptStore } from "./stores.js";

/** Write a cell's prompt: its identity from the library, its text kept by the app, the revision recorded. */
export function writePrompt(e: Engine, prompts: PromptStore, unit: Unit, currency: Currency, inputs: DrawInputs): PromptRevision {
  const identity = e.identities.identityOf(inputs);
  prompts.put(identity, inputs);
  return e.revisions.revise(unit, currency, identity, "HUMAN");
}

/** The prompt in force for a cell, with its text when the app's copy digests back to the identity the engine holds. */
export function promptOf(e: Engine, prompts: PromptStore, unit: Unit, currency: Currency) {
  const at = e.record.top();
  const identity = e.revisions.conditionInForce(unit, currency, at);
  if (isUnknown(identity)) return identity;
  const inputs = prompts.get(identity);
  const verified = inputs !== undefined && e.identities.identityOf(inputs) === identity;
  return { identity, inputs: verified ? inputs : undefined, version: e.revisions.revisions(unit, currency, at).length };
}

/** What a take of this cell is drawn from: the approved look of the character its prompt names, or nothing. The library rules on it. */
function fromFor(e: Engine, prompts: PromptStore, unit: Unit, currency: Currency): CandidateProposal["from"] {
  const prompt = promptOf(e, prompts, unit, currency);
  const tags = isUnknown(prompt) || prompt.inputs === undefined ? [] : (prompt.inputs["characters"] as readonly string[] | undefined) ?? [];
  const pkg = tags.map((t) => PROJECT.characters[t]).find((id): id is string => id !== undefined);
  if (pkg === undefined) return BOTTOM;
  const u = e.registry.unit(pkg);
  if (isUnknown(u)) return BOTTOM;
  const look = e.commitments.effectiveCommitment(u, currency, e.record.top());
  return isUnknown(look) ? BOTTOM : look;
}

/**
 * Bring in one image as the next take (C5): a draw under the scope and the prompt in force for the
 * cell, then the take bound to that draw, then the image kept against the take. The draw is charged
 * when it is recorded (R-78), so a take the library then refuses still counts as drawn.
 */
export function bringIn(
  e: Engine, prompts: PromptStore, media: MediaStore, unit: Unit, currency: Currency,
  file: { readonly name: string; readonly sha256: string; readonly image: string }, author: "HUMAN" | "ENGINE",
): Candidate | UnknownValue {
  const at = e.record.top();
  const scope = e.scopeReader.governing(unit, currency, at);
  if (isUnknown(scope)) return scope;
  const condition = e.revisions.conditionInForce(unit, currency, at);
  if (isUnknown(condition)) return condition;
  const context = e.draws.recordDraw(unit, { source: author === "HUMAN" ? "brought in" : "runner", file: file.name, sha256: file.sha256 }, scope.at, condition, at, author);
  if (isUnknown(context)) return context;
  const proposal: CandidateProposal = { context, unit, currency, condition, seed: author === "HUMAN" ? "not known - brought in" : `runner-${file.sha256.slice(0, 12)}`, from: fromFor(e, prompts, unit, currency) };
  const take = e.candidates.appendCandidate(proposal, e.signatures.sign(e.signatures.materialOf(proposal)), e.record.top(), author);
  if (!isUnknown(take)) media.put(take.at, file.image);
  return take;
}
