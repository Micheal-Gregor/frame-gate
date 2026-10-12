// K7 round 7 (WI-05): a dynamic import whose specifier is a no-substitution template.
export const hash = async () => (await import(`node:crypto`)).createHash("sha256");
