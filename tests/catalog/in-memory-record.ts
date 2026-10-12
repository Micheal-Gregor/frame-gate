/**
 * A test double for MOD-02's RecordPort, with the one semantic the catalog relies
 * on stated and enforced: a RecordHeight is the COUNT of appends (OBJ-10: "the
 * record as it stood after some number of appends"), so `append` returns the new
 * count and `readAsOf(h)` is exactly the first `h` facts, in append order (IR-31).
 *
 * It holds every module's facts, not only the catalog's: `noise` lets a test put
 * unrelated facts between catalog acts, which is the situation the as-of read has
 * to get right.
 */
import { height, type RecordHeight } from "../../src/kernel/index.js";
import type { SharedRecord } from "../../src/catalog/index.js";

export interface TestRecord extends SharedRecord {
  /** Appends one unrelated fact (another module's) and returns its height. */
  noise(): RecordHeight;
}

export function inMemoryRecord(): TestRecord {
  const facts: unknown[] = [];
  const append = (fact: unknown): RecordHeight => {
    facts.push(Object.freeze(fact));
    return height(facts.length);
  };
  return {
    append,
    readAsOf: (at: RecordHeight): readonly unknown[] => facts.slice(0, at),
    noise: () => append({ kind: "someone-else's-fact" }),
  };
}
