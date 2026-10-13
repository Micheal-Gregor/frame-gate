// R-35: a member chosen at runtime - which one joined cannot be read off the code.
import { asProjection, type Projection, type ProjectionMember, type RecordHeight } from "../../../../../src/kernel/index.js";
export const joinAs = (member: ProjectionMember) => asProjection(member, (at: RecordHeight) => Number(at));
