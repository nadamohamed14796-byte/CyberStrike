/**
 * Produce stable URL fingerprints without lowercasing case-sensitive path or
 * query data. The second key preserves lookup compatibility with records saved
 * by the earlier implementation, which lowercased the entire URL.
 */
export function sourceFingerprints(value: string) {
  const legacy = "url:" + value.trim().toLowerCase().replace(/\s+/g, " ")
  try {
    const url = new URL(value.trim())
    url.hash = ""
    return Array.from(new Set(["url:" + url.toString(), legacy]))
  } catch {
    return [legacy]
  }
}
