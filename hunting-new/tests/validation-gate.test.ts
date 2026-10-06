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
      targetConfirmed: true,
      baselineObserved: true,
      behaviorChanged: true,
      reproducible: true,
      rootCauseSupported: true,
      impactObserved: true,
      authorizationContextVerified: true,
      evidence: [
        { id: "req-1", kind: "request", summary: "baseline request", observed: true },
        { id: "res-1", kind: "response", summary: "baseline response", observed: true, independent: true },
        { id: "res-2", kind: "response", summary: "changed response", observed: true, independent: true },
        { id: "fn-1", kind: "js", summary: "function correlation", observed: true },
      ],
    })
    expect(result.decision).toBe("eligible")
  })
})
