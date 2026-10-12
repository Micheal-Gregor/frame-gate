// A predicate over the member NAMES, reached through an alias of the name union.
import type { ProjectionMember } from "../../../src/kernel/index.js";
type Name = ProjectionMember;
export const isMemberName = (n: string): n is Name => n.length > 0;
