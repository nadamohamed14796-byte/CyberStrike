import { describe, expect, test } from "bun:test"
import { ScopeGuard } from "../../src/tool/scope-check"

describe("ScopeGuard.check", () => {
  test("matches exact hosts only", () => {
    expect(ScopeGuard.check("example.com", ["example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("api.example.com", ["example.com"]).inScope).toBe(false)
    expect(ScopeGuard.check("other.com", ["example.com"]).inScope).toBe(false)
  })

  test("matches wildcard subdomains and preserves root-domain semantics", () => {
    expect(ScopeGuard.check("api.example.com", ["*.example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("deep.api.example.com", ["*.example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("example.com", ["*.example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("api.example.com.evil.test", ["*.example.com"]).inScope).toBe(false)
  })

  test("matches IPv4 CIDR ranges and rejects invalid addresses/prefix lengths", () => {
    expect(ScopeGuard.check("10.0.0.15", ["10.0.0.0/24"]).inScope).toBe(true)
    expect(ScopeGuard.check("10.0.1.15", ["10.0.0.0/24"]).inScope).toBe(false)
    expect(ScopeGuard.check("999.0.0.15", ["999.0.0.0/24"]).inScope).toBe(false)
    expect(ScopeGuard.check("10.0.0.15", ["10.0.0.0/33"]).inScope).toBe(false)
  })

  test("matches URL paths and default ports", () => {
    expect(ScopeGuard.check("https://example.com/api/users?id=1", ["https://example.com/api"]).inScope).toBe(true)
    expect(ScopeGuard.check("https://example.com/apiary", ["https://example.com/api"]).inScope).toBe(false)
    expect(ScopeGuard.check("https://example.com/api/users", ["https://example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("http://example.com:8080/api", ["example.com"]).inScope).toBe(false)
    expect(ScopeGuard.check("https://example.com:8443/api", ["example.com:8443"]).inScope).toBe(true)
    expect(ScopeGuard.check("https://example.com:8443/api", ["https://example.com:443"]).inScope).toBe(false)
  })

  test("honors explicit schemes", () => {
    expect(ScopeGuard.check("https://example.com/api", ["http://example.com"]).inScope).toBe(false)
    expect(ScopeGuard.check("http://example.com/api", ["https://example.com"]).inScope).toBe(false)
  })

  test("rejects malformed targets", () => {
    expect(ScopeGuard.check("not a valid target %%", ["example.com"]).inScope).toBe(false)
  })

  test("returns per-scope reasons", () => {
    const result = ScopeGuard.check("api.example.com", ["example.com", "*.example.com"])
    expect(result.inScope).toBe(true)
    expect(result.results).toHaveLength(2)
    expect(result.results[0]?.matches).toBe(false)
    expect(result.results[1]?.matches).toBe(true)
  })
})
