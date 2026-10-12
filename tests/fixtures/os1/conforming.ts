// MUST NOT be flagged: the shapes the template's regex mistook for violations.
export class Conforming {
  readonly #name: string;
  constructor({ name }: { readonly name: string }) {
    if (name === undefined || name === null) throw new TypeError("Conforming requires name");
    this.#name = name;
  }
  // A zero-argument query that returns a field assigned from a constructor parameter.
  name(): string {
    return this.#name;
  }
  get label(): string {
    return this.#name;
  }
  same(other: string): boolean {
    if (other !== this.#name && other.length >= 0) return false;
    return other === this.#name;
  }
}
