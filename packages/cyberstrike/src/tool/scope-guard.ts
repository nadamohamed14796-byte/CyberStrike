export type ScopeMatch = {
  matches: boolean
  reason: string
  excluded?: boolean
}

export type ScopeDecision = {
  inScope: boolean
  excluded: boolean
  results: Array<{ scope: string; matches: boolean; reason: string; excluded?: boolean }>
}

export type ScopePolicy = {
  /** The program explicitly permits reports for owned assets not listed in its asset inventory. */
  openScopeUnlistedReports?: boolean
  /** Explicit permission to actively test assets not matched by listed scope. Defaults to false. */
  activeTestingUnlistedAssets?: boolean
}

export type ScopePolicyDecision = ScopeDecision & {
  intent: "active_test" | "report"
  activeTestingAuthorized: boolean
  reportEligible: boolean
  decision: "IN_SCOPE" | "OUT_OF_SCOPE" | "EXCLUDED" | "REPORT_ELIGIBLE_ONLY" | "REQUIRES_REVIEW"
  reason: string
}

type ParsedTarget = { host: string; port: string; protocol?: string; path: string }

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host
}

function parseTarget(value: string): ParsedTarget | undefined {
  const raw = value.trim()
  if (!raw) return undefined
  try {
    const explicitScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
    const bareIPv6 = !explicitScheme && (raw.match(/:/g)?.length ?? 0) >= 2 && !raw.startsWith("[") && !raw.includes("/") && !raw.includes("?") && !raw.includes("#")
    const urlInput = explicitScheme ? raw : `https://${bareIPv6 ? `[${raw}]` : raw}`
    const url = new URL(urlInput)
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    return {
      host: stripBrackets(url.hostname.toLowerCase()).replace(/\.$/, ""),
      port: url.port || (url.protocol === "https:" ? "443" : "80"),
      protocol: explicitScheme ? url.protocol : undefined,
      path: url.pathname || "/",
    }
  } catch {
    return undefined
  }
}

function pathMatches(target: string, scope: string): boolean {
  if (scope === "/" || scope === "") return true
  if (target === scope) return true
  return target.startsWith(scope.endsWith("/") ? scope : scope + "/")
}

function ipv4ToBigInt(ip: string): bigint | undefined {
  const parts = ip.split(".")
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return undefined
  return parts.reduce((value, part) => (value << 8n) | BigInt(Number(part)), 0n)
}

function ipv6ToBigInt(input: string): bigint | undefined {
  let ip = stripBrackets(input.toLowerCase())
  if (!ip.includes(":")) return undefined
  if (ip.includes("%")) return undefined // zone identifiers are intentionally not accepted
  if (ip.includes(".")) {
    const lastColon = ip.lastIndexOf(":")
    if (lastColon < 0) return undefined
    const v4 = ipv4ToBigInt(ip.slice(lastColon + 1))
    if (v4 === undefined) return undefined
    ip = ip.slice(0, lastColon + 1) + Number((v4 >> 16n) & 0xffffn).toString(16) + ":" + Number(v4 & 0xffffn).toString(16)
  }
  const halves = ip.split("::")
  if (halves.length > 2) return undefined
  const left = halves[0] ? halves[0].split(":") : []
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : []
  if (left.concat(right).some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return undefined
  let groups: string[]
  if (halves.length === 1) {
    if (left.length !== 8) return undefined
    groups = left
  } else {
    const missing = 8 - left.length - right.length
    if (missing < 1) return undefined
    groups = [...left, ...Array(missing).fill("0"), ...right]
  }
  return groups.reduce((value, group) => (value << 16n) | BigInt(parseInt(group, 16)), 0n)
}

function parseCIDR(scope: string): { family: 4 | 6; address: bigint; bits: number; width: number } | undefined {
  const slash = scope.lastIndexOf("/")
  if (slash < 1) return undefined
  const addressText = scope.slice(0, slash)
  const bitsText = scope.slice(slash + 1)
  if (!/^\d+$/.test(bitsText)) return undefined
  if (addressText.includes(":")) {
    const address = ipv6ToBigInt(addressText)
    const bits = Number(bitsText)
    if (address === undefined || !Number.isInteger(bits) || bits < 0 || bits > 128) return undefined
    return { family: 6, address, bits, width: 128 }
  }
  const address = ipv4ToBigInt(addressText)
  const bits = Number(bitsText)
  if (address === undefined || !Number.isInteger(bits) || bits < 0 || bits > 32) return undefined
  return { family: 4, address, bits, width: 32 }
}

function ipInCIDR(target: string, cidr: NonNullable<ReturnType<typeof parseCIDR>>): boolean {
  const isV6 = target.includes(":")
  if ((cidr.family === 6) !== isV6) return false
  const address = isV6 ? ipv6ToBigInt(target) : ipv4ToBigInt(target)
  if (address === undefined) return false
  const shift = BigInt(cidr.width - cidr.bits)
  return (address >> shift) === (cidr.address >> shift)
}

function checkMatch(target: string, scope: string): ScopeMatch {
  const scopeValue = scope.trim().toLowerCase()
  if (!scopeValue) return { matches: false, reason: "empty scope item" }

  const cidr = parseCIDR(scopeValue)
  if (cidr) {
    const parsedTarget = parseTarget(target)
    if (!parsedTarget) return { matches: false, reason: "target could not be normalized" }
    const inRange = ipInCIDR(parsedTarget.host, cidr)
    return inRange
      ? { matches: true, reason: `IP ${parsedTarget.host} is within CIDR ${scopeValue}` }
      : { matches: false, reason: `target is outside CIDR ${scopeValue}` }
  }

  // Do not silently interpret malformed CIDR-looking entries as hostnames.
  if (scopeValue.includes("/") && /:\d+\//.test(scopeValue) === false && /\/\d+$/.test(scopeValue)) {
    const candidate = scopeValue.slice(0, scopeValue.lastIndexOf("/"))
    if (candidate.includes(":") || /^\d+(?:\.\d+){3}$/.test(candidate)) {
      return { matches: false, reason: "invalid CIDR notation" }
    }
  }

  const wildcard = scopeValue.startsWith("*.")
  const parsedScope = parseTarget(wildcard ? scopeValue.slice(2) : scopeValue)
  const parsedTarget = parseTarget(target)
  if (!parsedTarget) return { matches: false, reason: "target could not be normalized" }
  if (!parsedScope) return { matches: false, reason: "scope item could not be normalized" }

  if (parsedScope.protocol && parsedTarget.protocol && parsedTarget.protocol !== parsedScope.protocol) {
    return { matches: false, reason: "scheme mismatch" }
  }

  // Standard wildcard semantics: *.example.com matches subdomains, not example.com itself.
  const hostMatches = wildcard
    ? parsedTarget.host !== parsedScope.host && parsedTarget.host.endsWith("." + parsedScope.host)
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
    reason: wildcard ? `subdomain matches wildcard ${scopeValue}` : "exact host/path/port match",
  }
}

