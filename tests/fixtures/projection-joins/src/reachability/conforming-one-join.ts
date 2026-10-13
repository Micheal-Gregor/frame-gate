// POSITIVE CONTROL (R-35): Reachability joins once, in the module the S3 partition gives it.
import { asProjection, type Projection, type ProjectionMember, type RecordHeight } from "../../../../../src/kernel/index.js";
export const reach = asProjection("Reachability", (at: RecordHeight) => Number(at) >= 0);
