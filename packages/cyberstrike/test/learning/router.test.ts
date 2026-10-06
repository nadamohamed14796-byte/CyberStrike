import { describe, expect, test } from "bun:test"
import { LearningRouter } from "../../src/learning/router"

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
    const signal = {
      hook: "after_finding",
      signal: "finding_recorded",
      skill_name: "xss-cross-site-scripting",
    }

    expect(LearningRouter.route(signal)).toEqual(LearningRouter.route(signal))
  })
})
