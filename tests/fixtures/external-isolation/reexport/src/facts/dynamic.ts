export async function lazy(): Promise<unknown> {
  return await import("node:crypto");
}
