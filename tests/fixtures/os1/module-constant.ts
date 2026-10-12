// OS-1: a module constant read inside a class is an undeclared input. The method
// whose PARAMETER has the same name is not a read of the constant - resolved by symbol.
const THRESHOLD = 0.5;
export class Thresholded {
  passes(score: number): boolean {
    return score > THRESHOLD;
  }
  passesGiven(score: number, THRESHOLD: number): boolean {
    return score > THRESHOLD;
  }
}
