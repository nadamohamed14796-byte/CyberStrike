import { minimatch } from "minimatch"
export type ScopeRule = { value: string; path?: string; protocols?: string[]; ports?: number[]; exclude?: boolean }
export type ScopeDecision = { allowed: boolean; normalized: string; reason: string }
function normalize(input: string) {
  const value = input.trim()
  if (!value) return ""
  try {
    const url = value.includes("://") ? new URL(value) : new URL("https://" + value)
    return url.hostname.toLowerCase().replace(/\.$/, "") + url.pathname.replace(/\/$/, "")
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")
  }
}
function hostMatch(host: string, rule: string) {
  const r = normalize(rule).split("/")[0]
  if (!r) return false
  if (r.startsWith("*.")) return host === r.slice(2) || host.endsWith("." + r.slice(2))
  if (r.endsWith(".*")) return host.startsWith(r.slice(0, -2) + ".") || host === r.slice(0, -2)
  return minimatch(host, r, { nocase: true, dot: true })
}
export function checkScope(target: string, rules: ScopeRule[]): ScopeDecision {
  const normalized = normalize(target)
  if (!normalized) return { allowed: false, normalized, reason: "empty-target" }
  let matched = false, excluded = false
  for (const rule of rules) {
    const value = normalize(rule.value)
    const host = normalized.split("/")[0]
    const pathPart = "/" + normalized.split("/").slice(1).join("/")
    if (!hostMatch(host, value)) continue
    if (rule.path && !minimatch(pathPart || "/", rule.path, { nocase: true })) continue
    matched = true
    if (rule.exclude) excluded = true
  }
  if (!matched) return { allowed: false, normalized, reason: "out-of-scope" }
  if (excluded) return { allowed: false, normalized, reason: "explicit-exclusion" }
  return { allowed: true, normalized, reason: "in-scope" }
}