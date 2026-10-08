import { describe, expect, test } from "bun:test"
import { LearningRouter, type LearningSignal } from "../../src/learning/router"

describe("LearningRouter.route", () => {
  test("explicit skill signals are always routed first", () => {
    const result = LearningRouter.route({
      hook: "during_testing",
      signal: "skill_loaded",
      skill_name: "xss-cross-site-scripting",
    })

    expect(result[0]?.name).toBe("xss-cross-site-scripting")
    expect(result[0]?.score).toBeGreaterThanOrEqual(90)
  })

  test("routing is deterministic for the same signal", () => {
    const signal: LearningSignal = {
      hook: "after_finding",
      signal: "finding_recorded",
      skill_name: "xss-cross-site-scripting",
    }

    expect(LearningRouter.route(signal)).toEqual(LearningRouter.route(signal))
  })
})

describe("LearningRouter concrete-signal gate", () => {
  test("rejects generic raw signal without concrete evidence", () => {
    const result = LearningRouter.route({ hook: "during_testing", signal: "API" })
    expect(result.some((entry) => entry.name === "api-sec")).toBe(false)
  })

  test("accepts explicit concrete raw signal", () => {
    const result = LearningRouter.route({
      hook: "during_testing",
      signal: "API",
      metadata: { concrete_signal: true },
    })
    expect(result.some((entry) => entry.name === "api-sec")).toBe(true)
  })
})
