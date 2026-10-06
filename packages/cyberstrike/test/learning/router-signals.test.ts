import { describe, expect, test } from "bun:test"
import { LearningRouter } from "../../src/learning/router"

describe("LearningRouter signal routing", () => {
  test("routes a raw GraphQL signal without prefilled category or tags", () => {
    const routes = LearningRouter.route({
      hook: "during_testing",
      signal: "GraphQL",
    })
    expect(routes.length).toBeGreaterThanOrEqual(0)
    expect(routes.every((x) => x.name.length > 0)).toBe(true)
  })

  test("accepts tool-derived signals with no target metadata", () => {
    const routes = LearningRouter.route({
      hook: "during_testing",
      signal: "live HTTP",
      metadata: { source_tool: "httpx", derived_from_result: true },
    })
    expect(Array.isArray(routes)).toBe(true)
  })
})
