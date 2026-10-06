import { describe, expect, test } from "bun:test"
import { classifications, inverseHypotheses } from "../../src/methodology/business-function-walk"

describe("business function walk inference", () => {
  test("creates evidence-based inverse hypotheses for state-changing role-sensitive functions", () => {
    const hypotheses = inverseHypotheses("POST", "approve", ["admin"], "Approve Order")
    expect(hypotheses.some((x) => x.includes("preconditions"))).toBe(true)
    expect(hypotheses.some((x) => x.includes("lower-privileged"))).toBe(true)
    expect(hypotheses.some((x) => x.includes("terminal transition"))).toBe(true)
  })

  test("classifies transactional workflow signals", () => {
    const result = classifications("POST", "update", "Refund Payment")
    expect(result).toContain("state-transition-abuse")
    expect(result).toContain("pricing/financial")
  })
})
