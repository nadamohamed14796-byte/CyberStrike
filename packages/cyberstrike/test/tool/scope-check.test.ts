import { describe, expect, test } from "bun:test"
import { ScopeGuard } from "../../src/tool/scope-check"

describe("ScopeGuard.check", () => {
  test("matches exact domains", () => {
    expect(ScopeGuard.check("example.com", ["example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("other.com", ["example.com"]).inScope).toBe(false)
  })

  test("matches wildcard subdomains but not lookalikes", () => {
    expect(ScopeGuard.check("api.example.com", ["*.example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("example.com", ["*.example.com"]).inScope).toBe(true)
    expect(ScopeGuard.check("api.example.com.evil.test", ["*.example.com"]).inScope).toBe(false)
  })

  test("matches IPv4 CIDR ranges and rejects invalid prefix lengths", () => {
    expect(ScopeGuard.check("10.0.0.15", ["10.0.0.0/24"]).inScope).toBe(true)
    expect(ScopeGuard.check("10.0.1.15", ["10.0.0.0/24"]).inScope).toBe(false)
    expect(ScopeGuard.check("10.0.0.15", ["10.0.0.0/33"]).inScope).toBe(false)
  })

  test("returns per-scope reasons", () => {
    const result = ScopeGuard.check("api.example.com", ["example.com", "*.example.com"])
    expect(result.inScope).toBe(true)
    expect(result.results).toHaveLength(2)
    expect(result.results[1]?.matches).toBe(true)
  })
})
