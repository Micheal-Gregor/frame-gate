// DR-32: a Projection made by a generic launder - a user generic returning a bare type parameter.
import { asProjection, type Projection, type RecordHeight } from "../../../../../src/kernel/index.js";
function launder<T>(x: unknown): T {
  return x as T;
}
export const forged = launder<Projection<number>>({ compute: (at: RecordHeight) => Number(at) });
