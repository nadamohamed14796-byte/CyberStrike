import { describe, expect, test } from "bun:test"
import { normalizeEndpoint, normalizeTarget, toolRunKey } from "../../src/tool/run-record"

describe("ToolRunRecord identity", () => {
  test("includes endpoint identity", () => {
    const a = toolRunKey({ toolID: "httpx", target: "https://example.com", endpoint: "/api/users", parameters: { method: "GET" } })
    const b = toolRunKey({ toolID: "httpx", target: "https://example.com", endpoint: "/api/admin", parameters: { method: "GET" } })
    expect(a).not.toBe(b)
  })

  test("same normalized identity produces the same key", () => {
    const a = toolRunKey({ toolID: "httpx", target: "HTTPS://EXAMPLE.COM:443/", endpoint: "GET /api/x", parameters: { b: 2, a: 1 } })
    const b = toolRunKey({ toolID: "HTTPX", target: "https://example.com", endpoint: "get /api/x", parameters: { a: 1, b: 2 } })
    expect(a).toBe(b)
  })

  test("different parameters cannot collapse", () => {
    const a = toolRunKey({ toolID: "ffuf", target: "https://example.com", endpoint: "/FUZZ", parameters: { wordlist: "small.txt" } })
    const b = toolRunKey({ toolID: "ffuf", target: "https://example.com", endpoint: "/FUZZ", parameters: { wordlist: "large.txt" } })
    expect(a).not.toBe(b)
  })

  test("normalizes HTTP default ports", () => {
    expect(normalizeTarget("HTTPS://EXAMPLE.COM:443")).toBe(normalizeTarget("https://example.com"))
    expect(normalizeEndpoint("HTTPS://EXAMPLE.COM:443/api")).toBe("https://example.com/api")
  })
})
