// K7's own positive control: the classic double assertion.
import type { Declaration } from "../../../src/catalog/index.js";
export const classify = (raw: object): Declaration => raw as unknown as Declaration;
