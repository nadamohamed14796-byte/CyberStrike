import { describe, expect, test } from "bun:test"
import { FalsePositiveIntelligence, falsePositiveFingerprint } from "../src/false-positive-intelligence"

describe("false-positive intelligence", () => {
  test("deduplicates the same context and accumulates evidence", () => {
    const fp = new FalsePositiveIntelligence()
    const first = fp.record({ target: "example.com", signal: "idor-signal", skill: "idor", strategy: "identifier", endpoint: "/api/users", reason: "same-account response", confidence: .8, evidenceIds: ["e1"] })
    const second = fp.record({ target: "example.com", signal: "idor-signal", skill: "idor", strategy: "identifier", endpoint: "/api/users", reason: "same-account response", confidence: .9, evidenceIds: ["e2"] })
    expect(first.fingerprint).toBe(second.fingerprint)
    expect(second.count).toBe(2)
    expect(second.evidenceIds).toEqual(["e1", "e2"])
  })

  test("context changes produce a different fingerprint", () => {
    const a = falsePositiveFingerprint({ target: "example.com", signal: "x", skill: "s", strategy: "a", endpoint: "/one" })
    const b = falsePositiveFingerprint({ target: "example.com", signal: "x", skill: "s", strategy: "b", endpoint: "/one" })
    expect(a).not.toBe(b)
  })
})
