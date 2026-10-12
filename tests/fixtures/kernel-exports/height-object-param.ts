// K7 round 7 (WI-02): a delta whose two heights arrive inside one object.
import type { RecordHeight } from "../../../src/kernel/index.js";
export const spanOf = (p: { readonly a: RecordHeight; readonly b: RecordHeight }): number => p.b - p.a;
