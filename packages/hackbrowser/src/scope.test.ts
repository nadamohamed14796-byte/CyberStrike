import { describe, expect, test } from "bun:test"
import { makeMatcher, normalizeScope } from "./scope"

describe("hackbrowser host scope", () => {
  test("exact hosts do not silently become wildcard scopes", () => {
    const match = makeMatcher(["example.com"])
    expect(match("example.com")).toBe(true)
    expect(match("api.example.com")).toBe(false)
    expect(match("example.com.attacker.test")).toBe(false)
  })

  test("wildcards include root and subdomains to preserve existing behavior", () => {
    const match = makeMatcher(["*.example.com"])
    expect(match("example.com")).toBe(true)
    expect(match("api.example.com")).toBe(true)
    expect(match("deep.api.example.com")).toBe(true)
  })

  test("explicit exclusions override matching includes", () => {
    const match = makeMatcher(["*.example.com", "!admin.example.com"])
    expect(match("api.example.com")).toBe(true)
    expect(match("admin.example.com")).toBe(false)
    expect(match("deep.admin.example.com")).toBe(true)
  })

  test("supports suffix shorthand, brace alternatives and wildcard TLDs", () => {
    const suffixes = makeMatcher(["*.nymhair.co.uk,.com,.uk"])
    expect(suffixes("shop.nymhair.uk")).toBe(true)
    expect(suffixes("shop.nymhair.com")).toBe(true)
    const braces = makeMatcher(["*.wc-frisch.{de,ch}"])
    expect(braces("shop.wc-frisch.ch")).toBe(true)
    const anyTld = makeMatcher(["*.natturalabs.*"])
    expect(anyTld("shop.natturalabs.es")).toBe(true)
    expect(anyTld("natturalabs.attacker.test")).toBe(false)
  })

  test("rejects URL path and port constraints that a hostname-only matcher cannot enforce", () => {
    expect(normalizeScope("https://example.com/api")).toBe("")
    expect(normalizeScope("https://example.com:8443")).toBe("")
    expect(makeMatcher(["https://example.com/api"])("example.com")).toBe(false)
  })

  test("empty or unsupported scope fails closed", () => {
    expect(makeMatcher([])("example.com")).toBe(false)
    expect(makeMatcher(["https://example.com/api"])("example.com")).toBe(false)
  })
})