function evaluatePatterns(target: string, scopeItems: string[]): ScopeDecision {
  const results: ScopeDecision["results"] = []
  let included = false
  let excluded = false
  for (const rawScope of scopeItems) {
    const trimmed = rawScope.trim()
    const isExclusion = trimmed.startsWith("!")
    const scope = (isExclusion ? trimmed.slice(1) : trimmed).trim().toLowerCase()
    const match = checkMatch(target, scope)
    const result = {
      scope: rawScope.trim(),
      matches: match.matches,
      reason: isExclusion && match.matches ? `explicit exclusion: ${match.reason}` : match.reason,
      ...(isExclusion ? { excluded: match.matches } : {}),
    }
    results.push(result)
    if (match.matches) {
      if (isExclusion) excluded = true
      else included = true
    }
  }
  return { inScope: included && !excluded, excluded, results }
}

export namespace ScopeGuard {
  /** Evaluate string patterns. Positive patterns use OR semantics; any matching !exclusion wins. */
  export function check(target: string, scopeItems: string[]): ScopeDecision {
    return evaluatePatterns(target.trim(), Array.isArray(scopeItems) ? scopeItems : [])
  }

  /**
   * Separate active-testing authorization from report eligibility. "Open scope"
   * wording about accepting reports for owned/unlisted assets never authorizes
   * active testing unless the program explicitly says so.
   */
  export function evaluate(
    target: string,
    scopeItems: string[],
    options: {
      intent?: "active_test" | "report"
      policy?: ScopePolicy
      ownershipConfirmed?: boolean
      impactMeetsPolicy?: boolean
      policyLoaded?: boolean
    } = {},
  ): ScopePolicyDecision {
    const base = check(target, scopeItems)
    const intent = options.intent ?? "active_test"
    const policy = options.policy ?? {}
    const explicitlyMatched = base.inScope
    const openReport = policy.openScopeUnlistedReports === true &&
      options.ownershipConfirmed === true &&
      options.impactMeetsPolicy === true
    const activeTestingAuthorized = explicitlyMatched ||
      (policy.activeTestingUnlistedAssets === true && options.ownershipConfirmed === true)
    const reportEligible = explicitlyMatched || openReport
    let decision: ScopePolicyDecision["decision"] = explicitlyMatched ? "IN_SCOPE" : "OUT_OF_SCOPE"
    let reason = explicitlyMatched
      ? "target matches an included scope pattern and no exclusion matched"
      : "target does not match an included scope pattern"

    if (base.excluded) {
      decision = "EXCLUDED"
      reason = "a matching explicit exclusion overrides inclusion"
    } else if (options.policyLoaded === false) {
      decision = "REQUIRES_REVIEW"
      reason = "program policy is missing or could not be verified; active testing is not authorized"
    } else if (!explicitlyMatched && intent === "report" && openReport) {
      decision = "REPORT_ELIGIBLE_ONLY"
      reason = "unlisted owned asset meets the report policy; this does not authorize active testing"
    } else if (!explicitlyMatched && intent === "active_test" && !activeTestingAuthorized) {
      reason = "no explicit active-testing authorization for this unlisted asset"
    } else if (!explicitlyMatched && intent === "report" && !reportEligible) {
      decision = options.ownershipConfirmed === undefined ? "REQUIRES_REVIEW" : "OUT_OF_SCOPE"
      reason = options.ownershipConfirmed === undefined
        ? "ownership and report eligibility have not been verified"
        : "unlisted asset does not meet the program's report-eligibility policy"
    }
    return { ...base, intent, activeTestingAuthorized: !base.excluded && activeTestingAuthorized && options.policyLoaded !== false,
      reportEligible: !base.excluded && reportEligible && options.policyLoaded !== false, decision, reason }
  }

  export function hostFromTarget(target: string): string | undefined {
    const parsed = parseTarget(target)
    if (parsed) return parsed.host
    return target.toLowerCase().trim().split("/")[0]?.split(":")[0]
  }
}
