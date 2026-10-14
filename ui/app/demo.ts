/**
 * The example scene: made-up acts, recorded THROUGH the library so the board starts somewhere.
 * Prompts are written through the revision log; takes come in the ways real ones do - brought in by
 * a person, drawn by a runner overnight, or reserved first and filled later - and one cell has a
 * clip. Every act passes the library's own gates; a refusal stops the example and is shown. The
 * pictures and the clip are drawings (example-art.ts).
 */
import { isUnknown, type UnknownValue } from "../../src/kernel/index.js";
import type { Currency, Unit } from "../../src/catalog/index.js";
import type { Candidate, DrawContext } from "../../src/facts/index.js";
import { dischargeable, score, type ComponentEntry, type ComponentValue } from "../../src/observation/index.js";
import { bringIn, fill, reserve, writePrompt } from "./acts.js";
import type { Engine } from "./engine.js";
import { exampleClip, exampleStill, type Look } from "./example-art.js";
import { sha256Hex } from "./sha256.js";
import type { MediaStore, PromptStore } from "./stores.js";

export async function exampleScene(e: Engine, prompts: PromptStore, media: MediaStore): Promise<UnknownValue | "RECORDED"> {
  const unit = (id: string): Unit => e.registry.unit(id) as Unit;
  const [still, clip] = e.order.currencies() as readonly [Currency, Currency];
  const stop = (what: string, x: UnknownValue): never => {
    throw Object.assign(new Error(`example: ${what}`), { answer: x });
  };
  const authorize = (u: Unit, currency: Currency, ceiling: number, estimate: string): void => {
    const h = e.record.top();
    const form = e.forms.build(u, currency, h);
    if (isUnknown(form)) stop("form", form);
    const s = e.scopes.authorize(form as Exclude<typeof form, UnknownValue>, ceiling, { kind: "none" }, estimate, "HUMAN", h);
    if (isUnknown(s)) stop("scope", s);
  };
  const asFile = async (blob: Blob, name: string) => ({ name, blob, sha256: sha256Hex(new Uint8Array(await blob.arrayBuffer())) });
  let n = 0;
  const take = async (u: Unit, look: Look, name: string, author: "HUMAN" | "ENGINE"): Promise<Candidate> => {
    n += 1;
    const k = bringIn(e, prompts, media, u, still, await asFile(exampleStill(look, n), name), author);
    return isUnknown(k) ? stop("take", k) : k;
  };
  const hold = (u: Unit, currency: Currency): DrawContext => {
    const d = reserve(e, u, currency, { source: "reserved" }, "HUMAN");
    return isUnknown(d) ? stop("reserve", d) : d;
  };
  const observe = (k: Candidate, values: Readonly<Record<string, number | "later">>): void => {
    const entries: Record<string, ComponentEntry> = {};
    for (const [name, x] of Object.entries(values)) {
      const value: ComponentValue | UnknownValue = x === "later" ? dischargeable("a later look") : score(x);
      if (isUnknown(value)) stop("score", value);
      entries[name] = { value: value as ComponentValue, author: "HUMAN" };
    }
    const o = e.observations.observe(k, entries, "HUMAN", e.record.top());
    if (isUnknown(o)) stop("observation", o);
  };
  try {
    // Mara's identity package: two looks brought in, the second approved as her reference.
    const mara = unit("mara-pkg");
    e.declarations.declare(mara, "easy", "HUMAN");
    e.independence.declareIndependence(mara, true, "HUMAN");
    writePrompt(e, prompts, mara, still, { prompt: "Mara, early 30s, dark curly hair, green cardigan; even light; front and three-quarter", characters: [] });
    authorize(mara, still, 3, "~$0.21 - 3 Imagine stills");
    await take(mara, "mara", "mara-look-1.png", "HUMAN");
    e.commitments.commit(await take(mara, "mara", "mara-look-2.png", "HUMAN"), "HUMAN");

    // 3.1, the wide: three stills authorized; two reserved before they were made in Grok.
    const wide = unit("3.1");
    e.declarations.declare(wide, "easy", "HUMAN");
    writePrompt(e, prompts, wide, still, { prompt: "Wide: the kitchen at night, Mara at the sink, back to camera", characters: ["@mara"] });
    authorize(wide, still, 3, "~$0.21 - 3 Imagine stills");
    hold(wide, still);
    hold(wide, still);

    // 3.2, the close-up: six overnight stills by the runner, five scored, take 3 approved; then a clip
    // prompt, two clips authorized and reserved, one brought in and scored.
    const close = unit("3.2");
    e.declarations.declare(close, "hard", "HUMAN");
    writePrompt(e, prompts, close, still, { prompt: "Close-up: Mara mid-sentence, kitchen light from the left", characters: ["@mara"] });
    authorize(close, still, 6, "~$0.42 - 6 Imagine stills (vendor quote)");
    const looks: readonly Look[] = ["mara", "mara-off", "mara", "mara", "mara", "mara"];
    const closeTakes: Candidate[] = [];
    for (const [i, look] of looks.entries()) closeTakes.push(await take(close, look, `runner-3.2-${i + 1}.png`, "ENGINE"));
    const scores: readonly Readonly<Record<string, number | "later">>[] = [
      { identity: 0.71, composition: 0.6 },
      { identity: 0.64, composition: "later" },
      { identity: 0.82, composition: 0.74 },
      { identity: 0.77, composition: 0.58 },
      { identity: 0.69, composition: 0.66 },
    ];
    scores.forEach((values, i) => observe(closeTakes[i] as Candidate, values));
    e.commitments.commit(closeTakes[2] as Candidate, "HUMAN");
    writePrompt(e, prompts, close, clip, { prompt: "Mara turns toward the window, slow push-in, 4 seconds", characters: ["@mara"] });
    authorize(close, clip, 2, "~$0.60 - 2 Imagine clips (vendor quote)");
    const firstClip = hold(close, clip);
    hold(close, clip);
    const filled = fill(e, prompts, media, firstClip, clip, await asFile(exampleClip(3), "3.2-clip-1.svg"), "HUMAN");
    if (isUnknown(filled)) stop("clip", filled);
    observe(filled as Candidate, { identity: 0.78, composition: 0.7 });

    // 3.3, the reaction: four stills authorized, three brought in, two scored; then re-authorized, one more.
    const reaction = unit("3.3");
    e.declarations.declare(reaction, "hard", "HUMAN");
    writePrompt(e, prompts, reaction, still, { prompt: "Reaction: Mara listening, jaw set, kitchen window behind her", characters: ["@mara"] });
    authorize(reaction, still, 4, "~$0.28 - 4 Imagine stills");
    const brought: Candidate[] = [];
    for (const name of ["IMG_0412.png", "IMG_0413.png", "IMG_0415.png"]) brought.push(await take(reaction, "reaction", name, "HUMAN"));
    observe(brought[0] as Candidate, { identity: 0.74, composition: 0.69 });
    observe(brought[1] as Candidate, { identity: 0.58, composition: "later" });
    authorize(reaction, still, 3, "~$0.21 - 3 Imagine stills");
    await take(reaction, "reaction", "IMG_0431.png", "HUMAN");
    return "RECORDED";
  } catch (err) {
    const answer = (err as { answer?: UnknownValue }).answer;
    if (answer !== undefined) return answer;
    throw err;
  }
}
