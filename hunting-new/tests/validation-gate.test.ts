import { describe, expect, test } from "bun:test"
import { validateHypothesis } from "../src/validation-gate"

describe("validation gate", () => {
  test("blocks inference-only claims", () => {
    const result = validateHypothesis({
      hypothesisId: "hyp-1",
      inScope: true,
      attemptsExecuted: 1,
      distinctVariants: 1,
      expectedImpact: "high",
      evidence: [{ id: "inf-1", kind: "inference", summary: "looks suspicious" }],
    })
    expect(result.decision).toBe("blocked")
  })

  test("accepts supported in-scope validation", () => {
    const result = validateHypothesis({
      hypothesisId: "hyp-2",
      inScope: true,
      attemptsExecuted: 20,
      distinctVariants: 2,
      expectedImpact: "high",
      evidence: [{
        id: "res-1",
        kind: "response",
        summary: "independent response difference",
        independent: true,
      }],
    })
    expect(result.decision).toBe("eligible")
  })
})
