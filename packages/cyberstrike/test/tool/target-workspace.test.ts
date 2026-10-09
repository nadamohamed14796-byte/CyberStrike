import { describe, expect, test } from "bun:test"
import { TargetWorkspace } from "../../src/tool/target-workspace"

describe("TargetWorkspace scope routing", () => {
  test("routes wildcard subdomains into the wildcard scope workspace", () => {
    expect(TargetWorkspace.scopeForTarget("https://api.example.com/v1", ["*.example.com"])).toBe("*.example.com")
  })

  test("prefers an exact host over a matching wildcard", () => {
    expect(TargetWorkspace.scopeForTarget("https://api.example.com", ["*.example.com", "api.example.com"])).toBe(
      "api.example.com",
    )
  })

  test("prefers the most specific matching path scope", () => {
    expect(TargetWorkspace.scopeForTarget("https://example.com/api/users", ["example.com", "example.com/api"])).toBe(
      "example.com/api",
    )
  })

  test("does not route an out-of-scope host into a registered scope", () => {
    expect(TargetWorkspace.scopeForTarget("https://outside.test", ["*.example.com"])).toBeUndefined()
  })
})
