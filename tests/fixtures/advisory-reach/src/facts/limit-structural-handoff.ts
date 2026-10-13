// REGISTERED LIMIT: an advisory handed in at runtime through a structural type names no module.
// DG-F1 against a composed object is the composition root's (Phase 5).
export function show(advisory: { advisory(unit: string): unknown }): unknown {
  return advisory.advisory("u1");
}
