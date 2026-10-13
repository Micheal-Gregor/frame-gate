// R-35 / DG-F1: the brand is an enumerable own symbol, so a spread re-brands a NEW computation.
import { asProjection, type Projection, type ProjectionMember, type RecordHeight } from "../../../../../src/kernel/index.js";
export const rebrand = (joined: Projection<number>) => ({ ...joined, compute: (_at: RecordHeight) => 0 });
