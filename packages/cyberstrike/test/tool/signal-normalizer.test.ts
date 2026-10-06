import { describe, expect, test } from "bun:test"
import { normalizeSignal, phaseDistance } from "../../src/tool/signal-normalizer"

describe("signal normalization", () => {
  test("normalizes equivalent SQL signals", () => {
    expect(normalizeSignal("SQLi").signal).toBe("SQL-like behavior")
    expect(normalizeSignal("sql injection").signal).toBe("SQL-like behavior")
  })

  test("preserves vulnerability-specific phases", () => {
    expect(normalizeSignal("JWT").phase).toBe("vulnerability-validation")
    expect(normalizeSignal("GraphQL").phase).toBe("api-discovery")
    expect(normalizeSignal("JavaScript bundle").phase).toBe("javascript-discovery")
  })

  test("computes phase direction", () => {
    expect(phaseDistance("http-validation", "api-discovery")).toBeGreaterThan(0)
    expect(phaseDistance("api-discovery", "vulnerability-validation")).toBeGreaterThan(0)
  })
})
