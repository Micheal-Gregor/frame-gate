// MUST NOT be flagged: lengths of things that are not currency collections, and no two.
export const longer = (a: readonly string[], b: readonly string[]): boolean => a.length > b.length || a.length > 3;
