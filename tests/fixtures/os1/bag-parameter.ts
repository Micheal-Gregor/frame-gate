// OS-1: collaborators arrive in named slots, never in a bag.
export class Bagged {
  call(...collaborators: unknown[]): number {
    return collaborators.length;
  }
  count(): number {
    // eslint-disable-next-line prefer-rest-params
    return arguments.length;
  }
}
