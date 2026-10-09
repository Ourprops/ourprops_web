/**
 * Fill gaps in CMS content with fallback content of the same shape.
 *
 * - Missing, null, or empty-string values use the fallback.
 * - Objects are merged key by key, so only keys in the fallback are kept.
 * - Non-empty arrays from the CMS win; each item is merged with the fallback
 *   item in the same position (or the first one) so required keys always exist.
 */
export function withFallback<T>(fallback: T, value: unknown): T {
  if (value === null || value === undefined || value === "") return fallback

  if (Array.isArray(fallback)) {
    if (!Array.isArray(value) || value.length === 0) return fallback
    return value.map((item, index) => withFallback(fallback[index] ?? fallback[0], item)) as T
  }

  if (typeof fallback === "object" && fallback !== null) {
    if (typeof value !== "object" || Array.isArray(value)) return fallback
    const source = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const [key, fallbackValue] of Object.entries(fallback)) {
      result[key] = withFallback(fallbackValue, source[key])
    }
    return result as T
  }

  return typeof value === typeof fallback ? (value as T) : fallback
}
