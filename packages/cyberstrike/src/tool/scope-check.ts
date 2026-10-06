import z from "zod"
import { Tool } from "./tool"

export type ScopeMatch = {
  matches: boolean
  reason: string
}

export namespace ScopeGuard {
  export function check(target: string, scopeItems: string[]): {
    inScope: boolean
    results: Array<{ scope: string; matches: boolean; reason: string }>
  } {
    const normalizedTarget = target.toLowerCase().trim()
    let inScope = false
    const results: Array<{ scope: string; matches: boolean; reason: string }> = []

    for (const scope of scopeItems) {
      const normalizedScope = scope.toLowerCase().trim()
      const match = checkMatch(normalizedTarget, normalizedScope)
      results.push({ scope: normalizedScope, ...match })
      if (match.matches) inScope = true
    }

    return { inScope, results }
  }

  export function hostFromTarget(target: string): string | undefined {
    try {
      const value = target.match(/^https?:\/\/[^/]+/i)?.[0]
      return value ? new URL(value).hostname.toLowerCase() : target.toLowerCase().trim().split("/")[0]?.split(":")[0]
    } catch {
      return undefined
    }
  }
}

export const ScopeCheckTool = Tool.define("scope_check", {
  description:
    "Validate that a target is in scope before testing. Supports exact domain match, wildcard domains (*.example.com), and CIDR ranges (10.0.0.0/24). Always check scope before actively testing a new target to avoid scope violations.",
  parameters: z.object({
    target: z.string().describe("The target to check (domain, IP, or URL)"),
    scope_items: z
      .array(z.string())
      .describe("List of in-scope items (domains, wildcards like *.example.com, CIDRs like 10.0.0.0/24)"),
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

function hostPort(value: string): { host: string; port: string } | undefined {
  const raw = value.trim()
  try {
    const url = /^https?:\/\//i.test(raw) ? new URL(raw) : new URL(`https://${raw}`)
    const port = url.port || (url.protocol === "https:" ? "443" : "80")
    return { host: url.hostname.toLowerCase().replace(/\.$/, ""), port }
  } catch {
    return undefined
  }
}

function checkMatch(target: string, scope: string): ScopeMatch {
  const targetHost = hostPort(target)
  const scopeValue = scope.trim().toLowerCase()

  if (/^\d+\.\d+\.\d+\.\d+\/(?:\d|[12]\d|3[0-2])$/.test(scopeValue)) {
    const targetIP = extractIP(target)
    if (!targetIP) return { matches: false, reason: "target is not an IP address" }
    const inRange = ipInCIDR(targetIP, scopeValue)
    return inRange
      ? { matches: true, reason: `IP ${targetIP} is within CIDR ${scopeValue}` }
      : { matches: false, reason: `IP ${targetIP} is outside CIDR ${scopeValue}` }
  }

  if (!targetHost) return { matches: false, reason: "target host could not be normalized" }

  const wildcard = scopeValue.startsWith("*.")
  const scopeHost = hostPort(wildcard ? scopeValue.slice(2) : scopeValue)
  if (!scopeHost) return { matches: false, reason: "scope item could not be normalized" }

  if (wildcard) {
    const hostMatches = targetHost.host !== scopeHost.host && targetHost.host.endsWith("." + scopeHost.host)
    const portMatches = targetHost.port === scopeHost.port
    return hostMatches && portMatches
      ? { matches: true, reason: `subdomain matches wildcard ${scopeValue}` }
      : { matches: false, reason: `does not match wildcard ${scopeValue}` }
  }

  const hostMatches =
    targetHost.host === scopeHost.host ||
    targetHost.host.endsWith("." + scopeHost.host)
  const portMatches = targetHost.port === scopeHost.port
  if (hostMatches && portMatches) {
    return targetHost.host === scopeHost.host
      ? { matches: true, reason: "exact host match" }
      : { matches: true, reason: `subdomain of ${scopeHost.host}` }
  }

  return { matches: false, reason: "no match" }
}

function extractIP(input: string): string | null {
  const match = /(\d+\.\d+\.\d+\.\d+)/.exec(input)
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
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}
