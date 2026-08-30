/** Generates a unique id for list items (chords, melody notes) that need stable React keys. */
export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
