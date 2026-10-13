/**
 * MOD-13 - the difficulty rule the build ships (R-82).
 *
 * The system owns no scoring algorithm, so the shipped rule invents no score: it reads a unit's
 * features as given, in a copy. A real rule is handed to DifficultyAdvisory in its place (OS-3),
 * and nothing else changes - the advisory is still read by nothing (DG-F1).
 */
import type { Features } from "../catalog/index.js";
import type { DifficultyRule } from "./difficulty-advisory.js";

/** R-82: the features as given. */
export const PLAIN_DIFFICULTY: DifficultyRule = Object.freeze({
  assess: (features: Features): Features => Object.freeze({ ...features }),
});
