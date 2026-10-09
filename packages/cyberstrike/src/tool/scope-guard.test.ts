import { describe, expect, test } from "bun:test"
import { ScopeGuard } from "./scope-guard"

describe("ScopeGuard", () => {
  test("matches an exact hostname and rejects a suffix-confusion hostname", () => {
    expect(ScopeGuard.check("https://app.example.com", ["example.com"]).inScope).toBe(false)
    expect(ScopeGuard.check("example.com", ["example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("example.com.attacker.test", ["example.com"]).inScope).toBe(false)
  })

  test("wildcards match the root and subdomains (shared runtime semantics)", () => {
    expect(ScopeGuard.check("api.example.com", ["*.example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("deep.api.example.com", ["*.example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("example.com", ["*.example.com"]).inScope).toBe(true)
  })

  test("expands comma suffixes, braces, and constrained wildcard TLDs", () => {
    expect(ScopeGuard.check("https://shop.nymhair.uk", ["*.nymhair.co.uk,.com,.uk"]).inScope).toBe(true)
    expect(ScopeGuard.check("https://shop.wc-frisch.ch", ["*.wc-frisch.{de,ch}"]).inScope).toBe(true)
    expect(ScopeGuard.check("https://shop.natturalabs.co.uk", ["*.natturalabs.*"]).inScope).toBe(true)
    expect(ScopeGuard.check("https://natturalabs.attacker.test", ["*.natturalabs.*"]).inScope).toBe(false)
    expect(ScopeGuard.check("https://shop.natturalabs.es:8443", ["*.natturalabs.*"]).inScope).toBe(false)
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
  test("unlisted active testing requires explicit policy permission and ownership", () => {
    const denied = ScopeGuard.evaluate("unlisted.example.com", ["example.com"], {
      intent: "active_test",
      policy: { openScopeUnlistedReports: true },
      ownershipConfirmed: true,
      impactMeetsPolicy: true,
    })
    expect(denied.activeTestingAuthorized).toBe(false)

    const allowed = ScopeGuard.evaluate("unlisted.example.com", ["example.com"], {
      intent: "active_test",
      policy: { activeTestingUnlistedAssets: true },
      ownershipConfirmed: true,
    })
    expect(allowed.activeTestingAuthorized).toBe(true)
    expect(allowed.decision).toBe("ACTIVE_TEST_AUTHORIZED_BY_POLICY")
  })

})
