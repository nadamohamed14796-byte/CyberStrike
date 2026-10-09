// psl ships types/index.d.ts but does not expose it via package.json
// "exports", so TypeScript treats the import as untyped. We narrow it
// here with the only call signature we use.
// @ts-expect-error - see comment above
import pslDefault from "psl"
const psl = pslDefault as {
  parse(host: string): { domain: string | null; error?: { code: string; message: string } }
}

// Network scope here is HOSTNAME-only. URL path/port constraints cannot be
// enforced by this host-only predicate, so reject those patterns instead of
// silently widening them to the entire host. ScopeGuard handles URL-level
// path/port checks at the tool layer.

export type ScopeMatcher = (host: string) => boolean

/**
 * Normalize a hostname-only scope pattern. A leading ! marks an exclusion.
 * URL paths and non-default ports are rejected because this matcher receives
 * hostnames, not full URLs. Empty string means unsupported/invalid pattern.
 */
export function normalizeScope(input: string): string {
  let s = input.trim().toLowerCase()
  if (!s) return ""
  const exclusion = s.startsWith("!")
  if (exclusion) s = s.slice(1).trim()
  if (!s) return ""

  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s)
      if (url.protocol !== "http:" && url.protocol !== "https:") return ""
      if (url.pathname !== "/" || url.search || url.hash) return ""
      if (url.port) return ""
      s = url.hostname.toLowerCase()
      if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1)
    } catch {
      return ""
    }
  } else {
    // CIDR, URL paths, query strings and ports cannot be represented by a
    // hostname-only matcher. Fail closed rather than truncating the pattern.
    if (/[/?#]/.test(s)) return ""
    if ((s.match(/:/g)?.length ?? 0) === 1 && /:\d+$/.test(s)) return ""
  }

  while (s.endsWith(".")) s = s.slice(0, -1)
  if (!s || s === "*" || s.startsWith("*.") && s.slice(2).length === 0) return ""
  return `${exclusion ? "!" : ""}${s}`
}

/**
 * Derive default scope from target URL: "*.{eTLD+1}".
 * Examples:
 *   https://test.com         → "*.test.com"
 *   https://app.test.com     → "*.test.com"
 *   https://x.example.com.tr → "*.example.com.tr" (PSL handles ccTLDs)
 *
 * Falls back to "*.{hostname}" when PSL cannot resolve (e.g. raw IP,
 * localhost, unknown TLD). Callers should review the fallback before testing.
 */
export function deriveScope(targetUrl: string): string {
  const host = new URL(targetUrl).hostname.toLowerCase()
  const parsed = psl.parse(host)
  if ("error" in parsed || !parsed.domain) return `*.${host}`
  return `*.${parsed.domain}`
}

/**
 * Build a host matcher from scope patterns. Positive patterns use OR semantics;
 * any matching !exclusion overrides all inclusions. A wildcard matches its root
 * and all subdomains, preserving CyberStrike's existing runtime behavior.
 * Empty/unsupported input rejects everything.
 */
export function makeMatcher(scopes: readonly string[]): ScopeMatcher {
  const normalized = scopes.map(normalizeScope).filter(Boolean)
  const includes = normalized.filter((s) => !s.startsWith("!"))
  const excludes = normalized.filter((s) => s.startsWith("!")).map((s) => s.slice(1))
  const bases = includes.map((s) => s.startsWith("*.") ? s.slice(2) : s)
  const excludedBases = excludes.map((s) => s.startsWith("*.") ? s.slice(2) : s)
  if (bases.length === 0) return () => false

  const matches = (host: string, patterns: string[]): boolean => {
    const h = host.toLowerCase().replace(/\.+$/, "").replace(/^\[|\]$/g, "")
    return patterns.some((base) => h === base || h.endsWith("." + base))
  }

  return (host: string) => matches(host, bases) && !matches(host, excludedBases)
}
