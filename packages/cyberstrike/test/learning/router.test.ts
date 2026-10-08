import { beforeAll, describe, expect, spyOn, test } from "bun:test"
import { LearningRouter, type LearningSignal } from "../../src/learning/router"
import { SkillIndex } from "../../src/skill/index-engine"

describe("LearningRouter.route", () => {
  beforeAll(async () => {
    await SkillIndex.ensureBuilt()
  })

  test("explicit skill signals are always routed first", () => {
    const result = LearningRouter.route({
      hook: "during_testing",
      signal: "skill_loaded",
      skill_name: "xss-cross-site-scripting",
    })

    expect(result[0]?.name).toBe("xss-cross-site-scripting")
    expect(result[0]?.score).toBeGreaterThanOrEqual(90)
  })

  test("does not route stale skill names that are absent from the index", () => {
    const result = LearningRouter.route({
      hook: "during_testing",
      signal: "skill_loaded",
      skill_name: "__missing_skill_for_regression__",
    })

    expect(result.some((entry) => entry.name === "__missing_skill_for_regression__")).toBe(false)
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
    const apiEntry = {
      name: "api-sec",
      description: "API security router",
      tags: [],
      tech_stack: [],
      cwe_ids: [],
      chains_with: [],
      prerequisites: [],
      severity_boost: {},
    }
    const searchSpy = spyOn(SkillIndex, "search").mockImplementation((query) =>
      query.toLowerCase() === "api" ? [apiEntry] : [],
    )

    try {
      const result = LearningRouter.route({
        hook: "during_testing",
        signal: "API",
        metadata: { concrete_signal: true },
      })
      expect(result.some((entry) => entry.name === "api-sec")).toBe(true)
      expect(searchSpy).toHaveBeenCalledWith("API", 12)
    } finally {
      searchSpy.mockRestore()
    }
  })
})
