// K7 round 6 E2b: a read wearing a "HUMAN" parameter instead of a height.
import { height } from "../../../../src/kernel/index.js";
import type { Declaration, SharedRecord } from "../../../../src/catalog/index.js";
export class Latest {
  readonly #record: SharedRecord;
  constructor({ record }: { readonly record: SharedRecord }) {
    this.#record = record;
  }
  latest(_who: "HUMAN"): Declaration | undefined {
    return this.#record.readAsOf(height(1_000_000)).at(-1) as Declaration | undefined;
  }
}
