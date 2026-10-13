/**
 * Parts for MOD-11's isolation tests: a real ScopeLedger over a record, with the bar and the ratio
 * handed in whole. The bar and the ratio are SETUP here - never the subject of an isolation test.
 */
import { asProjection, isUnknown, type RecordHeight } from "../../src/kernel/index.js";
import { DeclarationLedger, type Currency, type Unit } from "../../src/catalog/index.js";
import type { BarValue } from "../../src/calibration/index.js";
import { AuthorizationForms, ScopeLedger, type Scope, type StopRequest, type ThresholdSource } from "../../src/spend/index.js";
import { inMemoryRecord, type TestRecord } from "../catalog/in-memory-record.js";

export const u = "u1" as Unit;
export const c0 = "c0" as Currency;
export const c1 = "c1" as Currency;
const figures = { acceptedCount: 1, passedOverCount: 1, excludedAccepted: 0, excludedPassedOver: 0 };
/** A bar answering θ = 0.5, or no bar. */
export const barOf = (present: boolean): ThresholdSource => ({
  of: () =>
    asProjection("Bar", (): BarValue => (present ? ({ kind: "bar", theta: 0.5, sampleSize: 1 + 1, ...figures } as BarValue) : { kind: "no-bar", cause: "both-empty", discharge: "d", ...figures })),
});
/** A ratio of nothing drawn yet, over c0 and c1. */
export const forms = new AuthorizationForms({
  ratio: { of: (unit) => asProjection("Ratio", () => ({ unit, counts: [{ currency: c0, count: 0 }, { currency: c1, count: 0 }] })) },
});

export function scopeWorld(present = true): { record: TestRecord; declarations: DeclarationLedger; ledger: ScopeLedger; authorize: (currency: Currency, ceiling: number, stop?: StopRequest) => Scope } {
  const record = inMemoryRecord();
  const declarations = new DeclarationLedger({ record, levels: ["easy"] });
  declarations.declare(u, "easy", "HUMAN");
  const ledger = new ScopeLedger({ record, bar: barOf(present), declarations });
  const authorize = (currency: Currency, ceiling: number, stop: StopRequest = { kind: "none" }): Scope => {
    const h: RecordHeight = record.noise();
    const form = forms.build(u, currency, h);
    if (isUnknown(form)) throw new Error("setup: no form");
    const s = ledger.authorize(form, ceiling, stop, "e", "HUMAN", h);
    if (isUnknown(s)) throw new Error(`setup: the scope was refused (${s.kind})`);
    return s;
  };
  return { record, declarations, ledger, authorize };
}
