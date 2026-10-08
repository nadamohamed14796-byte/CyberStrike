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

