// R-48: a DisplayedScope minted outside MOD-12 would let an invalidation skip its display (REF-07).
import type { DisplayedScope } from "../../../src/lineage/index.js";
export const fake = (raw: object): DisplayedScope => raw as unknown as DisplayedScope;
