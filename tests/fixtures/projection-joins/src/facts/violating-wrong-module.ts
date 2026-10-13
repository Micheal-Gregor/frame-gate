// R-35: Reachability joined outside reachability/ - a second reachability site (OBJ-24's module is MOD-04).
import { asProjection, type Projection, type ProjectionMember, type RecordHeight } from "../../../../../src/kernel/index.js";
export const reach = asProjection("Reachability", (at: RecordHeight) => Number(at) >= 0);
