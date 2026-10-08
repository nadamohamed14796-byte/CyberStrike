import { beforeAll, describe, expect, spyOn, test } from "bun:test"
import { LearningRouter, type LearningSignal } from "../../src/learning/router"
import { SkillIndex } from "../../src/skill/index-engine"

describe("LearningRouter.route", () => {
  beforeAll(async () => {
    await SkillIndex.ensureBuilt()
  })

  test("explicit skill signals are always routed first", () => {
    const explicit = {
      name: "explicit-test-skill",
      description: "Explicit test skill",
      tags: [],
      tech_stack: [],
      cwe_ids: [],
      chains_with: [],
      prerequisites: [],
      severity_boost: {},
    }
    const competing = {
      name: "competing-skill",
      description: "Competing skill",
      tags: [],
      tech_stack: [],
      cwe_ids: [],
      chains_with: [],
      prerequisites: [],
      severity_boost: {},
    }

    const getSpy = spyOn(SkillIndex, "get").mockImplementation((name) =>
      name === explicit.name ? explicit : undefined,
    )
    const tagSpy = spyOn(SkillIndex, "byTag").mockImplementation(() => [competing])
    const searchSpy = spyOn(SkillIndex, "search").mockImplementation(() => [])

    try {
      const result = LearningRouter.route({
        hook: "during_testing",
        signal: "skill_loaded",
        skill_name: explicit.name,
        tags: Array.from({ length: 80 }, (_, index) => "tag-" + index),
      })

      expect(result[0]?.name).toBe(explicit.name)
      expect(result[0]?.score).toBeLessThan(result[1]?.score ?? Number.POSITIVE_INFINITY)
      expect(tagSpy).toHaveBeenCalledTimes(80)
      expect(searchSpy).toHaveBeenCalled()
    } finally {
      getSpy.mockRestore()
      tagSpy.mockRestore()
      searchSpy.mockRestore()
    }
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
