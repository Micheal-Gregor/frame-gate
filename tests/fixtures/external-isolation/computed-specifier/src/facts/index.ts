// A specifier computed at runtime cannot be resolved by any static sweep, so it is
// refused rather than assumed internal (WI-05's fix): the rule must stay checkable.
const name = ["node", "crypto"].join(":");
export const load = () => import(name);
