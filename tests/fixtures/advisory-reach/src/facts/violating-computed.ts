// A computed specifier cannot be resolved, so it is refused rather than assumed elsewhere.
const where = "../advisory/index.js";
export const load = () => import(where);
