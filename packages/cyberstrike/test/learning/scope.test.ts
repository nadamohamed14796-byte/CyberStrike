import { describe, expect, test } from "bun:test"
import { verdict } from "../../src/learning/scope"

describe("scope matching", () => {
  test("exact host, wildcard subdomain, and apex rules", () => {
    expect(verdict(["example.com"], [], "example.com")).toBe("in")
    expect(verdict(["example.com"], [], "api.example.com")).toBe("unknown")
    expect(verdict(["*.example.com"], [], "api.example.com")).toBe("in")
    expect(verdict(["*.example.com"], [], "example.com")).toBe("unknown")
    expect(verdict(["example.com (subdomains: yes)"], [], "api.example.com")).toBe("in")
  })

  test("out-of-scope always wins", () => {
    expect(verdict(["*.example.com"], ["status.example.com"], "status.example.com")).toBe("out")
    expect(verdict(["*.example.com"], ["status.example.com"], "app.example.com")).toBe("in")
  })

  test("TLD wildcard and CIDR ranges", () => {
    expect(verdict(["*.corp"], [], "intranet.corp")).toBe("in")
    expect(verdict(["10.0.0.0/24"], [], "10.0.0.77")).toBe("in")
    expect(verdict(["10.0.0.0/24"], [], "10.0.1.1")).toBe("unknown")
  })

  test("URL with path prefix", () => {
    expect(verdict(["https://app.example.com/api/*"], [], "app.example.com", "/api/users")).toBe("in")
    expect(verdict(["https://app.example.com/api/*"], [], "app.example.com", "/admin")).toBe("unknown")
  })

  test("company name is unknown until a domain is added", () => {
    expect(verdict(["Acme Corp"], [], "acme.com")).toBe("unknown")
  })
})
