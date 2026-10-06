export type SignalPhase =
  | "scope"
  | "asset-discovery"
  | "http-validation"
  | "url-discovery"
  | "javascript-discovery"
  | "api-discovery"
  | "parameter-discovery"
  | "technology"
  | "vulnerability-validation"

export type NormalizedSignal = {
  signal: string
  phase: SignalPhase
  priority: number
  aliases: string[]
}

const RULES: Array<{ pattern: RegExp; signal: string; phase: SignalPhase; priority: number }> = [
  { pattern: /\b(subdomain|subdomains|asset|assets|certificate|san|cn)\b/i, signal: "asset discovery", phase: "asset-discovery", priority: 40 },
  { pattern: /\b(live http|http|https|web server|technology)\b/i, signal: "live HTTP", phase: "http-validation", priority: 35 },
  { pattern: /\b(crawl|endpoint|url discovery|historical url|archive)\b/i, signal: "endpoint discovery", phase: "url-discovery", priority: 30 },
  { pattern: /\b(javascript|javascript bundle|js|source map|source-map)\b/i, signal: "JavaScript", phase: "javascript-discovery", priority: 30 },
  { pattern: /\b(graphql|api|api route|swagger|openapi)\b/i, signal: "API", phase: "api-discovery", priority: 20 },
  { pattern: /\b(parameter|hidden parameter|reflected parameter)\b/i, signal: "parameter", phase: "parameter-discovery", priority: 20 },
  { pattern: /\\b(jwt|token)\\b/i, signal: "JWT", phase: "vulnerability-validation", priority: 10 },
  { pattern: /\\b(cors|cross-origin)\\b/i, signal: "CORS", phase: "vulnerability-validation", priority: 10 },
  { pattern: /\\b(xss|reflected)\\b/i, signal: "reflected parameter", phase: "vulnerability-validation", priority: 10 },
  { pattern: /\\b(sqli|sql-like|sql injection)\\b/i, signal: "SQL-like behavior", phase: "vulnerability-validation", priority: 10 },
  { pattern: /\\b(ssrf)\\b/i, signal: "SSRF candidate", phase: "vulnerability-validation", priority: 10 },
  { pattern: /\\b(idor|access control)\\b/i, signal: "access control", phase: "vulnerability-validation", priority: 10 },
  { pattern: /\\b(rce|command injection)\\b/i, signal: "command injection", phase: "vulnerability-validation", priority: 10 },
  { pattern: /\b(open port|service|port)\b/i, signal: "open port", phase: "technology", priority: 30 },
  { pattern: /\b(secret|credential|technology signal|cve|exposure)\b/i, signal: "technology signal", phase: "technology", priority: 25 },
]

export function normalizeSignal(raw: string): NormalizedSignal {
  const value = raw.trim()
  const rule = RULES.find((x) => x.pattern.test(value))
  if (!rule) return { signal: value.toLowerCase(), phase: "technology", priority: 50, aliases: [] }
  return { signal: rule.signal, phase: rule.phase, priority: rule.priority, aliases: [value] }
}

export function phaseDistance(from: SignalPhase, to: SignalPhase) {
  const order: SignalPhase[] = [
    "scope",
    "asset-discovery",
    "http-validation",
    "url-discovery",
    "javascript-discovery",
    "api-discovery",
    "parameter-discovery",
    "technology",
    "vulnerability-validation",
  ]
  return order.indexOf(to) - order.indexOf(from)
}
