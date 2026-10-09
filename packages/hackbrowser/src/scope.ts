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

const COMMON_TWO_LABEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "com.au", "net.au", "org.au", "com.br", "com.cn",
  "com.mx", "co.jp", "co.kr", "com.sg", "com.tr", "com.pl", "co.nz", "com.tw",
])

function expandBraces(pattern: string): string[] {
  const match = pattern.match(/\{([^{}]+)\}/)
  if (!match) return [pattern]
  return match[1].split(",").map((item) => pattern.replace(match[0], item.trim())).flatMap(expandBraces)
}

function expandScopePattern(raw: string): string[] {
  const trimmed = raw.trim()
  const exclusion = trimmed.startsWith("!")
  const value = (exclusion ? trimmed.slice(1) : trimmed).trim()
  const parts: string[] = []
  let current = ""
  let depth = 0
  for (const char of value) {
    if (char === "{") depth++
    if (char === "}") depth = Math.max(0, depth - 1)
    if (char === "," && depth === 0) { parts.push(current.trim()); current = "" }
    else current += char
  }
  if (current.trim()) parts.push(current.trim())
  let alternatives = parts.filter(Boolean)
  if (alternatives.length > 1 && alternatives[0].startsWith("*.")) {
    const labels = alternatives[0].slice(2).split(".")
    const suffix2 = labels.slice(-2).join(".")
    const base = "*." + labels.slice(0, COMMON_TWO_LABEL_SUFFIXES.has(suffix2) ? -2 : -1).join(".")
    const isSuffix = (item: string) => {
      const suffix = item.replace(/^\./, "")
      return /^[a-z]{2,}(?:\.[a-z]{2,})?$/i.test(suffix) &&
        (suffix.split(".").length === 1 || COMMON_TWO_LABEL_SUFFIXES.has(suffix.toLowerCase()))
    }
    if (alternatives.slice(1).every(isSuffix)) {
      alternatives = alternatives.map((item, index) => index === 0 ? item : base + "." + item.replace(/^\./, ""))
    }
  }
  return alternatives.flatMap(expandBraces).map((item) => (exclusion ? "!" : "") + item)
}

function wildcardTldMatches(host: string, pattern: string): boolean {
  const base = pattern.slice(2, -2)
  if (!base) return false
  const marker = "." + base + "."
  const index = host.indexOf(marker)
  const isRoot = host.startsWith(base + ".")
  const suffix = isRoot ? host.slice(base.length + 1) : index >= 0 ? host.slice(index + marker.length) : ""
  const prefix = isRoot ? "" : index >= 0 ? host.slice(0, index) : ""
  if (!suffix || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)?$/i.test(suffix)) return false
  const labels = suffix.toLowerCase().split(".")
  if (labels.length === 2 && !COMMON_TWO_LABEL_SUFFIXES.has(labels.join("."))) return false
  return !prefix || prefix.split(".").every((label) => /^[a-z0-9-]+$/i.test(label))
}

/**
 * Build a host matcher from scope patterns. Positive patterns use OR semantics;
 * any matching !exclusion overrides all inclusions. A wildcard matches its root
 * and all subdomains, preserving CyberStrike's existing runtime behavior.
 * Empty/unsupported input rejects everything.
 */
export function makeMatcher(scopes: readonly string[]): ScopeMatcher {
  const normalized = scopes.flatMap(expandScopePattern).map(normalizeScope).filter(Boolean)
  const includes = normalized.filter((s) => !s.startsWith("!"))
  const excludes = normalized.filter((s) => s.startsWith("!")).map((s) => s.slice(1))
  const toPattern = (value: string) => ({
    base: value.startsWith("*.") ? value.slice(2) : value,
    wildcard: value.startsWith("*."),
  })
  const includePatterns = includes.map(toPattern)
  const excludePatterns = excludes.map(toPattern)
  if (includePatterns.length === 0) return () => false

  const matches = (host: string, patterns: ReturnType<typeof toPattern>[]): boolean => {
    const h = host.toLowerCase().replace(/\.+$/, "").replace(/^\[|\]$/g, "")
    return patterns.some(({ base, wildcard }) => {
      if (wildcard && base.endsWith(".*")) return wildcardTldMatches(h, "*." + base)
      return wildcard ? h === base || h.endsWith("." + base) : h === base
    })
  }

  return (host: string) => matches(host, includePatterns) && !matches(host, excludePatterns)
}
