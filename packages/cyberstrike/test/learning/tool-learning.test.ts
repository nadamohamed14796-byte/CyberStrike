import { expect, test } from "bun:test"
import { ToolLearning } from "../../src/learning/tool-learning"

test("scores tool feedback consistently regardless of identifier case or whitespace", () => {
  const signal = "learning-test:ToolScoreCaseNormalizationMarker"
  ToolLearning.observe({
    tool: "  HttpX  ",
    signal,
    outcome: "useful",
    evidence: "Deterministic regression fixture",
  })

  expect(ToolLearning.score("HttpX", signal)).toBe(100)
  expect(ToolLearning.score("HTTPX", signal)).toBe(100)
  expect(ToolLearning.score("httpx", signal)).toBe(100)
})
