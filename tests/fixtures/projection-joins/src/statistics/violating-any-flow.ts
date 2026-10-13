// WI-12: a Projection-typed position filled by `any` - catalog-mint's any-flow, for this brand.
import { asProjection, type Projection, type RecordHeight } from "../../../../../src/kernel/index.js";
export const forged: Projection<number> = JSON.parse("{}");
export function returned(): Projection<number> {
  return JSON.parse("{}");
}
const use = (p: Projection<number>): Projection<number> => p;
export const argued = use(JSON.parse("{}"));
