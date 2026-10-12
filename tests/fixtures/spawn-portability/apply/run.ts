// K7 round 5 (DR-15): through Function.prototype.apply.
import { spawnSync } from "node:child_process";
export const out = spawnSync.apply(null, ["python3", ["x.py"]]);
