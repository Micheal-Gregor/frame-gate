// Isolation test (OS-12) — construct LineageReader with its declared inputs and nothing else,
// then exercise every public operation (R-41).
import { describe, expect, it } from "vitest";
import type { Currency, Unit } from "../src/catalog/index.js";
import { LineageReader } from "../src/facts/index.js";
import { inMemoryRecord } from "./catalog/in-memory-record.js";
import { factWorld } from "./support/fact-world.js";

const u = "u1" as Unit;
const [c0, c1] = ["c0", "c1"] as unknown as readonly [Currency, Currency];
const world = () => factWorld({ currencies: ["c0", "c1"], invalidations: { isInvalidated: () => false } });

describe("LineageReader in isolation", () => {
  it("refuses to construct when an input is missing", () => {
    expect(() => new LineageReader({} as never)).toThrow();
  });

  it("refuses inputs that do not offer the operations it calls (OS-1, declared slots)", () => {
    expect(() => new LineageReader({ record: {} as never })).toThrow();
  });

  it("derivedFrom answers differently when record differs", () => {
    const w = world();
    const k0 = w.commitAt(u, c0);
    w.drawAt(u, c1);
    const h = w.record.noise();
    const a = new LineageReader({ record: w.record }).derivedFrom(k0.at, h);
    const b = new LineageReader({ record: inMemoryRecord() }).derivedFrom(k0.at, h);
    expect(a).not.toEqual(b);
  });

  it("acceptedBy answers differently when record differs", () => {
    const w = world();
    const k0 = w.commitAt(u, c0);
    const h = w.record.noise();
    const accepted = k0.payload.candidate;
    const a = new LineageReader({ record: w.record }).acceptedBy(accepted, h);
    const b = new LineageReader({ record: inMemoryRecord() }).acceptedBy(accepted, h);
    expect(a).not.toEqual(b);
  });
});
