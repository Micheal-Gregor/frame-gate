// LIMIT (R-15): Object.assign copies the brand through a library call whose result is an
// intersection type - neither an assertion nor a spread - so this re-brand is not seen.
import { asProjection, type Projection, type ProjectionMember, type RecordHeight } from "../../../../../src/kernel/index.js";
export const rebrand = (joined: Projection<number>) => Object.assign({ compute: (_at: RecordHeight) => 0 }, joined);
