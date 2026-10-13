// REGISTERED LIMIT (IR-94): unary minus is a numeric COERCION, like unary plus and Number(x) -
// TypeScript accepts it on any operand. It compiles; the decided spellings combine two operands.
import { component, type Observation } from "../../../src/observation/index.js";
export const bad = (o: Observation) => -component(o, "motion");
