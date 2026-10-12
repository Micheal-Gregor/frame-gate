// OS-1: a default is a sealed scenario - on a parameter, and inside a destructuring.
export class Defaulted {
  readonly #limit: number;
  constructor({ limit = 3 }: { readonly limit?: number }) {
    this.#limit = limit;
  }
  scaled(by: number = 1): number {
    return this.#limit * by;
  }
}
