// A genuine payload re-dressed: the spread carries the catalog kind with it.
import type { DeclarationPayload } from "../../../src/catalog/index.js";
export const relabel = (p: DeclarationPayload) => ({ author: "HUMAN", payload: { ...p, level: "hard" } });
