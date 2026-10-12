// OS-1: taking nothing and returning a literal is an undeclared input.
export class Literal {
  region(): string {
    return "eu-west";
  }
  get floor(): number {
    return 42;
  }
  today(): Date {
    return new Date(2026, 9, 12);
  }
}
