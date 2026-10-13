/**
 * MOD-08 `statistics/` - the ONE membership rule both statistics read (R-64, VEC-03 rule iv): the
 * scores a sample's members carry for one component, per each member's observation in force
 * (R-60). An ABSENT component, or an unobserved member, contributes nothing. A pure function:
 * the observation source is handed in by the caller.
 */
import { isUnknown, noSubject, undetermined, type RecordHeight, type UnknownValue } from "../kernel/index.js";
import type { Candidate } from "../facts/index.js";
import { component, isAbsent, type Observation, type Score } from "../observation/index.js";

/** MOD-07's read: the observation in force for a candidate as of a height. */
export interface ObservationSource {
  observationOf(candidate: Candidate, at: RecordHeight): Observation | UnknownValue;
}

/** The dispersion floor, as data: the integer three lives here and nowhere else (F3). */
export const DISPERSION_FLOOR = 3;

/** The scores `members` carry for `name` as of `at`, in ascending order (a canonical order: VEC-03 rule iii). */
export function scoresOf(members: readonly Candidate[], name: string, observations: ObservationSource, at: RecordHeight): readonly Score[] | UnknownValue {
  const out: Score[] = [];
  for (const member of members) {
    const observation = observations.observationOf(member, at);
    if (isUnknown(observation)) {
      // NoSubject is "never observed": it contributes nothing. Any other Unknown is the answer.
      if (observation.kind === "no-subject") continue;
      return observation;
    }
    const value = component(observation, name);
    if (isUnknown(value) || isAbsent(value)) continue; // ABSENT contributes nothing, and is no member for the floor
    out.push(value);
  }
  return Object.freeze(inOrder(out));
}

/** R-63: the sample standard deviation (n - 1), or Undetermined(AE-3) below the floor (REF-08). */
export function spread(scores: readonly Score[]): number | UnknownValue {
  if (scores.length < DISPERSION_FLOOR) return undetermined("AE-3");
  // In one canonical order, so the value is a function of the multiset alone, bit for bit.
  const xs = inOrder(scores);
  const mean = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const squares = xs.reduce((sum, x) => sum + (x - mean) * (x - mean), 0);
  return Math.sqrt(squares / (xs.length - 1));
}

/** R-63: the arithmetic mean, or NoSubject when nothing is scored. */
export function centre(scores: readonly Score[]): number | UnknownValue {
  if (scores[0] === undefined) return noSubject();
  const xs = inOrder(scores);
  return xs.reduce((sum, x) => sum + x, 0) / xs.length;
}

/** Ascending - the one canonical order (VEC-03 rule iii). */
function inOrder(scores: readonly Score[]): Score[] {
  return [...scores].sort((a, b) => a - b);
}
