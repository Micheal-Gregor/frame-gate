// REGISTERED LIMIT (IR-27), not a conforming example. A plain boolean function
// that inspects shape answers "is this a Projection?" as surely as a predicate,
// and no checker can tell it from any other boolean function - the type carries
// no claim about what it tests. This fixture pins the limit: the detector does
// NOT flag it, and the day a detector can, this fixture's test turns red and the
// limit is re-registered as covered.
export const hasCompute = (x: unknown): boolean =>
  typeof x === "object" && x !== null && "compute" in x;
