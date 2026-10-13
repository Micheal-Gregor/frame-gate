// K7 round 20, E2: a runtime dynamic import of MOD-13.
export const load = async () => (await import("../advisory/index.js")).PLAIN_DIFFICULTY;
