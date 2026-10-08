export type ScopeMatch = {
  matches: boolean
  reason: string
}

type ParsedTarget = { host: string; port: string; protocol?: string; path: string }

function parseTarget(value: string): ParsedTarget | undefined {
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
  if (ipNum === undefined || rangeNum === undefined) return false
  return (ipNum & mask) === (rangeNum & mask)
}

function ipToNum(ip: string): number | undefined {
  const octets = ip.split(".")
  if (octets.length !== 4 || octets.some((x) => !/^\d+$/.test(x) || Number(x) > 255)) return undefined
  return octets.reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
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
