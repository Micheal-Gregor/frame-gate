// R-35: a Projection made by assertion instead of through the kernel.
import { asProjection, type Projection, type ProjectionMember, type RecordHeight } from "../../../../../src/kernel/index.js";
export const forged = ({ compute: (at: RecordHeight) => Number(at) }) as unknown as Projection<number>;
