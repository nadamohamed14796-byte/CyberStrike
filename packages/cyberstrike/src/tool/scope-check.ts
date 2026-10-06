import z from "zod"
import { Tool } from "./tool"

export type ScopeMatch = {
  matches: boolean
  reason: string
}

function parseTarget(value: string): { host: string; port: string; protocol?: string; path: string } | undefined {
  const raw = value.trim()
  if (!raw) return undefined
  try {
    const explicitScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
    const url = new URL(explicitScheme ? raw : `https://${raw}`)
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    return {
      host: url.hostname.toLowerCase().replace(/\.$/, ""),
      port: url.port || (url.protocol === "https:" ? "443" : "80"),
      protocol: explicitScheme ? url.protocol : undefined,
      path: url.pathname || "/",
    }
  } catch {
    return undefined
  }
}

function pathMatches(target: string, scope: string): boolean {
  if (scope === "/") return true
  if (target === scope) return true
  return target.startsWith(scope.endsWith("/") ? scope : scope + "/")
}

export namespace ScopeGuard {
  export function check(target: string, scopeItems: string[]): {
    inScope: boolean
    results: Array<{ scope: string; matches: boolean; reason: string }>
  } {
    const normalizedTarget = target.trim().toLowerCase()
    let inScope = false
    const results: Array<{ scope: string; matches: boolean; reason: string }> = []

    for (const scope of scopeItems) {
      const normalizedScope = scope.trim().toLowerCase()
      const match = checkMatch(normalizedTarget, normalizedScope)
      results.push({ scope: normalizedScope, ...match })
      if (match.matches) inScope = true
    }

    return { inScope, results }
  }

  export function hostFromTarget(target: string): string | undefined {
    const parsed = parseTarget(target)
    if (parsed) return parsed.host
    return target.toLowerCase().trim().split("/")[0]?.split(":")[0]
  }
}

export const ScopeCheckTool = Tool.define("scope_check", {
  description:
    "Validate that a target is in scope before testing. Supports exact host match, wildcard domains (*.example.com), URL paths/ports, and IPv4 CIDR ranges. Always check scope before actively testing a new target to avoid scope violations.",
  parameters: z.object({
    target: z.string().describe("The target to check (domain, IP, or URL)"),
    scope_items: z
      .array(z.string())
      .describe("List of in-scope items (domains, wildcards like *.example.com, URL paths/ports, CIDRs like 10.0.0.0/24)"),
  }),
  async execute(params) {
    const target = params.target.toLowerCase().trim()
    const { inScope, results } = ScopeGuard.check(target, params.scope_items)

    const output = [
      `Target: ${target}`,
      `In scope: ${inScope ? "YES" : "NO"}`,
      "",
      "Scope check details:",
      ...results.map((r) => `  ${r.matches ? "[MATCH]" : "[NO]"} ${r.scope} — ${r.reason}`),
    ]

    if (!inScope) {
      output.push("")
      output.push("WARNING: Target is NOT in scope. Do NOT perform active testing on this target.")
    }

    return {
      title: inScope ? `In scope: ${target}` : `OUT OF SCOPE: ${target}`,
      output: output.join("\n"),
      metadata: { target, inScope, results },
    }
  },
})

function checkMatch(target: string, scope: string): ScopeMatch {
  const scopeValue = scope.trim().toLowerCase()

  if (/^\d+\.\d+\.\d+\.\d+\/(?:\d|[12]\d|3[0-2])$/.test(scopeValue)) {
    const targetIP = extractIP(target)
    if (!targetIP) return { matches: false, reason: "target is not an IPv4 address" }
    const inRange = ipInCIDR(targetIP, scopeValue)
    return inRange
      ? { matches: true, reason: `IP ${targetIP} is within CIDR ${scopeValue}` }
      : { matches: false, reason: `IP ${targetIP} is outside CIDR ${scopeValue}` }
  }

  const parsedTarget = parseTarget(target)
  if (!parsedTarget) return { matches: false, reason: "target could not be normalized" }

  const wildcard = scopeValue.startsWith("*.")
  const parsedScope = parseTarget(wildcard ? scopeValue.slice(2) : scopeValue)
  if (!parsedScope) return { matches: false, reason: "scope item could not be normalized" }

  if (parsedScope.protocol && parsedTarget.protocol && parsedTarget.protocol !== parsedScope.protocol) {
    return { matches: false, reason: "scheme mismatch" }
  }

  const hostMatches = wildcard
    ? parsedTarget.host === parsedScope.host || parsedTarget.host.endsWith("." + parsedScope.host)
    : parsedTarget.host === parsedScope.host
  if (!hostMatches) {
    return { matches: false, reason: wildcard ? `does not match wildcard ${scopeValue}` : "host mismatch" }
  }

  if (parsedTarget.port !== parsedScope.port) {
    return { matches: false, reason: `port mismatch (${parsedTarget.port} vs ${parsedScope.port})` }
  }

  if (!pathMatches(parsedTarget.path, parsedScope.path)) {
    return { matches: false, reason: `path ${parsedTarget.path} is outside ${parsedScope.path}` }
  }

  return {
    matches: true,
    reason: wildcard
      ? parsedTarget.host === parsedScope.host
        ? `host matches wildcard root ${scopeValue}`
        : `subdomain matches wildcard ${scopeValue}`
      : "exact host/path/port match",
  }
}

function extractIP(input: string): string | null {
  const match = /(?:^|[^\d])(\d+\.\d+\.\d+\.\d+)(?:$|[^\d])/.exec(input)
  return match ? match[1] : null
}

function ipInCIDR(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split("/")
  const bits = Number(bitsRaw)
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false
  const mask = bits === 0 ? 0 : (~((1 << (32 - bits)) - 1) >>> 0)
  const ipNum = ipToNum(ip)
  const rangeNum = ipToNum(range)
  return (ipNum & mask) === (rangeNum & mask)
}

function ipToNum(ip: string): number {
  const octets = ip.split(".")
  if (octets.length !== 4 || octets.some((x) => !/^\d+$/.test(x) || Number(x) > 255)) return 0
  return octets.reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}
