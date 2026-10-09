import { describe, expect, test } from "bun:test"
import { ScopeGuard } from "./scope-guard"

describe("ScopeGuard", () => {
  test("matches an exact hostname and rejects a suffix-confusion hostname", () => {
    expect(ScopeGuard.check("https://app.example.com", ["example.com"]).inScope).toBe(false)
    expect(ScopeGuard.check("example.com", ["example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("example.com.attacker.test", ["example.com"]).inScope).toBe(false)
  })

  test("wildcards match subdomains but not the wildcard root", () => {
    expect(ScopeGuard.check("api.example.com", ["*.example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("deep.api.example.com", ["*.example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("example.com", ["*.example.com"]).inScope).toBe(false)
  })

  test("respects URL scheme, port, and path boundaries", () => {
    expect(ScopeGuard.check("https://example.com:8443/api/v1", ["https://example.com:8443/api"]).inScope).toBe(true)
    expect(ScopeGuard.check("https://example.com:8443/apix", ["https://example.com:8443/api"]).inScope).toBe(false)
    expect(ScopeGuard.check("http://example.com:8443/api", ["https://example.com:8443/api"]).inScope).toBe(false)
    expect(ScopeGuard.check("https://example.com/api", ["https://example.com:8443/api"]).inScope).toBe(false)
  })

  test("any matching explicit exclusion overrides an inclusion", () => {
    const result = ScopeGuard.check("admin.example.com", ["*.example.com", "!admin.example.com"])
    expect(result.inScope).toBe(false)
    expect(result.excluded).toBe(true)
  })

  test("matches IPv4 CIDR and rejects invalid CIDR notation", () => {
    expect(ScopeGuard.check("192.0.2.12", ["192.0.2.0/24"]).inScope).toBe(true)
    expect(ScopeGuard.check("192.0.3.12", ["192.0.2.0/24"]).inScope).toBe(false)
    expect(ScopeGuard.check("192.0.2.12", ["192.0.2.0/33"]).inScope).toBe(false)
  })

  test("matches IPv6 literals and CIDR ranges", () => {
    expect(ScopeGuard.check("https://[2001:db8::5]/", ["2001:db8::/32"]).inScope).toBe(true)
    expect(ScopeGuard.check("2001:db9::5", ["2001:db8::/32"]).inScope).toBe(false)
    expect(ScopeGuard.check("2001:db8::5", ["2001:db8::5"]).inScope).toBe(true)
  })

  test("open-scope report wording does not authorize active testing", () => {
    const active = ScopeGuard.evaluate("unlisted.example.com", ["example.com"], {
      intent: "active_test",
      policy: { openScopeUnlistedReports: true },
      ownershipConfirmed: true,
      impactMeetsPolicy: true,
    })
    expect(active.activeTestingAuthorized).toBe(false)
    expect(active.reportEligible).toBe(true)
    expect(active.decision).toBe("OUT_OF_SCOPE")

    const report = ScopeGuard.evaluate("unlisted.example.com", ["example.com"], {
      intent: "report",
      policy: { openScopeUnlistedReports: true },
      ownershipConfirmed: true,
      impactMeetsPolicy: true,
    })
    expect(report.activeTestingAuthorized).toBe(false)
    expect(report.reportEligible).toBe(true)
    expect(report.decision).toBe("REPORT_ELIGIBLE_ONLY")
  })

  test("requires review and denies authorization when program policy is unavailable", () => {
    const result = ScopeGuard.evaluate("example.com", ["example.com"], { policyLoaded: false })
    expect(result.activeTestingAuthorized).toBe(false)
    expect(result.reportEligible).toBe(false)
    expect(result.decision).toBe("REQUIRES_REVIEW")
  })
})
