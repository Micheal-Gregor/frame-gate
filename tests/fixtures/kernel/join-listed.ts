// POSITIVE CONTROL (R-35): a listed member joins through the kernel.
import { asProjection, type RecordHeight } from "../../../src/kernel/index.js";
export const reach = asProjection("Reachability", (at: RecordHeight) => Number(at) >= 0);
