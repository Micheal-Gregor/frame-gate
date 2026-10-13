// R-35: a member joined twice - two Projections both claiming to be Reachability.
import { asProjection, type Projection, type ProjectionMember, type RecordHeight } from "../../../../../src/kernel/index.js";
export const one = asProjection("Reachability", (at: RecordHeight) => Number(at) >= 0);
export const two = asProjection("Reachability", (at: RecordHeight) => Number(at) > 1);
