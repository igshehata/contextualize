/**
 * Add entries into a record **only when the key is absent**, so a consumer's
 * own definitions always win. Returns the keys actually added (for the applied
 * plan / tests).
 */
export function mergeAbsent<T>(
  target: Record<string, T>,
  additions: Record<string, T>,
  assign: (key: string, value: T) => void,
): string[] {
  const added: string[] = []
  for (const [key, value] of Object.entries(additions)) {
    if (key in target) continue
    assign(key, value)
    added.push(key)
  }
  return added
}
